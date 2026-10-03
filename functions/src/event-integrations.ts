import { createHash, randomUUID } from 'node:crypto';

import {
  FieldValue,
  Timestamp,
  type DocumentData,
  type DocumentReference,
  type Firestore,
} from 'firebase-admin/firestore';

import {
  buildEventEmail,
  describeEventChanges,
  type LogisticsReason,
  type NotificationEquipment,
  type NotificationEventSnapshot,
} from './event-email-template.js';

export interface CalendarEventState {
  readonly eventId: string;
  readonly name: string;
  readonly dateStart: string;
  readonly timeStart: string;
  readonly dateEnd: string;
  readonly timeEnd: string;
  readonly responsible: string;
  readonly campusName: string;
  readonly campusAddress: string | null;
  readonly observations: string;
}

export interface EventCalendarClient {
  upsert(event: CalendarEventState, existingId: string | null): Promise<string>;
  remove(existingId: string): Promise<void>;
}

export interface EventMailMessage {
  readonly to: string;
  readonly recipientType: 'creador' | 'coordinacion' | 'sistemas';
  readonly coordinationId: string | null;
  readonly subject: string;
  readonly text: string;
  readonly html: string;
}

export interface EventMailer {
  send(message: EventMailMessage): Promise<void>;
}

export class MailDeliveryError extends Error {
  constructor(
    readonly code: string,
    readonly permanent: boolean,
    message = 'No fue posible enviar el correo.',
  ) {
    super(message);
    this.name = 'MailDeliveryError';
  }
}

export interface EventIntegrationsLogger {
  warn(message: string, context?: Readonly<Record<string, unknown>>): void;
  error(message: string, context?: Readonly<Record<string, unknown>>): void;
}

export interface EventIntegrationResult {
  readonly calendarStatus: 'pendiente' | 'sincronizado' | 'error' | 'retirado';
  readonly notificationStatus: 'pendiente' | 'completas' | 'parciales' | 'no_aplica';
}

export interface EventIntegrationsService {
  reconcile(eventId: string): Promise<EventIntegrationResult>;
  processDue(limit?: number): Promise<{ readonly processed: number }>;
}

interface CanonicalEvent {
  readonly reference: DocumentReference<DocumentData>;
  readonly eventId: string;
  readonly name: string;
  readonly dateStart: string;
  readonly timeStart: string;
  readonly dateEnd: string;
  readonly timeEnd: string;
  readonly responsible: string;
  readonly creatorEmail: string;
  readonly observations: string;
  readonly campusName: string;
  readonly campusAddress: string | null;
  readonly coordinationIds: readonly string[];
  readonly coordinationNames: readonly string[];
  readonly equipment: readonly NotificationEquipment[];
  readonly revision: number;
  readonly cancelled: boolean;
  readonly calendarEventId: string | null;
}

interface Recipient {
  readonly email: string;
  readonly type: 'creador' | 'coordinacion';
  readonly coordinationId: string | null;
}

const retryDelays = [5 * 60_000, 30 * 60_000, 2 * 60 * 60_000] as const;
const leaseMilliseconds = 10 * 60_000;
const retentionMilliseconds = 90 * 24 * 60 * 60_000;

