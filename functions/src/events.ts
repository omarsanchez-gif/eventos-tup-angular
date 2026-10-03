import type { FunctionsErrorCode } from 'firebase-functions/https';

import { EventTimeError, validateEventWindow, validateUpdatedEventWindow } from './event-time.js';

export const MAX_EVENT_EQUIPMENT_TYPES = 20;

export interface EventRequestIdentity {
  readonly uid: string;
  readonly authorized: boolean;
  readonly role: unknown;
}

export interface CanonicalEventRequester {
  readonly uid: string;
  readonly nombre: string;
  readonly correo: string;
  readonly role: 'admin' | 'usuario';
  readonly activo: boolean;
}

export interface RequestedEquipment {
  readonly equipmentId: string;
  readonly quantity: number;
}

export interface EventMutationInput {
  readonly name: string;
  readonly campusId: string;
  readonly dateStart: string;
  readonly timeStart: string;
  readonly dateEnd: string;
  readonly timeEnd: string;
  readonly observations: string;
  readonly coordinationIds: readonly string[];
  readonly equipment: readonly RequestedEquipment[];
  readonly protocolUrl: string;
  readonly protocolName: string;
  readonly start: Date;
  readonly end: Date;
}

export interface EventAvailabilityInput {
  readonly eventId: string | null;
  readonly campusId: string;
  readonly dateStart: string;
  readonly timeStart: string;
  readonly dateEnd: string;
  readonly timeEnd: string;
  readonly equipment: readonly RequestedEquipment[];
  readonly start: Date;
  readonly end: Date;
}

export interface EventListInput {
  readonly cursor: string | null;
  readonly search: string | null;
}

export interface EventRangeInput {
  readonly start: Date;
  readonly end: Date;
  readonly campusId: string | null;
}

export type EventTemporalStatus = 'programado' | 'en_ejecucion' | 'finalizado' | 'cancelado';
export type EventCalendarStatus = 'pendiente' | 'sincronizado' | 'error' | 'retirado';
export type EventNotificationStatus = 'pendiente' | 'completas' | 'parciales' | 'no_aplica';

export interface EventSummary {
  readonly eventId: string;
  readonly name: string;
  readonly dateStart: string;
  readonly timeStart: string;
  readonly dateEnd: string;
  readonly timeEnd: string;
  readonly start: Date | null;
  readonly end: Date | null;
  readonly responsible: string;
  readonly status: EventTemporalStatus;
  readonly campusId: string | null;
  readonly campusName: string;
  readonly coordinationNames: readonly string[];
  readonly equipmentCount: number;
  readonly creatorUid: string;
  readonly createdAt: Date | null;
  readonly protocolUrl: string | null;
  readonly protocolName: string | null;
  readonly calendarStatus: EventCalendarStatus;
  readonly notificationStatus: EventNotificationStatus;
  readonly ownedByRequester: boolean;
}

export interface EventReservationDetail {
  readonly equipmentId: string;
  readonly equipmentName: string;
  readonly quantity: number;
  readonly state: 'confirmada' | 'requiere_revision' | 'finalizada' | 'cancelada';
  readonly reviewReasons: readonly (
    'cobertura_sistemas' | 'inventario_reducido' | 'coordinacion_sistemas'
  )[];
  readonly requiresTransfer: boolean;
  readonly blockStart: Date;
  readonly blockEnd: Date;
  readonly scheduledRelease: Date;
  readonly receptionConfirmed: Date | null;
  readonly delayReported: boolean;
}

export interface EventDetail extends EventSummary {
  readonly observations: string;
  readonly coordinationIds: readonly string[];
  readonly requestedEquipment: readonly {
    readonly equipmentId: string;
    readonly name: string;
    readonly quantity: number;
    readonly baseCampusId: string;
    readonly baseCampusName: string;
    readonly classification: 'fijo' | 'transferible';
  }[];
  readonly reservations: readonly EventReservationDetail[];
  readonly canEdit: boolean;
  readonly canCancel: boolean;
}

export interface EventListResult {
  readonly items: readonly EventSummary[];
  readonly nextCursor: string | null;
  readonly serverNow: Date;
}

export interface EventAvailabilityItem {
  readonly equipmentId: string;
  readonly requested: number;
  readonly available: number;
  readonly confirmable: boolean;
  readonly blockStart: Date;
  readonly blockEnd: Date;
  readonly requiresTransfer: boolean;
}

