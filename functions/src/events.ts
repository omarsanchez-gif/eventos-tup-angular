import type { FunctionsErrorCode } from 'firebase-functions/https';

import { EventTimeError, validateEventWindow } from './event-time.js';

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
}

export interface EventRangeInput {
  readonly start: Date;
  readonly end: Date;
  readonly campusId: string | null;
}

export type EventTemporalStatus = 'programado' | 'en_ejecucion' | 'finalizado' | 'cancelado';

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
  readonly calendarStatus: 'synced' | 'pending';
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
  ): Promise<{ readonly eventId: string }>;
}

export interface EventsDependencies {
  readonly repository: EventsRepository;
  readonly clock: { now(): Date };
  readonly logger: {
    warn(message: string, context?: Readonly<Record<string, unknown>>): void;
    error(message: string, context?: Readonly<Record<string, unknown>>): void;
  };
  readonly protocols: {
    validate(url: string): Promise<void>;
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

function eventWindow(data: Readonly<Record<string, unknown>>, now: Date) {
  const dateStart = stringValue(data, 'fechaInicio', { max: 10 });
  const timeStart = stringValue(data, 'horaInicio', { max: 5 });
  const dateEnd = stringValue(data, 'fechaFin', { max: 10 });
  const timeEnd = stringValue(data, 'horaFin', { max: 5 });
  const window = validateEventWindow(dateStart, timeStart, dateEnd, timeEnd, now);
  return { dateStart, timeStart, dateEnd, timeEnd, start: window.start, end: window.end };
}

function availabilityInput(data: unknown, now: Date): EventAvailabilityInput {
  const request = requireObject(data);
  requireAllowed(request, [
    'campusId',
    'fechaInicio',
    'horaInicio',
    'fechaFin',
    'horaFin',
    'equiposSolicitados',
  ]);
  try {
    return {
      campusId: documentId(request['campusId']),
      ...eventWindow(request, now),
      equipment: equipment(request['equiposSolicitados']),
    };
  } catch (error) {
    if (error instanceof EventTimeError) throw toEventsError(error);
    throw error;
  }
}

function mutationInput(data: unknown, now: Date): EventMutationInput {
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
      ...eventWindow(request, now),
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
  requireAllowed(request, ['cursor']);
  const cursor = request['cursor'];
  if (cursor !== undefined && cursor !== null && typeof cursor !== 'string') {
    invalid('El cursor no es válido.');
  }
  return { cursor: typeof cursor === 'string' && cursor ? cursor : null };
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
  const input = mutationInput(data, now);
  await dependencies.protocols.validate(input.protocolUrl);
  const result = await dependencies.repository.create(actor.uid, input, now);
  return {
    ...result,
    status: 'saved' as const,
    calendarStatus: 'pending' as const,
    notificationStatus: 'pending' as const,
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
