import { createHash } from 'node:crypto';

import {
  FieldValue,
  Timestamp,
  type DocumentData,
  type DocumentSnapshot,
  type Firestore,
  type Query,
  type QueryDocumentSnapshot,
  type Transaction,
} from 'firebase-admin/firestore';

import {
  calculateEquipmentBlock,
  EventTimeError,
  satisfiesEventAdvance,
  scheduleFromUnknown,
  type EquipmentBlockWindow,
  type OperatingSchedule,
} from './event-time.js';
import {
  EventsError,
  buildEventSearchTerms,
  type CanonicalEventRequester,
  type EventAvailabilityInput,
  type EventAvailabilityItem,
  type EventDetail,
  type EventListInput,
  type EventListResult,
  type EventMutationInput,
  type EventRangeInput,
  type EventSummary,
  type EventTemporalStatus,
  type EventsRepository,
} from './events.js';

interface CampusRecord {
  readonly id: string;
  readonly name: string;
  readonly address: string | null;
  readonly active: boolean;
  readonly schedule: OperatingSchedule;
}

interface CoordinationRecord {
  readonly id: string;
  readonly name: string;
  readonly active: boolean;
}

interface EquipmentRecord {
  readonly id: string;
  readonly name: string;
  readonly baseCampusId: string;
  readonly operationalQuantity: number;
  readonly classification: 'fijo' | 'transferible';
  readonly allowedDestinationIds: readonly string[];
  readonly active: boolean;
}

interface LogisticsConfiguration {
  readonly systemsCoordinationId: string;
  readonly setupMinutes: number;
  readonly teardownMinutes: number;
  readonly departureTime: string;
  readonly travelMinutes: number;
  readonly returnReleaseMinutes: number;
}

interface ReservationCalculation {
  readonly equipment: EquipmentRecord;
  readonly baseCampus: CampusRecord;
  readonly block: EquipmentBlockWindow;
  readonly requested: number;
  readonly occupied: number;
  readonly available: number;
}

function requesterFromSnapshots(
  snapshots: readonly QueryDocumentSnapshot<DocumentData>[],
): CanonicalEventRequester | null {
  if (snapshots.length !== 1 || !snapshots[0]) return null;
  const data = snapshots[0].data();
  if (data['rol'] !== 'admin' && data['rol'] !== 'usuario') return null;
  return {
    uid: typeof data['uid'] === 'string' ? data['uid'] : '',
    nombre: typeof data['nombre'] === 'string' ? data['nombre'] : '',
    correo: typeof data['correo'] === 'string' ? data['correo'].trim().toLowerCase() : '',
    role: data['rol'],
    activo: data['activo'] === true,
  };
}

function campusFromSnapshot(snapshot: DocumentSnapshot<DocumentData>): CampusRecord | null {
  if (!snapshot.exists) return null;
  const data = snapshot.data() ?? {};
  return {
    id: snapshot.id,
    name: typeof data['nombre'] === 'string' ? data['nombre'] : '',
    address: typeof data['direccion'] === 'string' ? data['direccion'] : null,
    active: data['activo'] === true,
    schedule: scheduleFromUnknown(data['horariosSistemas']),
  };
}

function coordinationFromSnapshot(
  snapshot: DocumentSnapshot<DocumentData>,
): CoordinationRecord | null {
  if (!snapshot.exists) return null;
  const data = snapshot.data() ?? {};
  return {
    id: snapshot.id,
    name: typeof data['nombre'] === 'string' ? data['nombre'] : '',
    active: data['activo'] === true,
  };
}

function equipmentFromSnapshot(snapshot: DocumentSnapshot<DocumentData>): EquipmentRecord | null {
  if (!snapshot.exists) return null;
  const data = snapshot.data() ?? {};
  const classification = data['clasificacion'];
  if (classification !== 'fijo' && classification !== 'transferible') return null;
  return {
    id: snapshot.id,
    name: typeof data['nombre'] === 'string' ? data['nombre'] : '',
    baseCampusId: typeof data['campusBaseId'] === 'string' ? data['campusBaseId'] : '',
    operationalQuantity:
      typeof data['cantidadOperativa'] === 'number' && Number.isInteger(data['cantidadOperativa'])
        ? data['cantidadOperativa']
        : 0,
    classification,
    allowedDestinationIds: Array.isArray(data['campusDestinoIdsPermitidos'])
      ? data['campusDestinoIdsPermitidos'].filter(
          (value: unknown): value is string => typeof value === 'string',
        )
      : [],
    active: data['activo'] === true,
  };
}

function integer(data: DocumentData, key: string, minimum: number, maximum: number): number {
  const value = data[key];
  if (!Number.isInteger(value) || (value as number) < minimum || (value as number) > maximum) {
    throw new EventsError(
      'service-unavailable',
      'failed-precondition',
      'La configuración logística no es válida.',
    );
  }
  return value as number;
}

function configurationFromSnapshot(
  snapshot: DocumentSnapshot<DocumentData>,
): LogisticsConfiguration {
  if (!snapshot.exists) {
    throw new EventsError(
      'service-unavailable',
      'failed-precondition',
      'La configuración logística no está disponible.',
    );
  }
  const data = snapshot.data() ?? {};
  const departureTime = data['horaSalidaTraslado'];
  const timeZone = data['zonaHoraria'];
  const systemsCoordinationId = data['coordinacionSistemasId'];
  if (
    typeof departureTime !== 'string' ||
    !/^\d{2}:\d{2}$/u.test(departureTime) ||
    timeZone !== 'America/Cancun' ||
    typeof systemsCoordinationId !== 'string' ||
    !systemsCoordinationId
  ) {
    throw new EventsError(
      'service-unavailable',
      'failed-precondition',
      'La configuración logística no es válida.',
    );
  }
  return {
    systemsCoordinationId,
    setupMinutes: integer(data, 'montajeMinutos', 0, 1440),
    teardownMinutes: integer(data, 'desmontajeMinutos', 0, 1440),
    departureTime,
    travelMinutes: integer(data, 'duracionTrasladoInicialMinutos', 1, 1440),
    returnReleaseMinutes: integer(data, 'margenLiberacionRegresoMinutos', 0, 1440),
  };
}

function eventError(error: unknown): never {
  if (error instanceof EventsError) throw error;
  if (error instanceof EventTimeError) {
    throw new EventsError(
      error.code,
      error.code === 'invalid-campus-schedule' || error.code === 'equipment-cutoff-missed'
        ? 'failed-precondition'
        : 'invalid-argument',
      error.message,
    );
  }
  throw error;
}

function positiveVersion(snapshot: DocumentSnapshot<DocumentData> | undefined): number {
  const value = snapshot?.data()?.['version'];
  return Number.isInteger(value) && (value as number) >= 0 ? (value as number) : 0;
}

function reservationId(eventId: string, equipmentId: string): string {
  const digest = createHash('sha256').update(equipmentId).digest('hex').slice(0, 40);
  return `${eventId}_${digest}`;
}

function timestampOrNull(value: Date | null): Timestamp | null {
  return value ? Timestamp.fromDate(value) : null;
}