export interface EventsRepository {
  findCanonicalRequester(uid: string): Promise<CanonicalEventRequester | null>;
  checkAvailability(
    requesterUid: string,
    input: EventAvailabilityInput,
    now: Date,
  ): Promise<readonly EventAvailabilityItem[]>;
  list(requesterUid: string, input: EventListInput, now: Date): Promise<EventListResult>;
  listRange(
    requesterUid: string,
    input: EventRangeInput,
    now: Date,
  ): Promise<readonly EventSummary[]>;
  create(
    requesterUid: string,
    input: EventMutationInput,
    now: Date,
    protocolPath: string,
  ): Promise<{ readonly eventId: string }>;
  getDetail(requesterUid: string, eventId: string, now: Date): Promise<EventDetail>;
  update(
    requesterUid: string,
    eventId: string,
    input: EventMutationInput,
    now: Date,
    protocolPath: string,
  ): Promise<{
    readonly eventId: string;
    readonly previousProtocolPath: string | null;
    readonly revision: number;
    readonly notificationChanged: boolean;
  }>;
  cancel(
    requesterUid: string,
    eventId: string,
    now: Date,
  ): Promise<{ readonly eventId: string; readonly protocolPath: string | null }>;
  confirmCoverage(
    requesterUid: string,
    eventId: string,
    equipmentId: string,
    now: Date,
  ): Promise<void>;
  confirmReception(
    requesterUid: string,
    eventId: string,
    equipmentId: string,
    now: Date,
  ): Promise<void>;
  reportDelay(
    requesterUid: string,
    eventId: string,
    equipmentId: string,
    release: Date,
    now: Date,
  ): Promise<void>;
}

export interface EventsDependencies {
  readonly repository: EventsRepository;
  readonly clock: { now(): Date };
  readonly logger: {
    warn(message: string, context?: Readonly<Record<string, unknown>>): void;
    error(message: string, context?: Readonly<Record<string, unknown>>): void;
  };
  readonly protocols: {
    validate(url: string): Promise<{ readonly path: string }>;
    remove(path: string): Promise<void>;
  };
  readonly integrations?: {
    reconcile(eventId: string): Promise<{
      readonly calendarStatus: EventCalendarStatus;
      readonly notificationStatus: EventNotificationStatus;
    }>;
  };
}

export type EventFunctionalCode =
  | 'unauthenticated'
  | 'permission-denied'
  | 'invalid-argument'
  | 'invalid-date-range'
  | 'event-advance-required'
  | 'event-duration-exceeded'
  | 'event-on-sunday'
  | 'calendar-range-invalid'
  | 'invalid-pdf'
  | 'campus-not-found'
  | 'campus-inactive'
  | 'coordination-not-found'
  | 'coordination-inactive'
  | 'equipment-not-found'
  | 'equipment-inactive'
  | 'equipment-unavailable'
  | 'equipment-cutoff-missed'
  | 'invalid-campus-schedule'
  | 'event-not-found'
  | 'event-cancelled'
  | 'event-update-restricted'
  | 'reservation-not-found'
  | 'reservation-state-invalid'
  | 'service-unavailable';

export class EventsError extends Error {
  constructor(
    readonly functionalCode: EventFunctionalCode,
    readonly functionsCode: FunctionsErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'EventsError';
  }
}

function invalid(message: string): never {
  throw new EventsError('invalid-argument', 'invalid-argument', message);
}

function requireObject(data: unknown): Readonly<Record<string, unknown>> {
  if (!data || typeof data !== 'object' || Array.isArray(data))
    invalid('La solicitud no es válida.');
  return data as Readonly<Record<string, unknown>>;
}

function requireAllowed(data: Readonly<Record<string, unknown>>, allowed: readonly string[]): void {
  if (Object.keys(data).some((key) => !allowed.includes(key))) {
    invalid('La solicitud contiene campos no permitidos.');
  }
}

function stringValue(
  data: Readonly<Record<string, unknown>>,
  key: string,
  options: { readonly max: number; readonly required?: boolean },
): string {
  const raw = data[key];
  if (typeof raw !== 'string') invalid('Faltan datos obligatorios.');
  const value = raw.trim().replace(/\s+/gu, ' ');
  if ((options.required ?? true) && !value) invalid('Faltan datos obligatorios.');
  if (value.length > options.max) invalid('Un campo supera la longitud permitida.');
  return value;
}