function eventFromData(
  reference: DocumentReference<DocumentData>,
  data: DocumentData,
): CanonicalEvent | null {
  const campusHistory =
    data['campusHistorico'] && typeof data['campusHistorico'] === 'object'
      ? (data['campusHistorico'] as Record<string, unknown>)
      : {};
  if (
    typeof data['nombreEvento'] !== 'string' ||
    typeof data['fechaInicio'] !== 'string' ||
    typeof data['horaInicio'] !== 'string' ||
    typeof data['fechaFin'] !== 'string' ||
    typeof data['horaFin'] !== 'string' ||
    typeof data['responsable'] !== 'string' ||
    typeof data['creadoPorCorreo'] !== 'string'
  ) {
    return null;
  }
  return {
    reference,
    eventId: reference.id,
    name: data['nombreEvento'],
    dateStart: data['fechaInicio'],
    timeStart: data['horaInicio'],
    dateEnd: data['fechaFin'],
    timeEnd: data['horaFin'],
    responsible: data['responsable'],
    creatorEmail: data['creadoPorCorreo'].trim().toLowerCase(),
    observations: typeof data['observaciones'] === 'string' ? data['observaciones'] : '',
    campusName: typeof campusHistory['nombre'] === 'string' ? campusHistory['nombre'] : '',
    campusAddress:
      typeof campusHistory['direccion'] === 'string' ? campusHistory['direccion'] : null,
    coordinationIds: Array.isArray(data['coordinacionIds'])
      ? data['coordinacionIds'].filter(
          (value: unknown): value is string => typeof value === 'string',
        )
      : [],
    coordinationNames: Array.isArray(data['coordinacionesInvolucradas'])
      ? data['coordinacionesInvolucradas'].flatMap((value: unknown) => {
          if (!value || typeof value !== 'object') return [];
          const name = (value as Record<string, unknown>)['nombre'];
          return typeof name === 'string' && name.trim() ? [name.trim()] : [];
        })
      : [],
    equipment: Array.isArray(data['equiposSolicitados'])
      ? data['equiposSolicitados'].flatMap((value: unknown) => {
          if (!value || typeof value !== 'object') return [];
          const item = value as Record<string, unknown>;
          const name = item['nombre'];
          const quantity = item['cantidad'];
          return typeof name === 'string' &&
            name.trim() &&
            Number.isInteger(quantity) &&
            (quantity as number) > 0
            ? [{ nombre: name.trim(), cantidad: quantity as number }]
            : [];
        })
      : [],
    revision: Number.isInteger(data['revisionNotificacion'])
      ? (data['revisionNotificacion'] as number)
      : 0,
    cancelled: data['estatus'] === 'cancelado',
    calendarEventId:
      typeof data['calendarEventId'] === 'string' && data['calendarEventId']
        ? data['calendarEventId']
        : null,
  };
}

function notificationId(
  eventId: string,
  revision: number,
  type: string,
  recipient: string,
): string {
  return createHash('sha256').update(`${eventId}|${revision}|${type}|${recipient}`).digest('hex');
}

function logisticsNotificationId(
  eventId: string,
  equipmentId: string,
  reason: LogisticsReason,
  version: number,
  recipient: string,
): string {
  return createHash('sha256')
    .update(`${eventId}|${equipmentId}|${reason}|${version}|logistica|${recipient}`)
    .digest('hex');
}

function notificationType(event: CanonicalEvent): 'creacion' | 'actualizacion' | 'cancelacion' {
  if (event.cancelled) return 'cancelacion';
  return event.revision <= 1 ? 'creacion' : 'actualizacion';
}

function eventNotificationSnapshot(
  event: CanonicalEvent,
  equipmentName: string | null = null,
  changes: readonly string[] = [],
): NotificationEventSnapshot {
  return {
    nombreEvento: event.name,
    fechaInicio: event.dateStart,
    horaInicio: event.timeStart,
    fechaFin: event.dateEnd,
    horaFin: event.timeEnd,
    responsable: event.responsible,
    campusNombre: event.campusName,
    campusDireccion: event.campusAddress,
    coordinacionesNombres: event.coordinationNames,
    equipos: event.equipment,
    observaciones: event.observations,
    cambios: changes,
    equipoNombre: equipmentName,
  };
}

