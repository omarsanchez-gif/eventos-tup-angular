import { randomUUID } from 'node:crypto';
import {
  FieldValue,
  Timestamp,
  type DocumentData,
  type DocumentReference,
  type Firestore,
} from 'firebase-admin/firestore';
import type {
  CanonicalEvent,
  EventCalendarClient,
  EventIntegrationResult,
  EventIntegrationsLogger,
} from './event-integrations.js';
import { calendarEventIdentity } from './calendar-identity.js';

const leaseDuration = 10 * 60_000;

function fingerprint(event: CanonicalEvent): string {
  return JSON.stringify([
    event.name,
    event.dateStart,
    event.timeStart,
    event.dateEnd,
    event.timeEnd,
    event.responsible,
    event.campusName,
    event.campusAddress,
    event.observations,
    event.cancelled,
    event.revision,
  ]);
}

export function createCalendarSynchronizer(input: {
  firestore: Firestore;
  calendar: EventCalendarClient;
  logger: EventIntegrationsLogger;
  clock: { now(): Date };
  parse(reference: DocumentReference<DocumentData>, data: DocumentData): CanonicalEvent | null;
}): (eventId: string) => Promise<EventIntegrationResult['calendarStatus']> {
  const { firestore, calendar, logger, clock, parse } = input;
  return async (eventId) => {
    const reference = firestore.doc('eventos/' + eventId);
    const control = firestore.doc('controlIntegracionesEvento/' + eventId);
    const owner = randomUUID();
    const acquired = await firestore.runTransaction(async (transaction) => {
      const [event, lease] = await transaction.getAll(reference, control);
      if (!event?.exists) throw new Error('event-not-found');
      const until = lease?.data()?.['bloqueoHasta'];
      if (until instanceof Timestamp && until.toMillis() > clock.now().getTime()) return false;
      transaction.set(control, {
        procesadorId: owner,
        bloqueoHasta: Timestamp.fromMillis(clock.now().getTime() + leaseDuration),
        fechaActualizacion: FieldValue.serverTimestamp(),
      });
      return true;
    });
    if (!acquired) return 'pendiente';
    try {
      for (let pass = 0; pass < 5; pass += 1) {
        const [snapshot, lease] = await firestore.getAll(reference, control);
        if (lease?.data()?.['procesadorId'] !== owner) return 'pendiente';
        const until = lease.data()?.['bloqueoHasta'];
        if (!(until instanceof Timestamp) || until.toMillis() - clock.now().getTime() < 180_000)
          return 'pendiente';
        const event = snapshot?.exists ? parse(reference, snapshot.data() ?? {}) : null;
        if (!event) throw new Error('event-not-found');
        let status: EventIntegrationResult['calendarStatus'];
        let calendarId = event.calendarEventId;
        try {
          if (event.cancelled) {
            await calendar.remove(calendarId ?? calendarEventIdentity(event.eventId));
            calendarId = null;
            status = 'retirado';
          } else {
            calendarId = await calendar.upsert(event, calendarId);
            status = 'sincronizado';
          }
        } catch (error) {
          status = 'error';
          logger.warn('Fallo sanitizado al reconciliar Calendar.', {
            eventId,
            cause: error instanceof Error ? error.name : 'unknown',
          });
        }
        const outcome = await firestore.runTransaction(async (transaction) => {
          const [currentSnapshot, lock] = await transaction.getAll(reference, control);
          const deadline = lock?.data()?.['bloqueoHasta'];
          if (
            lock?.data()?.['procesadorId'] !== owner ||
            !(deadline instanceof Timestamp) ||
            deadline.toMillis() <= clock.now().getTime()
          )
            return 'lost';
          const current = currentSnapshot?.exists
            ? parse(reference, currentSnapshot.data() ?? {})
            : null;
          if (!current) throw new Error('event-not-found');
          const unchanged = fingerprint(current) === fingerprint(event);
          transaction.update(reference, {
            ...(status !== 'error' ? { calendarEventId: calendarId } : {}),
            calendarEstado: unchanged ? status : 'pendiente',
            fechaActualizacion: FieldValue.serverTimestamp(),
          });
          if (unchanged || pass === 4)
            transaction.update(control, {
              procesadorId: null,
              bloqueoHasta: null,
              fechaActualizacion: FieldValue.serverTimestamp(),
            });
          return unchanged ? 'done' : 'again';
        });
        if (outcome === 'done') return status;
        if (outcome === 'lost') return 'pendiente';
      }
      return 'pendiente';
    } finally {
      // A timed-out worker must never release the lease belonging to its successor.
      await firestore.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(control);
        if (snapshot.data()?.['procesadorId'] !== owner) return;
        transaction.update(control, {
          procesadorId: null,
          bloqueoHasta: null,
          fechaActualizacion: FieldValue.serverTimestamp(),
        });
      });
    }
  };
}