function documentId(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || value.includes('/') || value.length > 1500) {
    invalid('Una referencia no es válida.');
  }
  return value.trim();
}

function uniqueIds(value: unknown, maximum: number): readonly string[] {
  if (!Array.isArray(value) || value.length > maximum) invalid('La selección no es válida.');
  const ids = value.map(documentId);
  if (new Set(ids).size !== ids.length) invalid('La selección contiene referencias repetidas.');
  return ids;
}

function equipment(value: unknown): readonly RequestedEquipment[] {
  if (!Array.isArray(value) || value.length > MAX_EVENT_EQUIPMENT_TYPES) {
    invalid(`Se permiten como máximo ${MAX_EVENT_EQUIPMENT_TYPES} tipos de equipo.`);
  }
  const items = value.map((item) => {
    const record = requireObject(item);
    requireAllowed(record, ['equipoId', 'cantidad']);
    const quantity = record['cantidad'];
    if (!Number.isInteger(quantity) || (quantity as number) < 1 || (quantity as number) > 999) {
      invalid('Cada cantidad debe ser un entero positivo.');
    }
    return { equipmentId: documentId(record['equipoId']), quantity: quantity as number };
  });
  if (new Set(items.map((item) => item.equipmentId)).size !== items.length) {
    invalid('No se puede repetir el mismo equipo.');
  }
  return items;
}

function toEventsError(error: EventTimeError): EventsError {
  const functionsCode: FunctionsErrorCode =
    error.code === 'equipment-cutoff-missed' || error.code === 'invalid-campus-schedule'
      ? 'failed-precondition'
      : 'invalid-argument';
  return new EventsError(error.code, functionsCode, error.message);
}

function eventWindow(
  data: Readonly<Record<string, unknown>>,
  now: Date,
  mode: 'create' | 'update',
) {
  const dateStart = stringValue(data, 'fechaInicio', { max: 10 });
  const timeStart = stringValue(data, 'horaInicio', { max: 5 });
  const dateEnd = stringValue(data, 'fechaFin', { max: 10 });
  const timeEnd = stringValue(data, 'horaFin', { max: 5 });
  const window =
    mode === 'create'
      ? validateEventWindow(dateStart, timeStart, dateEnd, timeEnd, now)
      : validateUpdatedEventWindow(dateStart, timeStart, dateEnd, timeEnd, now);
  return { dateStart, timeStart, dateEnd, timeEnd, start: window.start, end: window.end };
}

function availabilityInput(data: unknown, now: Date): EventAvailabilityInput {
  const request = requireObject(data);
  requireAllowed(request, [
    'eventId',
    'campusId',
    'fechaInicio',
    'horaInicio',
    'fechaFin',
    'horaFin',
    'equiposSolicitados',
  ]);
  const eventIdValue = request['eventId'];
  const eventId =
    eventIdValue === undefined || eventIdValue === null ? null : documentId(eventIdValue);
  try {
    return {
      eventId,
      campusId: documentId(request['campusId']),
      ...eventWindow(request, now, eventId ? 'update' : 'create'),
      equipment: equipment(request['equiposSolicitados']),
    };
  } catch (error) {
    if (error instanceof EventTimeError) throw toEventsError(error);
    throw error;
  }
}

function mutationInput(data: unknown, now: Date, mode: 'create' | 'update'): EventMutationInput {
  const request = requireObject(data);
  requireAllowed(request, [
    'nombreEvento',
    'campusId',
    'fechaInicio',
    'horaInicio',
    'fechaFin',
    'horaFin',
    'observaciones',
    'coordinacionIds',
    'equiposSolicitados',
    'protocoloUrl',
    'protocoloNombre',
  ]);
  try {
    return {
      name: stringValue(request, 'nombreEvento', { max: 160 }),
      campusId: documentId(request['campusId']),
      ...eventWindow(request, now, mode),
      observations: stringValue(request, 'observaciones', { max: 2000, required: false }),
      coordinationIds: uniqueIds(request['coordinacionIds'], 500),
      equipment: equipment(request['equiposSolicitados']),
      protocolUrl: stringValue(request, 'protocoloUrl', { max: 2000 }),
      protocolName: stringValue(request, 'protocoloNombre', { max: 255 }),
    };
  } catch (error) {
    if (error instanceof EventTimeError) throw toEventsError(error);
    throw error;
  }
}