function notificationContent(data: DocumentData): EventMailMessage {
  const event =
    data['datosEvento'] && typeof data['datosEvento'] === 'object'
      ? (data['datosEvento'] as Record<string, unknown>)
      : {};
  const type = data['tipo'];
  const logisticsReason = data['motivoLogistico'];
  const content = buildEventEmail({
    type:
      type === 'actualizacion' ||
      type === 'retiro_coordinacion' ||
      type === 'cancelacion' ||
      type === 'logistica'
        ? type
        : 'creacion',
    logisticsReason:
      logisticsReason === 'cobertura_sistemas' ||
      logisticsReason === 'inventario_reducido' ||
      logisticsReason === 'cambio_incompatible' ||
      logisticsReason === 'demora' ||
      logisticsReason === 'cancelacion_post_salida'
        ? logisticsReason
        : null,
    event,
  });
  return {
    to: typeof data['destinatarioCorreo'] === 'string' ? data['destinatarioCorreo'] : '',
    recipientType:
      data['destinatarioTipo'] === 'coordinacion' || data['destinatarioTipo'] === 'sistemas'
        ? data['destinatarioTipo']
        : 'creador',
    coordinationId:
      typeof data['coordinacionId'] === 'string' && data['coordinacionId'].trim()
        ? data['coordinacionId'].trim()
        : null,
    ...content,
  };
}

function cleanErrorCode(error: unknown): { code: string; permanent: boolean } {
  if (error instanceof MailDeliveryError) {
    return { code: error.code.slice(0, 80), permanent: error.permanent };
  }
  return { code: 'smtp-temporary', permanent: false };
}

