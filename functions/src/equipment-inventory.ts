import { FieldValue, Timestamp, type Firestore, type Transaction } from 'firebase-admin/firestore';
import { AdminEquipmentError } from './admin-equipment.js';
import { peakOccupancy, reservationInterval } from './reservation-capacity.js';
import {
  eventFromData,
  eventNotificationSnapshot,
  logisticsNotificationId,
} from './event-integrations.js';

function reviewRequired(): never {
  throw new AdminEquipmentError(
    'reservation-review-required',
    'failed-precondition',
    'No se pudo registrar la reducción completa. Revise las reservaciones y la configuración de Sistemas.',
  );
}

/** Reads precede every write; inventory, conflict markers and durable mail jobs commit together. */
export async function reconcileInventoryReduction(
  firestore: Firestore,
  transaction: Transaction,
  equipmentId: string,
  quantity: number,
  now: Date,
  otherWrites: number,
): Promise<void> {
  const control = firestore.doc('controlReservasEquipo/' + equipmentId);
  const controlSnapshot = await transaction.get(control);
  const snapshot = await transaction.get(
    firestore
      .collection('reservasEquipo')
      .where('equipoId', '==', equipmentId)
      .where('estado', 'in', ['confirmada', 'requiere_revision'])
      .where('bloqueoFin', '>', Timestamp.fromDate(now))
      .orderBy('bloqueoFin')
      .orderBy('bloqueoInicio')
      .limit(401),
  );
  if (snapshot.size > 400) reviewRequired();
  const intervals = snapshot.docs.map((document) => {
    try {
      return reservationInterval(document.data());
    } catch {
      return reviewRequired();
    }
  });
  const affected = snapshot.docs.filter((_, index) => {
    const interval = intervals[index]!;
    return (
      peakOccupancy(intervals, Math.max(now.getTime(), interval.start), interval.end) > quantity
    );
  });
  const previousVersion = controlSnapshot.data()?.['version'];
  const version = (Number.isInteger(previousVersion) ? (previousVersion as number) : 0) + 1;
  const jobs: { id: string; data: Record<string, unknown> }[] = [];
  if (affected.length > 0) {
    const configuration = await transaction.get(firestore.doc('configuracion/logisticaEquipos'));
    const systemsId = configuration.data()?.['coordinacionSistemasId'];
    if (typeof systemsId !== 'string' || !systemsId || systemsId.includes('/')) reviewRequired();
    const systems = await transaction.get(firestore.doc('coordinaciones/' + systemsId));
    const emails = systems.data()?.['correos'];
    if (
      !systems.exists ||
      systems.data()?.['activo'] !== true ||
      !Array.isArray(emails) ||
      emails.length === 0 ||
      emails.length > 10 ||
      emails.some(
        (email: unknown) => typeof email !== 'string' || !/^[^@\s]+@[^@\s]+$/.test(email.trim()),
      )
    )
      reviewRequired();
    const recipients = [
      ...new Set((emails as string[]).map((email) => email.trim().toLowerCase())),
    ];
    if (otherWrites + 1 + affected.length * (1 + recipients.length) > 450) reviewRequired();
    const eventIds = [
      ...new Set(affected.map((document) => document.data()['eventoId'] as unknown)),
    ];
    if (eventIds.some((id) => typeof id !== 'string' || !id || id.includes('/'))) reviewRequired();
    const events = await transaction.getAll(
      ...eventIds.map((id) => firestore.doc('eventos/' + (id as string))),
    );
    const byId = new Map(
      events.map((event) => [event.id, eventFromData(event.ref, event.data() ?? {})]),
    );
    for (const document of affected) {
      const reservation = document.data();
      const event = byId.get(reservation['eventoId'] as string);
      if (!event) reviewRequired();
      const photo = reservation['fotografia'] as Record<string, unknown> | undefined;
      const equipmentName =
        typeof photo?.['equipoNombre'] === 'string' ? photo['equipoNombre'] : 'Equipo';
      for (const email of recipients) {
        const id = logisticsNotificationId(
          event.eventId,
          equipmentId,
          'inventario_reducido',
          version,
          email,
        );
        jobs.push({
          id,
          data: {
            eventoId: event.eventId,
            revision: version,
            tipo: 'logistica',
            destinatarioCorreo: email,
            destinatarioTipo: 'sistemas',
            coordinacionId: systemsId,
            equipoId: equipmentId,
            motivoLogistico: 'inventario_reducido',
            claveIdempotencia: id,
            estado: 'pendiente',
            intentos: 0,
            ultimoErrorCodigo: null,
            proximoIntento: Timestamp.fromDate(now),
            datosEvento: eventNotificationSnapshot(event, equipmentName),
            fechaCreacion: FieldValue.serverTimestamp(),
            fechaActualizacion: FieldValue.serverTimestamp(),
            fechaEnvio: null,
            fechaFinalizacion: null,
            fechaExpiracion: null,
            procesadorId: null,
            bloqueoHasta: null,
            ultimoIntento: null,
          },
        });
      }
    }
  }
  for (const document of affected) {
    const data = document.data();
    const reasons = Array.isArray(data['motivosRevision']) ? data['motivosRevision'] : [];
    transaction.update(document.ref, {
      estado: 'requiere_revision',
      motivosRevision: [...new Set([...reasons, 'inventario_reducido'])],
      versionesAvisoLogistico: {
        ...((data['versionesAvisoLogistico'] as Record<string, unknown>) ?? {}),
        inventario_reducido: version,
      },
      fechaActualizacion: FieldValue.serverTimestamp(),
    });
  }
  for (const job of jobs)
    transaction.create(firestore.doc('notificacionesEventos/' + job.id), job.data);
  transaction.set(
    control,
    { equipoId: equipmentId, version, fechaActualizacion: FieldValue.serverTimestamp() },
    { merge: true },
  );
}