function listInput(data: unknown): EventListInput {
  const request = requireObject(data);
  requireAllowed(request, ['cursor', 'busqueda']);
  const cursor = request['cursor'];
  if (cursor !== undefined && cursor !== null && typeof cursor !== 'string') {
    invalid('El cursor no es válido.');
  }
  const rawSearch = request['busqueda'];
  if (rawSearch !== undefined && rawSearch !== null && typeof rawSearch !== 'string') {
    invalid('La búsqueda no es válida.');
  }
  const normalizedSearch =
    typeof rawSearch === 'string' ? normalizeEventSearchValue(rawSearch) : '';
  if (normalizedSearch.length === 1 || normalizedSearch.length > 80) {
    invalid('La búsqueda debe contener entre 2 y 80 caracteres.');
  }
  return {
    cursor: typeof cursor === 'string' && cursor ? cursor : null,
    search: normalizedSearch || null,
  };
}

export function normalizeEventSearchValue(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/gu, '')
    .toLocaleLowerCase('es-MX')
    .trim()
    .replace(/\s+/gu, ' ');
}

export function buildEventSearchTerms(name: string, responsible: string): readonly string[] {
  const terms = new Set<string>();
  const addPrefixes = (value: string, maximum: number) => {
    const limit = Math.min(value.length, maximum);
    for (let length = 2; length <= limit; length += 1) terms.add(value.slice(0, length));
  };
  for (const value of [name, responsible].map(normalizeEventSearchValue)) {
    addPrefixes(value, 80);
    value.split(' ').forEach((word) => addPrefixes(word, 30));
  }
  const result = [...terms];
  if (result.length > 500) {
    throw new EventsError(
      'service-unavailable',
      'internal',
      'No fue posible preparar la búsqueda del evento.',
    );
  }
  return result;
}

function eventIdInput(data: unknown): string {
  const request = requireObject(data);
  requireAllowed(request, ['eventId']);
  return documentId(request['eventId']);
}

function updateInput(data: unknown, now: Date): { eventId: string; input: EventMutationInput } {
  const request = requireObject(data);
  const eventId = documentId(request['eventId']);
  const mutation = Object.fromEntries(Object.entries(request).filter(([key]) => key !== 'eventId'));
  return { eventId, input: mutationInput(mutation, now, 'update') };
}

function reservationInput(data: unknown): { eventId: string; equipmentId: string } {
  const request = requireObject(data);
  requireAllowed(request, ['eventId', 'equipmentId']);
  return {
    eventId: documentId(request['eventId']),
    equipmentId: documentId(request['equipmentId']),
  };
}

function delayInput(data: unknown): { eventId: string; equipmentId: string; release: Date } {
  const request = requireObject(data);
  requireAllowed(request, ['eventId', 'equipmentId', 'nuevaLiberacion']);
  const rawRelease = request['nuevaLiberacion'];
  if (typeof rawRelease !== 'string') invalid('La nueva liberación no es válida.');
  const release = new Date(rawRelease);
  if (Number.isNaN(release.getTime())) invalid('La nueva liberación no es válida.');
  return {
    eventId: documentId(request['eventId']),
    equipmentId: documentId(request['equipmentId']),
    release,
  };
}

function rangeInput(data: unknown): EventRangeInput {
  const request = requireObject(data);
  requireAllowed(request, ['inicio', 'fin', 'campusId']);
  const rawStart = request['inicio'];
  const rawEnd = request['fin'];
  if (typeof rawStart !== 'string' || typeof rawEnd !== 'string') {
    invalid('El intervalo del calendario no es válido.');
  }
  const start = new Date(rawStart);
  const end = new Date(rawEnd);
  const duration = end.getTime() - start.getTime();
  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    duration <= 0 ||
    duration > 42 * 86_400_000
  ) {
    throw new EventsError(
      'calendar-range-invalid',
      'invalid-argument',
      'El calendario admite intervalos de hasta 42 fechas.',
    );
  }
  const campus = request['campusId'];
  return {
    start,
    end,
    campusId: campus === undefined || campus === null || campus === '' ? null : documentId(campus),
  };
}

function serialized(summary: EventSummary) {
  return {
    ...summary,
    start: summary.start?.toISOString() ?? null,
    end: summary.end?.toISOString() ?? null,
    createdAt: summary.createdAt?.toISOString() ?? null,
  };
}