export function createEventIntegrationsService(input: {
  readonly firestore: Firestore;
  readonly calendar: EventCalendarClient;
  readonly mailer: EventMailer;
  readonly logger: EventIntegrationsLogger;
  readonly clock?: { now(): Date };
}): EventIntegrationsService {
  const { firestore, calendar, mailer, logger } = input;
  const clock = input.clock ?? { now: () => new Date() };
  const events = firestore.collection('eventos');
  const coordinations = firestore.collection('coordinaciones');
  const notifications = firestore.collection('notificacionesEventos');
  const reservations = firestore.collection('reservasEquipo');
  const controls = firestore.collection('controlReservasEquipo');
  const logisticsConfiguration = firestore.collection('configuracion').doc('logisticaEquipos');

  async function canonicalEvent(eventId: string): Promise<CanonicalEvent> {
    const snapshot = await events.doc(eventId).get();
    const event = snapshot.exists ? eventFromData(snapshot.ref, snapshot.data() ?? {}) : null;
    if (!event) throw new Error('event-not-found');
    return event;
  }

  async function currentRecipients(event: CanonicalEvent): Promise<readonly Recipient[]> {
    const coordinationSnapshots =
      event.coordinationIds.length > 0
        ? await firestore.getAll(...event.coordinationIds.map((id) => coordinations.doc(id)))
        : [];
    const recipients = new Map<string, Recipient>();
    if (event.creatorEmail) {
      recipients.set(event.creatorEmail, {
        email: event.creatorEmail,
        type: 'creador',
        coordinationId: null,
      });
    }
    coordinationSnapshots.forEach((snapshot) => {
      if (!snapshot.exists) return;
      const emails = snapshot.data()?.['correos'];
      if (!Array.isArray(emails)) return;
      emails.forEach((value: unknown) => {
        if (typeof value !== 'string') return;
        const email = value.trim().toLowerCase();
        if (!email) return;
        const existing = recipients.get(email);
        if (existing?.type === 'coordinacion') return;
        recipients.set(email, {
          email,
          type: 'coordinacion',
          coordinationId: snapshot.id,
        });
      });
    });
    return [...recipients.values()];
  }

  async function prepareNotifications(event: CanonicalEvent): Promise<void> {
    const current = await currentRecipients(event);
    const currentEmails = new Set(current.map((recipient) => recipient.email));
    const prior = await notifications.where('eventoId', '==', event.eventId).get();
    const type = notificationType(event);
    const recipients = new Map(current.map((recipient) => [recipient.email, recipient] as const));
    const previousSnapshot = prior.docs
      .map((document) => document.data())
      .filter(
        (data) =>
          data['tipo'] !== 'logistica' &&
          Number.isInteger(data['revision']) &&
          (data['revision'] as number) < event.revision,
      )
      .sort((a, b) => (b['revision'] as number) - (a['revision'] as number))[0]?.['datosEvento'];
    const currentSnapshot = eventNotificationSnapshot(event);
    const changes =
      !event.cancelled && event.revision > 1
        ? describeEventChanges(previousSnapshot, currentSnapshot)
        : [];
    const notificationSnapshot = eventNotificationSnapshot(event, null, changes);

    if (event.cancelled) {
      prior.docs.forEach((snapshot) => {
        const data = snapshot.data();
        if (data['tipo'] === 'logistica') return;
        const email = data['destinatarioCorreo'];
        if (typeof email !== 'string' || recipients.has(email)) return;
        recipients.set(email, {
          email,
          type: data['destinatarioTipo'] === 'creador' ? 'creador' : 'coordinacion',
          coordinationId:
            typeof data['coordinacionId'] === 'string' ? data['coordinacionId'] : null,
        });
      });
    }

    const removed = new Map<string, Recipient>();
    if (!event.cancelled && event.revision > 1) {
      const removedCoordinationIds = new Set<string>();
      prior.docs.forEach((snapshot) => {
        const data = snapshot.data();
        if (data['tipo'] === 'logistica') return;
        const email = data['destinatarioCorreo'];
        const coordinationId = data['coordinacionId'];
        if (typeof coordinationId === 'string' && !event.coordinationIds.includes(coordinationId)) {
          removedCoordinationIds.add(coordinationId);
          if (typeof email === 'string' && !currentEmails.has(email)) {
            removed.set(email, { email, type: 'coordinacion', coordinationId });
          }
        }
      });
      const removedCoordinationSnapshots =
        removedCoordinationIds.size > 0
          ? await firestore.getAll(
              ...[...removedCoordinationIds].map((id) => coordinations.doc(id)),
            )
          : [];
      removedCoordinationSnapshots.forEach((snapshot) => {
        const emails = snapshot.data()?.['correos'];
        if (!Array.isArray(emails)) return;
        emails.forEach((value: unknown) => {
          if (typeof value !== 'string') return;
          const email = value.trim().toLowerCase();
          if (!email || currentEmails.has(email)) return;
          removed.set(email, {
            email,
            type: 'coordinacion',
            coordinationId: snapshot.id,
          });
        });
      });
    }

    const jobs = [
      ...[...recipients.values()].map((recipient) => ({ recipient, type })),
      ...[...removed.values()].map((recipient) => ({
        recipient,
        type: 'retiro_coordinacion' as const,
      })),
    ];
    const now = clock.now();
    for (const job of jobs) {
      const id = notificationId(event.eventId, event.revision, job.type, job.recipient.email);
      const reference = notifications.doc(id);
      await firestore.runTransaction(async (transaction) => {
        if ((await transaction.get(reference)).exists) return;
        transaction.create(reference, {
          eventoId: event.eventId,
          revision: event.revision,
          tipo: job.type,
          destinatarioCorreo: job.recipient.email,
          destinatarioTipo: job.recipient.type,
          coordinacionId: job.recipient.coordinationId,
          equipoId: null,
          motivoLogistico: null,
          claveIdempotencia: id,
          estado: 'pendiente',
          intentos: 0,
          ultimoErrorCodigo: null,
          proximoIntento: Timestamp.fromDate(now),
          datosEvento: notificationSnapshot,
          fechaCreacion: FieldValue.serverTimestamp(),
          fechaActualizacion: FieldValue.serverTimestamp(),
          fechaEnvio: null,
          fechaFinalizacion: null,
          fechaExpiracion: null,
          procesadorId: null,
          bloqueoHasta: null,
          ultimoIntento: null,
        });
      });
    }
  }

  async function prepareLogisticsNotifications(event: CanonicalEvent): Promise<void> {
    const reservationSnapshot = await reservations.where('eventoId', '==', event.eventId).get();
    if (reservationSnapshot.empty) return;

    const configurationSnapshot = await logisticsConfiguration.get();
    const systemsCoordinationId = configurationSnapshot.data()?.['coordinacionSistemasId'];
    if (typeof systemsCoordinationId !== 'string' || !systemsCoordinationId) {
      logger.warn('No se prepararon avisos logísticos: falta la coordinación canónica.', {
        eventId: event.eventId,
      });
      return;
    }
    const systemsCoordination = await coordinations.doc(systemsCoordinationId).get();
    const rawEmails = systemsCoordination.data()?.['correos'];
    const systemEmails = Array.isArray(rawEmails)
      ? [
          ...new Set(
            rawEmails
              .filter((value: unknown): value is string => typeof value === 'string')
              .map((value) => value.trim().toLowerCase())
              .filter(Boolean),
          ),
        ]
      : [];
    if (systemEmails.length === 0) {
      logger.warn('No se prepararon avisos logísticos: Sistemas no tiene destinatarios.', {
        eventId: event.eventId,
        coordinationId: systemsCoordinationId,
      });
      return;
    }

    const equipmentIds = [
      ...new Set(
        reservationSnapshot.docs
          .map((snapshot) => snapshot.data()['equipoId'])
          .filter((value: unknown): value is string => typeof value === 'string'),
      ),
    ];
    const controlSnapshots =
      equipmentIds.length > 0
        ? await firestore.getAll(...equipmentIds.map((equipmentId) => controls.doc(equipmentId)))
        : [];
    const controlByEquipment = new Map(
      controlSnapshots.map((snapshot) => [snapshot.id, snapshot.data()?.['version']] as const),
    );
    const now = clock.now();

    for (const snapshot of reservationSnapshot.docs) {
      const reservation = snapshot.data();
      const equipmentId = reservation['equipoId'];
      if (typeof equipmentId !== 'string') continue;
      const versionValue = controlByEquipment.get(equipmentId);
      const fallbackVersion = Number.isInteger(versionValue) ? (versionValue as number) : 0;
      const storedVersions =
        reservation['versionesAvisoLogistico'] &&
        typeof reservation['versionesAvisoLogistico'] === 'object'
          ? (reservation['versionesAvisoLogistico'] as Record<string, unknown>)
          : {};
      const reasons = new Map<LogisticsReason, number>();
      const addReason = (reason: LogisticsReason) => {
        const stored = storedVersions[reason];
        const version =
          Number.isInteger(stored) && (stored as number) > 0 ? (stored as number) : fallbackVersion;
        if (version > 0) reasons.set(reason, version);
      };
      const review = Array.isArray(reservation['motivosRevision'])
        ? reservation['motivosRevision']
        : [];
      if (review.includes('cobertura_sistemas')) addReason('cobertura_sistemas');
      if (review.includes('inventario_reducido')) addReason('inventario_reducido');
      if (review.includes('coordinacion_sistemas')) addReason('cambio_incompatible');
      if (reservation['demoraReportada'] === true) addReason('demora');
      const departure =
        reservation['salidaProgramada'] instanceof Timestamp
          ? reservation['salidaProgramada'].toDate()
          : null;
      if (
        event.cancelled &&
        reservation['esTraslado'] === true &&
        departure &&
        departure.getTime() <= now.getTime()
      ) {
        addReason('cancelacion_post_salida');
      }
      if (reasons.size === 0) continue;

      const photo =
        reservation['fotografia'] && typeof reservation['fotografia'] === 'object'
          ? (reservation['fotografia'] as Record<string, unknown>)
          : {};
      const equipmentName =
        typeof photo['equipoNombre'] === 'string' ? photo['equipoNombre'] : 'Equipo';
      for (const [reason, version] of reasons) {
        for (const email of systemEmails) {
          const id = logisticsNotificationId(event.eventId, equipmentId, reason, version, email);
          const reference = notifications.doc(id);
          await firestore.runTransaction(async (transaction) => {
            if ((await transaction.get(reference)).exists) return;
            transaction.create(reference, {
              eventoId: event.eventId,
              revision: version,
              tipo: 'logistica',
              destinatarioCorreo: email,
              destinatarioTipo: 'sistemas',
              coordinacionId: systemsCoordinationId,
              equipoId: equipmentId,
              motivoLogistico: reason,
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
            });
          });
        }
      }
    }
  }

  async function refreshNotificationState(eventId: string, revision: number): Promise<void> {
    const snapshot = await notifications
      .where('eventoId', '==', eventId)
      .where('revision', '==', revision)
      .get();
    const functionalDocuments = snapshot.docs.filter(
      (document) => document.data()['tipo'] !== 'logistica',
    );
    let state: EventIntegrationResult['notificationStatus'] = 'no_aplica';
    if (functionalDocuments.length > 0) {
      const hasPermanentFailure = functionalDocuments.some((document) => {
        const data = document.data();
        return data['estado'] === 'fallido' && data['proximoIntento'] === null;
      });
      const allSent = functionalDocuments.every(
        (document) => document.data()['estado'] === 'enviado',
      );
      state = hasPermanentFailure ? 'parciales' : allSent ? 'completas' : 'pendiente';
    }
    await events.doc(eventId).update({
      notificacionesEstado: state,
      fechaActualizacion: FieldValue.serverTimestamp(),
    });
  }

  async function claim(reference: DocumentReference<DocumentData>, processorId: string) {
    const now = clock.now();
    return firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists) return null;
      const data = snapshot.data() ?? {};
      if (data['estado'] === 'enviado') return null;
      if (data['estado'] === 'fallido' && data['proximoIntento'] === null) return null;
      const nextAttempt =
        data['proximoIntento'] instanceof Timestamp ? data['proximoIntento'].toDate() : null;
      const lockedUntil =
        data['bloqueoHasta'] instanceof Timestamp ? data['bloqueoHasta'].toDate() : null;
      if (nextAttempt && nextAttempt.getTime() > now.getTime()) return null;
      if (data['estado'] === 'procesando' && lockedUntil && lockedUntil.getTime() > now.getTime()) {
        return null;
      }
      transaction.update(reference, {
        estado: 'procesando',
        procesadorId: processorId,
        bloqueoHasta: Timestamp.fromMillis(now.getTime() + leaseMilliseconds),
        ultimoIntento: Timestamp.fromDate(now),
        fechaActualizacion: FieldValue.serverTimestamp(),
      });
      return data;
    });
  }

  async function finishJob(
    reference: DocumentReference<DocumentData>,
    processorId: string,
    result: { readonly sent: true } | { readonly sent: false; readonly error: unknown },
  ): Promise<void> {
    const now = clock.now();
    const outcome = await firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists) return null;
      const data = snapshot.data() ?? {};
      if (data['estado'] !== 'procesando' || data['procesadorId'] !== processorId) return null;
      const attempts = (Number.isInteger(data['intentos']) ? (data['intentos'] as number) : 0) + 1;
      if (result.sent) {
        transaction.update(reference, {
          estado: 'enviado',
          intentos: attempts,
          ultimoErrorCodigo: null,
          proximoIntento: null,
          fechaEnvio: Timestamp.fromDate(now),
          fechaFinalizacion: Timestamp.fromDate(now),
          fechaExpiracion: Timestamp.fromMillis(now.getTime() + retentionMilliseconds),
          procesadorId: null,
          bloqueoHasta: null,
          fechaActualizacion: FieldValue.serverTimestamp(),
        });
      } else {
        const failure = cleanErrorCode(result.error);
        const retryDelay = retryDelays[attempts - 1];
        const terminal = failure.permanent || retryDelay === undefined;
        transaction.update(reference, {
          estado: 'fallido',
          intentos: attempts,
          ultimoErrorCodigo: failure.code,
          proximoIntento: terminal ? null : Timestamp.fromMillis(now.getTime() + retryDelay),
          fechaFinalizacion: terminal ? Timestamp.fromDate(now) : null,
          fechaExpiracion: terminal
            ? Timestamp.fromMillis(now.getTime() + retentionMilliseconds)
            : null,
          procesadorId: null,
          bloqueoHasta: null,
          fechaActualizacion: FieldValue.serverTimestamp(),
        });
      }
      return {
        eventId: typeof data['eventoId'] === 'string' ? data['eventoId'] : null,
        revision: Number.isInteger(data['revision']) ? (data['revision'] as number) : null,
        functional: data['tipo'] !== 'logistica',
      };
    });
    if (outcome?.functional && outcome.eventId && outcome.revision !== null) {
      await refreshNotificationState(outcome.eventId, outcome.revision);
    }
  }

  async function processReferences(
    references: readonly DocumentReference<DocumentData>[],
  ): Promise<number> {
    let processed = 0;
    for (const reference of references) {
      const processorId = randomUUID();
      const job = await claim(reference, processorId);
      if (!job) continue;
      try {
        await mailer.send(notificationContent(job));
        await finishJob(reference, processorId, { sent: true });
      } catch (error) {
        logger.warn('Fallo sanitizado al enviar notificación de Evento.', {
          notificationId: reference.id,
          code: cleanErrorCode(error).code,
        });
        await finishJob(reference, processorId, { sent: false, error });
      }
      processed += 1;
    }
    return processed;
  }

  async function dueReferences(limit: number): Promise<readonly DocumentReference<DocumentData>[]> {
    const boundedLimit = Math.max(1, Math.min(50, Math.trunc(limit)));
    const now = Timestamp.fromDate(clock.now());
    const [recoverable, expiredLeases] = await Promise.all([
      notifications
        .where('estado', 'in', ['pendiente', 'fallido'])
        .where('proximoIntento', '<=', now)
        .orderBy('proximoIntento', 'asc')
        .limit(boundedLimit)
        .get(),
      notifications
        .where('estado', '==', 'procesando')
        .where('bloqueoHasta', '<=', now)
        .orderBy('bloqueoHasta', 'asc')
        .limit(boundedLimit)
        .get(),
    ]);
    const unique = new Map<string, DocumentReference<DocumentData>>();
    [...recoverable.docs, ...expiredLeases.docs].forEach((snapshot) => {
      if (unique.size < boundedLimit) unique.set(snapshot.id, snapshot.ref);
    });
    return [...unique.values()];
  }

  return {
    async reconcile(eventId) {
      const event = await canonicalEvent(eventId);
      let calendarStatus: EventIntegrationResult['calendarStatus'];
      try {
        if (event.cancelled) {
          if (event.calendarEventId) await calendar.remove(event.calendarEventId);
          calendarStatus = 'retirado';
          await event.reference.update({
            calendarEventId: null,
            calendarEstado: calendarStatus,
            fechaActualizacion: FieldValue.serverTimestamp(),
          });
        } else {
          const calendarEventId = await calendar.upsert(
            {
              eventId: event.eventId,
              name: event.name,
              dateStart: event.dateStart,
              timeStart: event.timeStart,
              dateEnd: event.dateEnd,
              timeEnd: event.timeEnd,
              responsible: event.responsible,
              campusName: event.campusName,
              campusAddress: event.campusAddress,
              observations: event.observations,
            },
            event.calendarEventId,
          );
          calendarStatus = 'sincronizado';
          await event.reference.update({
            calendarEventId,
            calendarEstado: calendarStatus,
            fechaActualizacion: FieldValue.serverTimestamp(),
          });
        }
      } catch (error) {
        calendarStatus = 'error';
        logger.warn('Fallo sanitizado al reconciliar Calendar.', {
          eventId,
          cause: error instanceof Error ? error.name : 'unknown',
        });
        await event.reference.update({
          calendarEstado: calendarStatus,
          fechaActualizacion: FieldValue.serverTimestamp(),
        });
      }

      await prepareNotifications(event);
      await prepareLogisticsNotifications(event);
      await processReferences(await dueReferences(50));
      const refreshed = await event.reference.get();
      const notificationState = refreshed.data()?.['notificacionesEstado'];
      return {
        calendarStatus,
        notificationStatus:
          notificationState === 'completas' || notificationState === 'parciales'
            ? notificationState
            : 'pendiente',
      };
    },

    async processDue(limit = 50) {
      const references = await dueReferences(limit);
      return { processed: await processReferences(references) };
    },
  };
}