function dateFromUnknown(value: unknown): Date | null {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  return null;
}

function temporalStatus(
  persisted: unknown,
  start: Date | null,
  end: Date | null,
  now: Date,
): EventTemporalStatus {
  if (persisted === 'cancelado') return 'cancelado';
  if (start && end) {
    if (now.getTime() < start.getTime()) return 'programado';
    if (now.getTime() < end.getTime()) return 'en_ejecucion';
    return 'finalizado';
  }
  if (persisted === 'finalizado') return 'finalizado';
  if (persisted === 'en_proceso' || persisted === 'en_ejecucion') return 'en_ejecucion';
  return 'programado';
}

function eventSummary(
  snapshot: DocumentSnapshot<DocumentData>,
  now: Date,
  requesterUid: string,
): EventSummary {
  const data = snapshot.data() ?? {};
  const start = dateFromUnknown(data['inicioAt']);
  const end = dateFromUnknown(data['finAt']);
  const campusHistory =
    data['campusHistorico'] && typeof data['campusHistorico'] === 'object'
      ? (data['campusHistorico'] as Record<string, unknown>)
      : {};
  const coordinationHistory = Array.isArray(data['coordinacionesInvolucradas'])
    ? data['coordinacionesInvolucradas']
    : [];
  const requestedEquipment = Array.isArray(data['equiposSolicitados'])
    ? data['equiposSolicitados']
    : [];
  return {
    eventId: snapshot.id,
    name: typeof data['nombreEvento'] === 'string' ? data['nombreEvento'] : 'Evento sin nombre',
    dateStart: typeof data['fechaInicio'] === 'string' ? data['fechaInicio'] : '',
    timeStart: typeof data['horaInicio'] === 'string' ? data['horaInicio'] : '',
    dateEnd: typeof data['fechaFin'] === 'string' ? data['fechaFin'] : '',
    timeEnd: typeof data['horaFin'] === 'string' ? data['horaFin'] : '',
    start,
    end,
    responsible: typeof data['responsable'] === 'string' ? data['responsable'] : '',
    status: temporalStatus(data['estatus'], start, end, now),
    campusId: typeof data['campusId'] === 'string' ? data['campusId'] : null,
    campusName: typeof campusHistory['nombre'] === 'string' ? campusHistory['nombre'] : '',
    coordinationNames: coordinationHistory
      .map((item: unknown) =>
        item &&
        typeof item === 'object' &&
        typeof (item as Record<string, unknown>)['nombre'] === 'string'
          ? ((item as Record<string, unknown>)['nombre'] as string)
          : null,
      )
      .filter((value: string | null): value is string => value !== null),
    equipmentCount: requestedEquipment.length,
    creatorUid: typeof data['creadoPorUid'] === 'string' ? data['creadoPorUid'] : '',
    createdAt: dateFromUnknown(data['fechaCreacion']),
    protocolUrl: typeof data['protocoloUrl'] === 'string' ? data['protocoloUrl'] : null,
    protocolName: typeof data['protocoloNombre'] === 'string' ? data['protocoloNombre'] : null,
    calendarStatus:
      data['calendarEstado'] === 'sincronizado' ||
      data['calendarEstado'] === 'error' ||
      data['calendarEstado'] === 'retirado'
        ? data['calendarEstado']
        : 'pendiente',
    notificationStatus:
      data['notificacionesEstado'] === 'completas' ||
      data['notificacionesEstado'] === 'parciales' ||
      data['notificacionesEstado'] === 'no_aplica'
        ? data['notificacionesEstado']
        : 'pendiente',
    ownedByRequester: data['creadoPorUid'] === requesterUid,
  };
}

interface DecodedCursor {
  readonly createdAtMillis: number;
  readonly eventId: string;
  readonly search: string | null;
}

function decodeCursor(value: string, expectedSearch: string | null): DecodedCursor {
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as Record<
      string,
      unknown
    >;
    if (
      typeof parsed['createdAtMillis'] !== 'number' ||
      !Number.isFinite(parsed['createdAtMillis']) ||
      typeof parsed['eventId'] !== 'string' ||
      !parsed['eventId'] ||
      parsed['eventId'].includes('/') ||
      (parsed['search'] !== null && typeof parsed['search'] !== 'string') ||
      parsed['search'] !== expectedSearch
    ) {
      throw new Error('invalid');
    }
    return {
      createdAtMillis: parsed['createdAtMillis'],
      eventId: parsed['eventId'],
      search: parsed['search'] as string | null,
    };
  } catch {
    throw new EventsError('invalid-argument', 'invalid-argument', 'El cursor no es válido.');
  }
}

function encodeCursor(
  snapshot: QueryDocumentSnapshot<DocumentData>,
  search: string | null,
): string | null {
  const createdAt = dateFromUnknown(snapshot.data()['fechaCreacion']);
  return createdAt
    ? Buffer.from(
        JSON.stringify({ createdAtMillis: createdAt.getTime(), eventId: snapshot.id, search }),
      ).toString('base64url')
    : null;
}

function stringArray(value: unknown): readonly string[] {
  return Array.isArray(value)
    ? value.filter((item: unknown): item is string => typeof item === 'string')
    : [];
}

function reviewReasons(
  value: unknown,
): readonly ('cobertura_sistemas' | 'inventario_reducido' | 'coordinacion_sistemas')[] {
  return stringArray(value).filter(
    (item): item is 'cobertura_sistemas' | 'inventario_reducido' | 'coordinacion_sistemas' =>
      item === 'cobertura_sistemas' ||
      item === 'inventario_reducido' ||
      item === 'coordinacion_sistemas',
  );
}

interface LogisticsNotificationVersions {
  readonly cobertura_sistemas: number | null;
  readonly inventario_reducido: number | null;
  readonly cambio_incompatible: number | null;
  readonly demora: number | null;
  readonly cancelacion_post_salida: number | null;
}

function logisticsNotificationVersions(value: unknown): LogisticsNotificationVersions {
  const data = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const version = (key: keyof LogisticsNotificationVersions) =>
    Number.isInteger(data[key]) && (data[key] as number) > 0 ? (data[key] as number) : null;
  return {
    cobertura_sistemas: version('cobertura_sistemas'),
    inventario_reducido: version('inventario_reducido'),
    cambio_incompatible: version('cambio_incompatible'),
    demora: version('demora'),
    cancelacion_post_salida: version('cancelacion_post_salida'),
  };
}

function eventNotFound(): never {
  throw new EventsError('event-not-found', 'not-found', 'El evento no existe.');
}

function requireEventOwner(data: DocumentData, requesterUid: string): void {
  if (data['creadoPorUid'] !== requesterUid) {
    throw new EventsError(
      'permission-denied',
      'permission-denied',
      'Solo el creador puede modificar este evento.',
    );
  }
}

function timestampRequired(value: unknown, message: string): Date {
  const date = dateFromUnknown(value);
  if (!date) {
    throw new EventsError('service-unavailable', 'failed-precondition', message);
  }
  return date;
}