function serializedDetail(detail: EventDetail) {
  return {
    ...serialized(detail),
    observations: detail.observations,
    coordinationIds: detail.coordinationIds,
    requestedEquipment: detail.requestedEquipment,
    reservations: detail.reservations.map((reservation) => ({
      ...reservation,
      blockStart: reservation.blockStart.toISOString(),
      blockEnd: reservation.blockEnd.toISOString(),
      scheduledRelease: reservation.scheduledRelease.toISOString(),
      receptionConfirmed: reservation.receptionConfirmed?.toISOString() ?? null,
    })),
    canEdit: detail.canEdit,
    canCancel: detail.canCancel,
  };
}

async function requester(
  identity: EventRequestIdentity | null,
  dependencies: EventsDependencies,
): Promise<EventRequestIdentity> {
  if (!identity) {
    throw new EventsError('unauthenticated', 'unauthenticated', 'Se requiere una sesión.');
  }
  if (!identity.authorized || (identity.role !== 'admin' && identity.role !== 'usuario')) {
    throw new EventsError('permission-denied', 'permission-denied', 'No tiene permisos.');
  }
  const canonical = await dependencies.repository.findCanonicalRequester(identity.uid);
  if (!canonical?.activo || canonical.role !== identity.role) {
    dependencies.logger.warn('Operación de Eventos rechazada sin perfil canónico.', {
      requesterUid: identity.uid,
    });
    throw new EventsError('permission-denied', 'permission-denied', 'No tiene permisos.');
  }
  return identity;
}

async function reconcileSafely(
  eventId: string,
  dependencies: EventsDependencies,
): Promise<{
  readonly calendarStatus: EventCalendarStatus;
  readonly notificationStatus: EventNotificationStatus;
}> {
  if (!dependencies.integrations) {
    return { calendarStatus: 'pendiente', notificationStatus: 'pendiente' };
  }
  try {
    return await dependencies.integrations.reconcile(eventId);
  } catch (error) {
    dependencies.logger.error('La reconciliación de Eventos requiere reintento.', {
      eventId,
      cause: error instanceof Error ? error.name : 'unknown',
    });
    return { calendarStatus: 'error', notificationStatus: 'pendiente' };
  }
}

export async function checkEventAvailability(
  identity: EventRequestIdentity | null,
  data: unknown,
  dependencies: EventsDependencies,
) {
  const actor = await requester(identity, dependencies);
  const now = dependencies.clock.now();
  const input = availabilityInput(data, now);
  const items = await dependencies.repository.checkAvailability(actor.uid, input, now);
  return {
    items: items.map((item) => ({
      ...item,
      blockStart: item.blockStart.toISOString(),
      blockEnd: item.blockEnd.toISOString(),
    })),
    confirmable: items.every((item) => item.confirmable),
    checkedAt: now.toISOString(),
  };
}

export async function createEventRecord(
  identity: EventRequestIdentity | null,
  data: unknown,
  dependencies: EventsDependencies,
) {
  const actor = await requester(identity, dependencies);
  const now = dependencies.clock.now();
  const input = mutationInput(data, now, 'create');
  const protocol = await dependencies.protocols.validate(input.protocolUrl);
  const result = await dependencies.repository.create(actor.uid, input, now, protocol.path);
  const integrations = await reconcileSafely(result.eventId, dependencies);
  return {
    ...result,
    status: 'saved' as const,
    ...integrations,
  };
}

export async function listEventRecords(
  identity: EventRequestIdentity | null,
  data: unknown,
  dependencies: EventsDependencies,
) {
  const actor = await requester(identity, dependencies);
  const now = dependencies.clock.now();
  const result = await dependencies.repository.list(actor.uid, listInput(data), now);
  return {
    items: result.items.map(serialized),
    nextCursor: result.nextCursor,
    serverNow: result.serverNow.toISOString(),
  };
}

export async function listCalendarEventRecords(
  identity: EventRequestIdentity | null,
  data: unknown,
  dependencies: EventsDependencies,
) {
  const actor = await requester(identity, dependencies);
  const now = dependencies.clock.now();
  const items = await dependencies.repository.listRange(actor.uid, rangeInput(data), now);
  return { items: items.map(serialized), serverNow: now.toISOString() };
}

export async function getEventDetailRecord(
  identity: EventRequestIdentity | null,
  data: unknown,
  dependencies: EventsDependencies,
) {
  const actor = await requester(identity, dependencies);
  const detail = await dependencies.repository.getDetail(
    actor.uid,
    eventIdInput(data),
    dependencies.clock.now(),
  );
  return serializedDetail(detail);
}

export async function updateEventRecord(
  identity: EventRequestIdentity | null,
  data: unknown,
  dependencies: EventsDependencies,
) {
  const actor = await requester(identity, dependencies);
  const now = dependencies.clock.now();
  const target = updateInput(data, now);
  const protocol = await dependencies.protocols.validate(target.input.protocolUrl);
  const result = await dependencies.repository.update(
    actor.uid,
    target.eventId,
    target.input,
    now,
    protocol.path,
  );
  if (result.previousProtocolPath && result.previousProtocolPath !== protocol.path) {
    await dependencies.protocols.remove(result.previousProtocolPath).catch((error: unknown) => {
      dependencies.logger.warn('No fue posible retirar el protocolo sustituido.', {
        eventId: result.eventId,
        cause: error instanceof Error ? error.name : 'unknown',
      });
    });
  }
  const integrations = await reconcileSafely(result.eventId, dependencies);
  return { eventId: result.eventId, status: 'saved' as const, ...integrations };
}

export async function cancelEventRecord(
  identity: EventRequestIdentity | null,
  data: unknown,
  dependencies: EventsDependencies,
) {
  const actor = await requester(identity, dependencies);
  const result = await dependencies.repository.cancel(
    actor.uid,
    eventIdInput(data),
    dependencies.clock.now(),
  );
  if (result.protocolPath) {
    await dependencies.protocols.remove(result.protocolPath).catch((error: unknown) => {
      dependencies.logger.warn('No fue posible retirar el protocolo cancelado.', {
        eventId: result.eventId,
        cause: error instanceof Error ? error.name : 'unknown',
      });
    });
  }
  const integrations = await reconcileSafely(result.eventId, dependencies);
  return { eventId: result.eventId, status: 'cancelled' as const, ...integrations };
}

export async function reconcileEventIntegrationsRecord(
  identity: EventRequestIdentity | null,
  data: unknown,
  dependencies: EventsDependencies,
) {
  const actor = await requester(identity, dependencies);
  const eventId = eventIdInput(data);
  const detail = await dependencies.repository.getDetail(
    actor.uid,
    eventId,
    dependencies.clock.now(),
  );
  if (!detail.ownedByRequester && actor.role !== 'admin') {
    throw new EventsError('permission-denied', 'permission-denied', 'No tiene permisos.');
  }
  if (!dependencies.integrations) {
    throw new EventsError(
      'service-unavailable',
      'failed-precondition',
      'Las integraciones no están configuradas.',
    );
  }
  return dependencies.integrations.reconcile(eventId);
}

export async function confirmReservationCoverageRecord(
  identity: EventRequestIdentity | null,
  data: unknown,
  dependencies: EventsDependencies,
) {
  const actor = await requester(identity, dependencies);
  if (actor.role !== 'admin') {
    throw new EventsError('permission-denied', 'permission-denied', 'No tiene permisos.');
  }
  const target = reservationInput(data);
  await dependencies.repository.confirmCoverage(
    actor.uid,
    target.eventId,
    target.equipmentId,
    dependencies.clock.now(),
  );
  return { status: 'confirmed' as const };
}

export async function confirmEquipmentReceptionRecord(
  identity: EventRequestIdentity | null,
  data: unknown,
  dependencies: EventsDependencies,
) {
  const actor = await requester(identity, dependencies);
  if (actor.role !== 'admin') {
    throw new EventsError('permission-denied', 'permission-denied', 'No tiene permisos.');
  }
  const target = reservationInput(data);
  await dependencies.repository.confirmReception(
    actor.uid,
    target.eventId,
    target.equipmentId,
    dependencies.clock.now(),
  );
  return { status: 'received' as const };
}

export async function reportEquipmentDelayRecord(
  identity: EventRequestIdentity | null,
  data: unknown,
  dependencies: EventsDependencies,
) {
  const actor = await requester(identity, dependencies);
  if (actor.role !== 'admin') {
    throw new EventsError('permission-denied', 'permission-denied', 'No tiene permisos.');
  }
  const target = delayInput(data);
  const now = dependencies.clock.now();
  if (target.release.getTime() <= now.getTime()) {
    invalid('La nueva liberación debe ser futura.');
  }
  await dependencies.repository.reportDelay(
    actor.uid,
    target.eventId,
    target.equipmentId,
    target.release,
    now,
  );
  const integrations = await reconcileSafely(target.eventId, dependencies);
  return { status: 'delayed' as const, ...integrations };
}