export function createFirestoreEventsRepository(firestore: Firestore): EventsRepository {
  const users = firestore.collection('usuarios');
  const campuses = firestore.collection('campus');
  const coordinations = firestore.collection('coordinaciones');
  const equipment = firestore.collection('equipos');
  const events = firestore.collection('eventos');
  const reservations = firestore.collection('reservasEquipo');
  const controls = firestore.collection('controlReservasEquipo');
  const logisticsConfiguration = firestore.collection('configuracion').doc('logisticaEquipos');

  async function calculate(
    transaction: Transaction,
    requesterUid: string,
    input: EventAvailabilityInput | EventMutationInput,
    now: Date,
    options: {
      readonly excludeEventId?: string;
      readonly allowInactiveCoordinationIds?: ReadonlySet<string>;
      readonly allowPastTransferCutoff?: boolean;
    } = {},
  ): Promise<{
    readonly requester: CanonicalEventRequester;
    readonly eventCampus: CampusRecord;
    readonly coordinationRecords: readonly CoordinationRecord[];
    readonly calculations: readonly ReservationCalculation[];
    readonly controlSnapshots: ReadonlyMap<string, DocumentSnapshot<DocumentData>>;
  }> {
    const requesterSnapshot = await transaction.get(
      users.where('uid', '==', requesterUid).limit(2),
    );
    const canonicalRequester = requesterFromSnapshots(requesterSnapshot.docs);
    if (!canonicalRequester?.activo) {
      throw new EventsError('permission-denied', 'permission-denied', 'No tiene permisos.');
    }

    const coordinationIds = [...('coordinationIds' in input ? input.coordinationIds : [])].sort();
    const equipmentRequests = [...input.equipment].sort((left, right) =>
      left.equipmentId.localeCompare(right.equipmentId),
    );
    const firstSnapshots = await transaction.getAll(
      campuses.doc(input.campusId),
      logisticsConfiguration,
      ...coordinationIds.map((id) => coordinations.doc(id)),
      ...equipmentRequests.map((item) => equipment.doc(item.equipmentId)),
    );
    const eventCampusSnapshot = firstSnapshots[0];
    const configurationSnapshot = firstSnapshots[1];
    if (!eventCampusSnapshot || !configurationSnapshot) {
      throw new EventsError('service-unavailable', 'internal', 'No fue posible validar el evento.');
    }
    const eventCampus = campusFromSnapshot(eventCampusSnapshot);
    if (!eventCampus) {
      throw new EventsError('campus-not-found', 'not-found', 'El campus no existe.');
    }
    if (!eventCampus.active) {
      throw new EventsError('campus-inactive', 'failed-precondition', 'El campus está suspendido.');
    }
    const configuration = configurationFromSnapshot(configurationSnapshot);
    const coordinationSnapshots = firstSnapshots.slice(2, 2 + coordinationIds.length);
    const equipmentSnapshots = firstSnapshots.slice(2 + coordinationIds.length);
    const coordinationRecords = coordinationSnapshots.map((snapshot) => {
      const record = coordinationFromSnapshot(snapshot);
      if (!record) {
        throw new EventsError('coordination-not-found', 'not-found', 'Una coordinación no existe.');
      }
      if (!record.active && !options.allowInactiveCoordinationIds?.has(record.id)) {
        throw new EventsError(
          'coordination-inactive',
          'failed-precondition',
          'Una coordinación está suspendida.',
        );
      }
      return record;
    });
    const equipmentRecords = equipmentSnapshots.map((snapshot) => {
      const record = equipmentFromSnapshot(snapshot);
      if (!record) {
        throw new EventsError('equipment-not-found', 'not-found', 'Un equipo no existe.');
      }
      if (!record.active || record.operationalQuantity < 1) {
        throw new EventsError(
          'equipment-inactive',
          'failed-precondition',
          'Un equipo está suspendido o no tiene unidades operativas.',
        );
      }
      return record;
    });

    const baseCampusIds = [
      ...new Set(
        equipmentRecords.map((record) => record.baseCampusId).filter((id) => id !== input.campusId),
      ),
    ].sort();
    const baseCampusSnapshots =
      baseCampusIds.length > 0
        ? await transaction.getAll(...baseCampusIds.map((id) => campuses.doc(id)))
        : [];
    const campusById = new Map<string, CampusRecord>([[eventCampus.id, eventCampus]]);
    baseCampusSnapshots.forEach((snapshot) => {
      const record = campusFromSnapshot(snapshot);
      if (!record?.active) {
        throw new EventsError(
          'campus-inactive',
          'failed-precondition',
          'El campus base de un equipo no está disponible.',
        );
      }
      campusById.set(record.id, record);
    });

    const blocks = equipmentRecords.map((record, index) => {
      const request = equipmentRequests[index];
      if (!request || request.equipmentId !== record.id) {
        throw new EventsError('service-unavailable', 'internal', 'No fue posible validar equipos.');
      }
      const requiresTransfer = record.baseCampusId !== eventCampus.id;
      if (
        requiresTransfer &&
        (record.classification !== 'transferible' ||
          !record.allowedDestinationIds.includes(eventCampus.id))
      ) {
        throw new EventsError(
          'equipment-unavailable',
          'failed-precondition',
          'Un equipo no puede utilizarse en el campus seleccionado.',
        );
      }
      const baseCampus = campusById.get(record.baseCampusId);
      if (!baseCampus) {
        throw new EventsError(
          'campus-not-found',
          'failed-precondition',
          'El campus base de un equipo no existe.',
        );
      }
      try {
        return {
          equipment: record,
          baseCampus,
          requested: request.quantity,
          block: calculateEquipmentBlock({
            event: { start: input.start, end: input.end, operationalDateCount: 1 },
            dateStart: input.dateStart,
            timeStart: input.timeStart,
            dateEnd: input.dateEnd,
            timeEnd: input.timeEnd,
            now: options.allowPastTransferCutoff ? new Date(0) : now,
            requiresTransfer,
            eventCampusSchedule: eventCampus.schedule,
            baseCampusSchedule: baseCampus.schedule,
            setupMinutes: configuration.setupMinutes,
            teardownMinutes: configuration.teardownMinutes,
            departureTime: configuration.departureTime,
            travelMinutes: configuration.travelMinutes,
            returnReleaseMinutes: configuration.returnReleaseMinutes,
          }),
        };
      } catch (error) {
        eventError(error);
      }
    });

    const controlSnapshots =
      blocks.length > 0
        ? await transaction.getAll(...blocks.map((item) => controls.doc(item.equipment.id)))
        : [];
    const controlByEquipment = new Map(
      controlSnapshots.map((snapshot) => [snapshot.id, snapshot] as const),
    );
    const overlappingSnapshots = await Promise.all(
      blocks.map((item) =>
        transaction.get(
          reservations
            .where('equipoId', '==', item.equipment.id)
            .where('estado', 'in', ['confirmada', 'requiere_revision'])
            .where('bloqueoInicio', '<', Timestamp.fromDate(item.block.end))
            .where('bloqueoFin', '>', Timestamp.fromDate(item.block.start)),
        ),
      ),
    );
    const calculations = blocks.map((item, index): ReservationCalculation => {
      const occupied = (overlappingSnapshots[index]?.docs ?? []).reduce((total, snapshot) => {
        if (snapshot.data()['eventoId'] === options.excludeEventId) return total;
        const value = snapshot.data()['cantidad'];
        return total + (Number.isInteger(value) && (value as number) > 0 ? (value as number) : 0);
      }, 0);
      return {
        ...item,
        occupied,
        available: Math.max(0, item.equipment.operationalQuantity - occupied),
      };
    });
    return {
      requester: canonicalRequester,
      eventCampus,
      coordinationRecords,
      calculations,
      controlSnapshots: controlByEquipment,
    };
  }

  async function requireRequester(requesterUid: string): Promise<CanonicalEventRequester> {
    const snapshot = await users.where('uid', '==', requesterUid).limit(2).get();
    const canonicalRequester = requesterFromSnapshots(snapshot.docs);
    if (!canonicalRequester?.activo) {
      throw new EventsError('permission-denied', 'permission-denied', 'No tiene permisos.');
    }
    return canonicalRequester;
  }

  function availability(calculations: readonly ReservationCalculation[]): EventAvailabilityItem[] {
    return calculations.map((item) => ({
      equipmentId: item.equipment.id,
      requested: item.requested,
      available: item.available,
      confirmable: item.requested <= item.available,
      blockStart: item.block.start,
      blockEnd: item.block.end,
      requiresTransfer: item.block.requiresTransfer,
    }));
  }

  return {
    async findCanonicalRequester(uid) {
      const snapshot = await users.where('uid', '==', uid).limit(2).get();
      return requesterFromSnapshots(snapshot.docs);
    },

    async checkAvailability(requesterUid, input, now) {
      return firestore.runTransaction(async (transaction) => {
        if (input.eventId) {
          const eventSnapshot = await transaction.get(events.doc(input.eventId));
          if (!eventSnapshot.exists) eventNotFound();
          const event = eventSnapshot.data() ?? {};
          requireEventOwner(event, requesterUid);
          if (event['estatus'] === 'cancelado') {
            throw new EventsError(
              'event-cancelled',
              'failed-precondition',
              'Un evento cancelado es de solo lectura.',
            );
          }
        }
        const result = await calculate(transaction, requesterUid, input, now, {
          excludeEventId: input.eventId ?? undefined,
          allowPastTransferCutoff: input.eventId !== null,
        });
        return availability(result.calculations);
      });
    },

    async list(requesterUid, input: EventListInput, now): Promise<EventListResult> {
      await requireRequester(requesterUid);
      let query: Query<DocumentData> = events
        .orderBy('fechaCreacion', 'desc')
        .orderBy('__name__', 'desc');
      if (input.search) query = query.where('terminosBusqueda', 'array-contains', input.search);
      if (input.cursor) {
        const cursor = decodeCursor(input.cursor, input.search);
        query = query.startAfter(Timestamp.fromMillis(cursor.createdAtMillis), cursor.eventId);
      }
      const snapshot = await query.limit(26).get();
      const page = snapshot.docs.slice(0, 25);
      const last = page.at(-1);
      return {
        items: page.map((document) => eventSummary(document, now, requesterUid)),
        nextCursor: snapshot.docs.length > 25 && last ? encodeCursor(last, input.search) : null,
        serverNow: now,
      };
    },

    async listRange(requesterUid, input: EventRangeInput, now) {
      await requireRequester(requesterUid);
      let query: Query<DocumentData> = events
        .where('inicioAt', '<', Timestamp.fromDate(input.end))
        .where('finAt', '>', Timestamp.fromDate(input.start));
      if (input.campusId) query = query.where('campusId', '==', input.campusId);
      const snapshot = await query.get();
      return snapshot.docs
        .map((document) => eventSummary(document, now, requesterUid))
        .sort((left, right) => (left.start?.getTime() ?? 0) - (right.start?.getTime() ?? 0));
    },

    async getDetail(requesterUid, eventId, now): Promise<EventDetail> {
      await requireRequester(requesterUid);
      const [eventSnapshot, reservationSnapshot] = await Promise.all([
        events.doc(eventId).get(),
        reservations.where('eventoId', '==', eventId).get(),
      ]);
      if (!eventSnapshot.exists) eventNotFound();
      const data = eventSnapshot.data() ?? {};
      const summary = eventSummary(eventSnapshot, now, requesterUid);
      const requestedEquipment = Array.isArray(data['equiposSolicitados'])
        ? data['equiposSolicitados']
            .map((item: unknown) => {
              if (!item || typeof item !== 'object') return null;
              const record = item as Record<string, unknown>;
              const classification = record['clasificacion'];
              if (
                typeof record['equipoId'] !== 'string' ||
                typeof record['nombre'] !== 'string' ||
                !Number.isInteger(record['cantidad']) ||
                typeof record['campusBaseId'] !== 'string' ||
                typeof record['campusBaseNombre'] !== 'string' ||
                (classification !== 'fijo' && classification !== 'transferible')
              ) {
                return null;
              }
              return {
                equipmentId: record['equipoId'],
                name: record['nombre'],
                quantity: record['cantidad'] as number,
                baseCampusId: record['campusBaseId'],
                baseCampusName: record['campusBaseNombre'],
                classification: classification as 'fijo' | 'transferible',
              };
            })
            .filter((item): item is NonNullable<typeof item> => item !== null)
        : [];
      const reservationDetails = reservationSnapshot.docs
        .map((snapshot) => {
          const reservation = snapshot.data();
          const state = reservation['estado'];
          const history =
            reservation['fotografia'] && typeof reservation['fotografia'] === 'object'
              ? (reservation['fotografia'] as Record<string, unknown>)
              : {};
          if (
            typeof reservation['equipoId'] !== 'string' ||
            !Number.isInteger(reservation['cantidad']) ||
            (state !== 'confirmada' &&
              state !== 'requiere_revision' &&
              state !== 'finalizada' &&
              state !== 'cancelada')
          ) {
            return null;
          }
          const blockStart = dateFromUnknown(reservation['bloqueoInicio']);
          const blockEnd = dateFromUnknown(reservation['bloqueoFin']);
          const scheduledRelease = dateFromUnknown(reservation['liberacionProgramada']);
          if (!blockStart || !blockEnd || !scheduledRelease) return null;
          return {
            equipmentId: reservation['equipoId'] as string,
            equipmentName:
              typeof history['equipoNombre'] === 'string' ? history['equipoNombre'] : 'Equipo',
            quantity: reservation['cantidad'] as number,
            state,
            reviewReasons: reviewReasons(reservation['motivosRevision']),
            requiresTransfer: reservation['esTraslado'] === true,
            blockStart,
            blockEnd,
            scheduledRelease,
            receptionConfirmed: dateFromUnknown(reservation['recepcionConfirmada']),
            delayReported: reservation['demoraReportada'] === true,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);
      const canMutate = summary.ownedByRequester && summary.status !== 'cancelado';
      return {
        ...summary,
        observations: typeof data['observaciones'] === 'string' ? data['observaciones'] : '',
        coordinationIds: stringArray(data['coordinacionIds']),
        requestedEquipment,
        reservations: reservationDetails,
        canEdit: canMutate,
        canCancel: canMutate,
      };
    },

    async create(requesterUid, input, now, protocolPath) {
      const eventReference = events.doc();
      await firestore.runTransaction(async (transaction) => {
        const result = await calculate(transaction, requesterUid, input, now);
        const unavailable = result.calculations.find((item) => item.requested > item.available);
        if (unavailable) {
          throw new EventsError(
            'equipment-unavailable',
            'failed-precondition',
            'La disponibilidad cambió. Revise los equipos solicitados.',
          );
        }

        transaction.create(eventReference, {
          nombreEvento: input.name,
          fechaInicio: input.dateStart,
          horaInicio: input.timeStart,
          fechaFin: input.dateEnd,
          horaFin: input.timeEnd,
          inicioAt: Timestamp.fromDate(input.start),
          finAt: Timestamp.fromDate(input.end),
          responsable: result.requester.nombre,
          estatus: 'programado',
          observaciones: input.observations,
          equipos: {
            laptops: 0,
            proyectores: 0,
            pantallas: 0,
            bocinas: 0,
            microfonos: 0,
            consolaAudio: 0,
            extensiones: 0,
          },
          protocoloUrl: input.protocolUrl,
          protocoloNombre: input.protocolName,
          protocoloRuta: protocolPath,
          calendarEventId: null,
          calendarEstado: 'pendiente',
          notificacionesEstado: 'pendiente',
          creadoPorUid: result.requester.uid,
          creadoPorCorreo: result.requester.correo,
          campusId: result.eventCampus.id,
          campusHistorico: {
            campusId: result.eventCampus.id,
            nombre: result.eventCampus.name,
            direccion: result.eventCampus.address,
          },
          coordinacionIds: result.coordinationRecords.map((record) => record.id),
          coordinacionesInvolucradas: result.coordinationRecords.map((record) => ({
            coordinacionId: record.id,
            nombre: record.name,
          })),
          revisionNotificacion: 1,
          terminosBusqueda: buildEventSearchTerms(input.name, result.requester.nombre),
          equipoIds: result.calculations.map((item) => item.equipment.id),
          equiposSolicitados: result.calculations.map((item) => ({
            equipoId: item.equipment.id,
            nombre: item.equipment.name,
            cantidad: item.requested,
            campusBaseId: item.baseCampus.id,
            campusBaseNombre: item.baseCampus.name,
            clasificacion: item.equipment.classification,
          })),
          fechaCreacion: FieldValue.serverTimestamp(),
          fechaActualizacion: FieldValue.serverTimestamp(),
          fechaCancelacion: null,
          canceladoPorUid: null,
        });

        result.calculations.forEach((item) => {
          const reservationReference = reservations.doc(
            reservationId(eventReference.id, item.equipment.id),
          );
          const controlSnapshot = result.controlSnapshots.get(item.equipment.id);
          const nextControlVersion = positiveVersion(controlSnapshot) + 1;
          transaction.create(reservationReference, {
            eventoId: eventReference.id,
            equipoId: item.equipment.id,
            cantidad: item.requested,
            campusEventoId: result.eventCampus.id,
            estado: item.block.systemsCoverage === 'pendiente' ? 'requiere_revision' : 'confirmada',
            motivosRevision:
              item.block.systemsCoverage === 'pendiente' ? ['cobertura_sistemas'] : [],
            versionesAvisoLogistico: {
              cobertura_sistemas:
                item.block.systemsCoverage === 'pendiente' ? nextControlVersion : null,
              inventario_reducido: null,
              cambio_incompatible: null,
              demora: null,
              cancelacion_post_salida: null,
            },
            esTraslado: item.block.requiresTransfer,
            bloqueoInicio: Timestamp.fromDate(item.block.start),
            bloqueoFin: Timestamp.fromDate(item.block.end),
            salidaProgramada: timestampOrNull(item.block.departure),
            regresoProgramado: timestampOrNull(item.block.returnStart),
            liberacionProgramada: Timestamp.fromDate(item.block.release),
            recepcionConfirmada: null,
            demoraReportada: false,
            coberturaSistemas: item.block.systemsCoverage,
            fotografia: {
              equipoNombre: item.equipment.name,
              campusBaseId: item.baseCampus.id,
              campusBaseNombre: item.baseCampus.name,
              campusEventoId: result.eventCampus.id,
              campusEventoNombre: result.eventCampus.name,
              clasificacion: item.equipment.classification,
            },
            fechaCreacion: FieldValue.serverTimestamp(),
            fechaActualizacion: FieldValue.serverTimestamp(),
          });
          transaction.set(
            controls.doc(item.equipment.id),
            {
              equipoId: item.equipment.id,
              version: nextControlVersion,
              fechaActualizacion: FieldValue.serverTimestamp(),
            },
            { merge: true },
          );
          transaction.update(equipment.doc(item.equipment.id), {
            utilizado: true,
            fechaActualizacion: FieldValue.serverTimestamp(),
          });
        });
        transaction.update(campuses.doc(result.eventCampus.id), {
          utilizado: true,
          fechaActualizacion: FieldValue.serverTimestamp(),
        });
        result.coordinationRecords.forEach((record) => {
          transaction.update(coordinations.doc(record.id), {
            utilizada: true,
            fechaActualizacion: FieldValue.serverTimestamp(),
          });
        });
      });
      return { eventId: eventReference.id };
    },

    async update(requesterUid, eventId, input, now, protocolPath) {
      const eventReference = events.doc(eventId);
      return firestore.runTransaction(async (transaction) => {
        const eventSnapshot = await transaction.get(eventReference);
        if (!eventSnapshot.exists) eventNotFound();
        const previous = eventSnapshot.data() ?? {};
        requireEventOwner(previous, requesterUid);
        if (previous['estatus'] === 'cancelado') {
          throw new EventsError(
            'event-cancelled',
            'failed-precondition',
            'Un evento cancelado es de solo lectura.',
          );
        }

        const previousCoordinationIds = new Set(stringArray(previous['coordinacionIds']));
        const previousEquipmentItems = Array.isArray(previous['equiposSolicitados'])
          ? previous['equiposSolicitados']
          : [];
        const previousEquipment = new Map<string, number>();
        previousEquipmentItems.forEach((item: unknown) => {
          if (!item || typeof item !== 'object') return;
          const record = item as Record<string, unknown>;
          if (typeof record['equipoId'] === 'string' && Number.isInteger(record['cantidad'])) {
            previousEquipment.set(record['equipoId'], record['cantidad'] as number);
          }
        });

        const previousDateStart =
          typeof previous['fechaInicio'] === 'string' ? previous['fechaInicio'] : '';
        const scheduleChanged =
          previousDateStart !== input.dateStart ||
          previous['horaInicio'] !== input.timeStart ||
          previous['fechaFin'] !== input.dateEnd ||
          previous['horaFin'] !== input.timeEnd;
        const campusChanged = previous['campusId'] !== input.campusId;
        const addsOrIncreasesEquipment = input.equipment.some(
          (item) => item.quantity > (previousEquipment.get(item.equipmentId) ?? 0),
        );
        if (
          previousDateStart &&
          !satisfiesEventAdvance(previousDateStart, now) &&
          (campusChanged ||
            addsOrIncreasesEquipment ||
            (scheduleChanged && !satisfiesEventAdvance(input.dateStart, now)))
        ) {
          throw new EventsError(
            'event-update-restricted',
            'failed-precondition',
            'El cambio solicitado no está permitido después del límite de anticipación.',
          );
        }

        const previousReservations = await transaction.get(
          reservations.where('eventoId', '==', eventId),
        );
        const previousReservationByEquipment = new Map(
          previousReservations.docs
            .map((snapshot) => [snapshot.data()['equipoId'], snapshot] as const)
            .filter(
              (entry): entry is readonly [string, (typeof previousReservations.docs)[number]] =>
                typeof entry[0] === 'string',
            ),
        );
        const result = await calculate(transaction, requesterUid, input, now, {
          excludeEventId: eventId,
          allowInactiveCoordinationIds: previousCoordinationIds,
          allowPastTransferCutoff: true,
        });
        const unavailable = result.calculations.find((item) => item.requested > item.available);
        if (unavailable) {
          throw new EventsError(
            'equipment-unavailable',
            'failed-precondition',
            'La disponibilidad cambió. Se conservó el evento anterior.',
          );
        }

        const newEquipmentIds = new Set(result.calculations.map((item) => item.equipment.id));
        const existingReservationIds = new Set(previousReservations.docs.map((item) => item.id));
        const oldEquipmentIds = new Set(
          previousReservations.docs
            .map((snapshot) => snapshot.data()['equipoId'])
            .filter((value: unknown): value is string => typeof value === 'string'),
        );
        const removedEquipmentIds = [...oldEquipmentIds].filter(
          (equipmentId) => !newEquipmentIds.has(equipmentId),
        );
        const changedEquipmentIds = new Set<string>(removedEquipmentIds);
        result.calculations.forEach((item) => {
          if (
            scheduleChanged ||
            campusChanged ||
            previousEquipment.get(item.equipment.id) !== item.requested
          ) {
            changedEquipmentIds.add(item.equipment.id);
          }
        });
        const removedControlSnapshots =
          removedEquipmentIds.length > 0
            ? await transaction.getAll(
                ...removedEquipmentIds.map((equipmentId) => controls.doc(equipmentId)),
              )
            : [];
        const controlSnapshots = new Map(result.controlSnapshots);
        removedControlSnapshots.forEach((snapshot) => controlSnapshots.set(snapshot.id, snapshot));

        const notificationChanged =
          previous['nombreEvento'] !== input.name ||
          scheduleChanged ||
          JSON.stringify([...previousCoordinationIds].sort()) !==
            JSON.stringify([...input.coordinationIds].sort());
        const currentRevision = Number.isInteger(previous['revisionNotificacion'])
          ? (previous['revisionNotificacion'] as number)
          : 0;
        const revision = notificationChanged ? currentRevision + 1 : currentRevision;
        const previousProtocolPath =
          typeof previous['protocoloRuta'] === 'string' ? previous['protocoloRuta'] : null;
        const previousNotificationState =
          previous['notificacionesEstado'] === 'pendiente' ||
          previous['notificacionesEstado'] === 'completas' ||
          previous['notificacionesEstado'] === 'parciales' ||
          previous['notificacionesEstado'] === 'no_aplica'
            ? previous['notificacionesEstado']
            : 'no_aplica';
        const previousCalendarState =
          previous['calendarEstado'] === 'pendiente' ||
          previous['calendarEstado'] === 'sincronizado' ||
          previous['calendarEstado'] === 'error' ||
          previous['calendarEstado'] === 'retirado'
            ? previous['calendarEstado']
            : typeof previous['calendarEventId'] === 'string'
              ? 'sincronizado'
              : 'pendiente';

        transaction.update(eventReference, {
          nombreEvento: input.name,
          fechaInicio: input.dateStart,
          horaInicio: input.timeStart,
          fechaFin: input.dateEnd,
          horaFin: input.timeEnd,
          inicioAt: Timestamp.fromDate(input.start),
          finAt: Timestamp.fromDate(input.end),
          observaciones: input.observations,
          protocoloUrl: input.protocolUrl,
          protocoloNombre: input.protocolName,
          protocoloRuta: protocolPath,
          campusId: result.eventCampus.id,
          campusHistorico: {
            campusId: result.eventCampus.id,
            nombre: result.eventCampus.name,
            direccion: result.eventCampus.address,
          },
          coordinacionIds: result.coordinationRecords.map((record) => record.id),
          coordinacionesInvolucradas: result.coordinationRecords.map((record) => ({
            coordinacionId: record.id,
            nombre: record.name,
          })),
          revisionNotificacion: revision,
          notificacionesEstado: notificationChanged ? 'pendiente' : previousNotificationState,
          calendarEstado:
            scheduleChanged || previous['nombreEvento'] !== input.name
              ? 'pendiente'
              : previousCalendarState,
          terminosBusqueda: buildEventSearchTerms(input.name, result.requester.nombre),
          equipoIds: result.calculations.map((item) => item.equipment.id),
          equiposSolicitados: result.calculations.map((item) => ({
            equipoId: item.equipment.id,
            nombre: item.equipment.name,
            cantidad: item.requested,
            campusBaseId: item.baseCampus.id,
            campusBaseNombre: item.baseCampus.name,
            clasificacion: item.equipment.classification,
          })),
          fechaActualizacion: FieldValue.serverTimestamp(),
        });

        result.calculations.forEach((item) => {
          if (!changedEquipmentIds.has(item.equipment.id)) return;
          const reservationReference = reservations.doc(reservationId(eventId, item.equipment.id));
          const previousReservation = previousReservationByEquipment.get(item.equipment.id);
          const previousReservationData = previousReservation?.data() ?? {};
          const previousDeparture = dateFromUnknown(previousReservationData['salidaProgramada']);
          const transferStarted =
            previousReservationData['esTraslado'] === true &&
            previousDeparture !== null &&
            previousDeparture.getTime() <= now.getTime();
          const nextControlVersion = positiveVersion(controlSnapshots.get(item.equipment.id)) + 1;
          if (transferStarted) {
            const previousReasons = reviewReasons(previousReservationData['motivosRevision']);
            const reasons = [...new Set([...previousReasons, 'coordinacion_sistemas'])];
            const notificationVersions = logisticsNotificationVersions(
              previousReservationData['versionesAvisoLogistico'],
            );
            const previousStart = dateFromUnknown(previousReservationData['bloqueoInicio']);
            const previousEnd = dateFromUnknown(previousReservationData['bloqueoFin']);
            const previousRelease = dateFromUnknown(
              previousReservationData['liberacionProgramada'],
            );
            transaction.update(reservationReference, {
              cantidad: Math.max(
                item.requested,
                typeof previousReservationData['cantidad'] === 'number'
                  ? previousReservationData['cantidad']
                  : item.requested,
              ),
              estado: 'requiere_revision',
              motivosRevision: reasons,
              versionesAvisoLogistico: {
                ...notificationVersions,
                cambio_incompatible: nextControlVersion,
              },
              bloqueoInicio: Timestamp.fromDate(
                previousStart && previousStart.getTime() < item.block.start.getTime()
                  ? previousStart
                  : item.block.start,
              ),
              bloqueoFin: Timestamp.fromDate(
                previousEnd && previousEnd.getTime() > item.block.end.getTime()
                  ? previousEnd
                  : item.block.end,
              ),
              liberacionProgramada: Timestamp.fromDate(
                previousRelease && previousRelease.getTime() > item.block.release.getTime()
                  ? previousRelease
                  : item.block.release,
              ),
              fechaActualizacion: FieldValue.serverTimestamp(),
            });
            return;
          }
          transaction.set(
            reservationReference,
            {
              eventoId: eventId,
              equipoId: item.equipment.id,
              cantidad: item.requested,
              campusEventoId: result.eventCampus.id,
              estado:
                item.block.systemsCoverage === 'pendiente' ? 'requiere_revision' : 'confirmada',
              motivosRevision:
                item.block.systemsCoverage === 'pendiente' ? ['cobertura_sistemas'] : [],
              versionesAvisoLogistico: {
                cobertura_sistemas:
                  item.block.systemsCoverage === 'pendiente' ? nextControlVersion : null,
                inventario_reducido: null,
                cambio_incompatible: null,
                demora: null,
                cancelacion_post_salida: null,
              },
              esTraslado: item.block.requiresTransfer,
              bloqueoInicio: Timestamp.fromDate(item.block.start),
              bloqueoFin: Timestamp.fromDate(item.block.end),
              salidaProgramada: timestampOrNull(item.block.departure),
              regresoProgramado: timestampOrNull(item.block.returnStart),
              liberacionProgramada: Timestamp.fromDate(item.block.release),
              recepcionConfirmada: null,
              demoraReportada: false,
              coberturaSistemas: item.block.systemsCoverage,
              fotografia: {
                equipoNombre: item.equipment.name,
                campusBaseId: item.baseCampus.id,
                campusBaseNombre: item.baseCampus.name,
                campusEventoId: result.eventCampus.id,
                campusEventoNombre: result.eventCampus.name,
                clasificacion: item.equipment.classification,
              },
              fechaActualizacion: FieldValue.serverTimestamp(),
              ...(existingReservationIds.has(reservationId(eventId, item.equipment.id))
                ? {}
                : { fechaCreacion: FieldValue.serverTimestamp() }),
            },
            { merge: true },
          );
          transaction.update(equipment.doc(item.equipment.id), {
            utilizado: true,
            fechaActualizacion: FieldValue.serverTimestamp(),
          });
        });

        previousReservations.docs.forEach((snapshot) => {
          const reservation = snapshot.data();
          const equipmentId = reservation['equipoId'];
          if (typeof equipmentId !== 'string' || newEquipmentIds.has(equipmentId)) return;
          const departure = dateFromUnknown(reservation['salidaProgramada']);
          const transferred = reservation['esTraslado'] === true;
          const transferStarted = transferred && departure && departure.getTime() <= now.getTime();
          const reasons = reviewReasons(reservation['motivosRevision']);
          const notificationVersions = logisticsNotificationVersions(
            reservation['versionesAvisoLogistico'],
          );
          const nextControlVersion = positiveVersion(controlSnapshots.get(equipmentId)) + 1;
          transaction.update(snapshot.ref, {
            estado: transferStarted ? 'requiere_revision' : 'cancelada',
            ...(transferStarted
              ? {
                  motivosRevision: [...new Set([...reasons, 'coordinacion_sistemas'])],
                  versionesAvisoLogistico: {
                    ...notificationVersions,
                    cambio_incompatible: nextControlVersion,
                  },
                }
              : {
                  bloqueoFin: Timestamp.fromDate(now),
                  liberacionProgramada: Timestamp.fromDate(now),
                }),
            fechaActualizacion: FieldValue.serverTimestamp(),
          });
        });

        changedEquipmentIds.forEach((equipmentId) => {
          transaction.set(
            controls.doc(equipmentId),
            {
              equipoId: equipmentId,
              version: positiveVersion(controlSnapshots.get(equipmentId)) + 1,
              fechaActualizacion: FieldValue.serverTimestamp(),
            },
            { merge: true },
          );
        });
        transaction.update(campuses.doc(result.eventCampus.id), {
          utilizado: true,
          fechaActualizacion: FieldValue.serverTimestamp(),
        });
        result.coordinationRecords.forEach((record) => {
          transaction.update(coordinations.doc(record.id), {
            utilizada: true,
            fechaActualizacion: FieldValue.serverTimestamp(),
          });
        });
        return { eventId, previousProtocolPath, revision, notificationChanged };
      });
    },

    async cancel(requesterUid, eventId, now) {
      const eventReference = events.doc(eventId);
      return firestore.runTransaction(async (transaction) => {
        const eventSnapshot = await transaction.get(eventReference);
        if (!eventSnapshot.exists) eventNotFound();
        const event = eventSnapshot.data() ?? {};
        requireEventOwner(event, requesterUid);
        const protocolPath =
          typeof event['protocoloRuta'] === 'string' ? event['protocoloRuta'] : null;
        if (event['estatus'] === 'cancelado') return { eventId, protocolPath };

        const reservationSnapshot = await transaction.get(
          reservations.where('eventoId', '==', eventId),
        );
        const equipmentIds = [
          ...new Set(
            reservationSnapshot.docs
              .map((snapshot) => snapshot.data()['equipoId'])
              .filter((value: unknown): value is string => typeof value === 'string'),
          ),
        ].sort();
        const controlSnapshots =
          equipmentIds.length > 0
            ? await transaction.getAll(...equipmentIds.map((id) => controls.doc(id)))
            : [];
        const controlById = new Map(
          controlSnapshots.map((snapshot) => [snapshot.id, snapshot] as const),
        );

        reservationSnapshot.docs.forEach((snapshot) => {
          const reservation = snapshot.data();
          const departure = dateFromUnknown(reservation['salidaProgramada']);
          const transferred = reservation['esTraslado'] === true;
          const transferStarted = transferred && departure && departure.getTime() <= now.getTime();
          const equipmentId = reservation['equipoId'];
          const notificationVersions = logisticsNotificationVersions(
            reservation['versionesAvisoLogistico'],
          );
          const nextControlVersion =
            typeof equipmentId === 'string'
              ? positiveVersion(controlById.get(equipmentId)) + 1
              : null;
          transaction.update(snapshot.ref, {
            estado: transferStarted ? reservation['estado'] : 'cancelada',
            ...(transferStarted
              ? {
                  versionesAvisoLogistico: {
                    ...notificationVersions,
                    cancelacion_post_salida: nextControlVersion,
                  },
                }
              : {
                  bloqueoFin: Timestamp.fromDate(now),
                  liberacionProgramada: Timestamp.fromDate(now),
                }),
            fechaActualizacion: FieldValue.serverTimestamp(),
          });
        });
        equipmentIds.forEach((equipmentId) => {
          transaction.set(
            controls.doc(equipmentId),
            {
              equipoId: equipmentId,
              version: positiveVersion(controlById.get(equipmentId)) + 1,
              fechaActualizacion: FieldValue.serverTimestamp(),
            },
            { merge: true },
          );
        });
        const revision =
          (Number.isInteger(event['revisionNotificacion'])
            ? (event['revisionNotificacion'] as number)
            : 0) + 1;
        transaction.update(eventReference, {
          estatus: 'cancelado',
          fechaCancelacion: Timestamp.fromDate(now),
          canceladoPorUid: requesterUid,
          protocoloUrl: null,
          protocoloNombre: null,
          protocoloRuta: null,
          calendarEstado: 'pendiente',
          notificacionesEstado: 'pendiente',
          revisionNotificacion: revision,
          fechaActualizacion: FieldValue.serverTimestamp(),
        });
        return { eventId, protocolPath };
      });
    },

    async confirmCoverage(requesterUid, eventId, equipmentId) {
      const requester = await requireRequester(requesterUid);
      if (requester.role !== 'admin') {
        throw new EventsError('permission-denied', 'permission-denied', 'No tiene permisos.');
      }
      const reservationReference = reservations.doc(reservationId(eventId, equipmentId));
      await firestore.runTransaction(async (transaction) => {
        const [eventSnapshot, reservationSnapshot, controlSnapshot] = await transaction.getAll(
          events.doc(eventId),
          reservationReference,
          controls.doc(equipmentId),
        );
        if (!eventSnapshot?.exists) eventNotFound();
        if (!reservationSnapshot?.exists) {
          throw new EventsError('reservation-not-found', 'not-found', 'La reservación no existe.');
        }
        const reservation = reservationSnapshot.data() ?? {};
        const reasons = reviewReasons(reservation['motivosRevision']);
        if (!reasons.includes('cobertura_sistemas')) return;
        if (reservation['estado'] === 'cancelada' || reservation['estado'] === 'finalizada') {
          throw new EventsError(
            'reservation-state-invalid',
            'failed-precondition',
            'La reservación ya no admite esta acción.',
          );
        }
        const remaining = reasons.filter((reason) => reason !== 'cobertura_sistemas');
        const notificationVersions = logisticsNotificationVersions(
          reservation['versionesAvisoLogistico'],
        );
        transaction.update(reservationReference, {
          motivosRevision: remaining,
          coberturaSistemas: 'confirmada',
          estado: remaining.length === 0 ? 'confirmada' : 'requiere_revision',
          versionesAvisoLogistico: {
            ...notificationVersions,
            cobertura_sistemas: null,
          },
          fechaActualizacion: FieldValue.serverTimestamp(),
        });
        transaction.set(
          controls.doc(equipmentId),
          {
            equipoId: equipmentId,
            version: positiveVersion(controlSnapshot) + 1,
            fechaActualizacion: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      });
    },

    async confirmReception(requesterUid, eventId, equipmentId, now) {
      const requester = await requireRequester(requesterUid);
      if (requester.role !== 'admin') {
        throw new EventsError('permission-denied', 'permission-denied', 'No tiene permisos.');
      }
      const reservationReference = reservations.doc(reservationId(eventId, equipmentId));
      await firestore.runTransaction(async (transaction) => {
        const [eventSnapshot, reservationSnapshot, controlSnapshot] = await transaction.getAll(
          events.doc(eventId),
          reservationReference,
          controls.doc(equipmentId),
        );
        if (!eventSnapshot?.exists) eventNotFound();
        if (!reservationSnapshot?.exists) {
          throw new EventsError('reservation-not-found', 'not-found', 'La reservación no existe.');
        }
        const reservation = reservationSnapshot.data() ?? {};
        if (reservation['estado'] === 'finalizada' && reservation['recepcionConfirmada']) return;
        if (reservation['estado'] === 'cancelada') {
          throw new EventsError(
            'reservation-state-invalid',
            'failed-precondition',
            'La reservación ya no admite esta acción.',
          );
        }
        transaction.update(reservationReference, {
          estado: 'finalizada',
          bloqueoFin: Timestamp.fromDate(now),
          liberacionProgramada: Timestamp.fromDate(now),
          recepcionConfirmada: Timestamp.fromDate(now),
          fechaActualizacion: FieldValue.serverTimestamp(),
        });
        transaction.set(
          controls.doc(equipmentId),
          {
            equipoId: equipmentId,
            version: positiveVersion(controlSnapshot) + 1,
            fechaActualizacion: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      });
    },

    async reportDelay(requesterUid, eventId, equipmentId, release, now) {
      const requester = await requireRequester(requesterUid);
      if (requester.role !== 'admin') {
        throw new EventsError('permission-denied', 'permission-denied', 'No tiene permisos.');
      }
      const reservationReference = reservations.doc(reservationId(eventId, equipmentId));
      await firestore.runTransaction(async (transaction) => {
        const [eventSnapshot, reservationSnapshot, controlSnapshot] = await transaction.getAll(
          events.doc(eventId),
          reservationReference,
          controls.doc(equipmentId),
        );
        if (!eventSnapshot?.exists) eventNotFound();
        if (!reservationSnapshot?.exists) {
          throw new EventsError('reservation-not-found', 'not-found', 'La reservación no existe.');
        }
        const reservation = reservationSnapshot.data() ?? {};
        if (reservation['estado'] === 'cancelada' || reservation['estado'] === 'finalizada') {
          throw new EventsError(
            'reservation-state-invalid',
            'failed-precondition',
            'La reservación ya no admite esta acción.',
          );
        }
        const returnStart = timestampRequired(
          reservation['regresoProgramado'],
          'La reservación no tiene un regreso programado.',
        );
        if (release.getTime() <= now.getTime() || release.getTime() <= returnStart.getTime()) {
          throw new EventsError(
            'invalid-argument',
            'invalid-argument',
            'La nueva liberación debe ser posterior al regreso previsto.',
          );
        }
        const currentRelease = dateFromUnknown(reservation['liberacionProgramada']);
        if (
          reservation['demoraReportada'] === true &&
          currentRelease?.getTime() === release.getTime()
        ) {
          return;
        }
        const nextControlVersion = positiveVersion(controlSnapshot) + 1;
        transaction.update(reservationReference, {
          demoraReportada: true,
          liberacionProgramada: Timestamp.fromDate(release),
          bloqueoFin: Timestamp.fromDate(release),
          versionesAvisoLogistico: {
            ...logisticsNotificationVersions(reservation['versionesAvisoLogistico']),
            demora: nextControlVersion,
          },
          fechaActualizacion: FieldValue.serverTimestamp(),
        });
        transaction.set(
          controls.doc(equipmentId),
          {
            equipoId: equipmentId,
            version: nextControlVersion,
            fechaActualizacion: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      });
    },
  };
}
