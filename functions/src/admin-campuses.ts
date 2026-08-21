import type { FunctionsErrorCode } from 'firebase-functions/https';

export const MAX_SUPPORTED_CAMPUSES = 100;
export const CAMPUS_DAYS = [
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado',
  'domingo',
] as const;
export type CampusDay = (typeof CAMPUS_DAYS)[number];
export interface CampusScheduleDay {
  readonly operativo: boolean;
  readonly inicio: string | null;
  readonly fin: string | null;
}
export type CampusSchedule = Readonly<Record<CampusDay, CampusScheduleDay>>;
export interface CampusRequestIdentity {
  readonly uid: string;
  readonly authorized: boolean;
  readonly role: unknown;
}
export interface CanonicalCampusRequester {
  readonly uid: string;
  readonly role: 'admin' | 'usuario';
  readonly activo: boolean;
}
export interface ManagedCampusRecord {
  readonly documentId: string;
  readonly nombre: string;
  readonly nombreNormalizado: string;
  readonly clave: string;
  readonly direccion: string | null;
  readonly referencia: string | null;
  readonly activo: boolean;
  readonly utilizado: boolean;
  readonly horariosSistemas: CampusSchedule;
  readonly fechaCreacion: unknown;
  readonly fechaActualizacion: unknown;
}
export interface CampusMutationInput {
  readonly nombre: string;
  readonly nombreNormalizado: string;
  readonly clave: string;
  readonly direccion: string | null;
  readonly referencia: string | null;
  readonly horariosSistemas: CampusSchedule;
  readonly activo: boolean;
}
export interface AdminCampusesRepository {
  findCanonicalRequester(uid: string): Promise<CanonicalCampusRequester | null>;
  list(limit: number): Promise<readonly ManagedCampusRecord[]>;
  create(requesterUid: string, input: CampusMutationInput): Promise<string>;
  update(
    requesterUid: string,
    input: Omit<CampusMutationInput, 'activo'> & Readonly<{ documentId: string }>,
  ): Promise<void>;
  setStatus(requesterUid: string, input: { documentId: string; activo: boolean }): Promise<void>;
  delete(requesterUid: string, documentId: string): Promise<void>;
}
export interface AdminCampusesDependencies {
  readonly repository: AdminCampusesRepository;
  readonly logger: {
    warn(message: string, context?: Readonly<Record<string, unknown>>): void;
    error(message: string, context?: Readonly<Record<string, unknown>>): void;
  };
}
export type AdminCampusesFunctionalCode =
  | 'unauthenticated'
  | 'permission-denied'
  | 'invalid-argument'
  | 'campus-name-exists'
  | 'campus-code-exists'
  | 'campus-code-immutable'
  | 'campus-not-found'
  | 'campus-in-use'
  | 'active-campus-requires-schedule'
  | 'campus-capacity-exceeded'
  | 'service-unavailable';

export class AdminCampusesError extends Error {
  constructor(
    readonly functionalCode: AdminCampusesFunctionalCode,
    readonly functionsCode: FunctionsErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AdminCampusesError';
  }
}

function invalid(message: string): never {
  throw new AdminCampusesError('invalid-argument', 'invalid-argument', message);
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
function requiredString(data: Readonly<Record<string, unknown>>, key: string): string {
  const value = data[key];
  if (typeof value !== 'string' || !value.trim()) invalid('Faltan datos obligatorios.');
  return value.trim();
}
function optionalString(
  data: Readonly<Record<string, unknown>>,
  key: string,
  max: number,
): string | null {
  const value = data[key];
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') invalid('La solicitud no es válida.');
  const compact = value.trim().replace(/\s+/gu, ' ');
  if (compact.length > max) invalid(`El campo ${key} supera ${max} caracteres.`);
  return compact || null;
}
function requiredBoolean(data: Readonly<Record<string, unknown>>, key: string): boolean {
  if (typeof data[key] !== 'boolean') invalid('La solicitud no es válida.');
  return data[key] as boolean;
}
function documentId(data: Readonly<Record<string, unknown>>): string {
  const value = requiredString(data, 'documentId');
  if (value.includes('/')) invalid('El campus no es válido.');
  return value;
}
export function compactCampusName(value: string): string {
  return value.trim().replace(/\s+/gu, ' ');
}
export function normalizeCampusName(value: string): string {
  return compactCampusName(value).toLocaleLowerCase('es-MX');
}
export function normalizeCampusCode(value: string): string {
  return value.trim().toUpperCase();
}
function campusName(data: Readonly<Record<string, unknown>>): string {
  const value = compactCampusName(requiredString(data, 'nombre'));
  if (value.length > 120) invalid('El nombre admite como máximo 120 caracteres.');
  return value;
}
function campusCode(data: Readonly<Record<string, unknown>>): string {
  const value = normalizeCampusCode(requiredString(data, 'clave'));
  if (!/^[A-Z0-9-]{2,10}$/u.test(value)) {
    invalid('La clave debe tener de 2 a 10 letras, números o guiones.');
  }
  return value;
}
function schedule(data: Readonly<Record<string, unknown>>): CampusSchedule {
  const raw = requireObject(data['horariosSistemas']);
  requireAllowed(raw, CAMPUS_DAYS);
  const result = {} as Record<CampusDay, CampusScheduleDay>;
  for (const day of CAMPUS_DAYS) {
    const item = requireObject(raw[day]);
    requireAllowed(item, ['operativo', 'inicio', 'fin']);
    const operativo = requiredBoolean(item, 'operativo');
    const inicio = item['inicio'];
    const fin = item['fin'];
    if (day === 'domingo' && (operativo || inicio !== null || fin !== null)) {
      invalid('Domingo debe permanecer inactivo.');
    }
    if (!operativo) {
      if (inicio !== null || fin !== null) invalid('Un día inactivo no admite horario.');
      result[day] = { operativo: false, inicio: null, fin: null };
      continue;
    }
    if (
      typeof inicio !== 'string' ||
      typeof fin !== 'string' ||
      !/^([01]\d|2[0-3]):[0-5]\d$/u.test(inicio) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/u.test(fin) ||
      fin <= inicio
    ) {
      invalid('Los horarios de Sistemas no son válidos.');
    }
    result[day] = { operativo: true, inicio, fin };
  }
  return result;
}
function hasOperationalDay(value: CampusSchedule): boolean {
  return CAMPUS_DAYS.some((day) => day !== 'domingo' && value[day].operativo);
}
async function requester(
  identity: CampusRequestIdentity | null,
  dependencies: AdminCampusesDependencies,
  adminOnly: boolean,
): Promise<CampusRequestIdentity> {
  if (!identity) {
    throw new AdminCampusesError('unauthenticated', 'unauthenticated', 'Se requiere una sesión.');
  }
  if (!identity.authorized || (adminOnly && identity.role !== 'admin')) {
    throw new AdminCampusesError('permission-denied', 'permission-denied', 'No tiene permisos.');
  }
  const canonical = await dependencies.repository.findCanonicalRequester(identity.uid);
  if (
    !canonical?.activo ||
    (adminOnly ? canonical.role !== 'admin' : !['admin', 'usuario'].includes(canonical.role))
  ) {
    dependencies.logger.warn('Operación de Campus rechazada sin perfil canónico.', {
      requesterUid: identity.uid,
      adminOnly,
    });
    throw new AdminCampusesError('permission-denied', 'permission-denied', 'No tiene permisos.');
  }
  return identity;
}
function capacity(records: readonly ManagedCampusRecord[]): void {
  if (records.length > MAX_SUPPORTED_CAMPUSES) {
    throw new AdminCampusesError(
      'campus-capacity-exceeded',
      'resource-exhausted',
      'La cantidad de campus supera el límite de esta versión.',
    );
  }
}
function mutationInput(data: Readonly<Record<string, unknown>>, includeStatus: boolean) {
  const nombre = campusName(data);
  const horariosSistemas = schedule(data);
  const activo = includeStatus ? requiredBoolean(data, 'activo') : false;
  if (includeStatus && activo && !hasOperationalDay(horariosSistemas)) {
    throw new AdminCampusesError(
      'active-campus-requires-schedule',
      'failed-precondition',
      'Un campus activo requiere al menos un día operativo.',
    );
  }
  return {
    nombre,
    nombreNormalizado: normalizeCampusName(nombre),
    clave: campusCode(data),
    direccion: optionalString(data, 'direccion', 240),
    referencia: optionalString(data, 'referencia', 240),
    horariosSistemas,
    activo,
  };
}

export async function listCampusRecords(
  identity: CampusRequestIdentity | null,
  dependencies: AdminCampusesDependencies,
) {
  await requester(identity, dependencies, true);
  const records = await dependencies.repository.list(MAX_SUPPORTED_CAMPUSES + 1);
  capacity(records);
  const items = [...records].sort(
    (a, b) =>
      a.nombreNormalizado.localeCompare(b.nombreNormalizado, 'es-MX') ||
      a.clave.localeCompare(b.clave),
  );
  return {
    items,
    total: items.length,
    maxSupported: MAX_SUPPORTED_CAMPUSES as 100,
  };
}
export async function listSelectableCampusRecords(
  identity: CampusRequestIdentity | null,
  dependencies: AdminCampusesDependencies,
) {
  await requester(identity, dependencies, false);
  const records = await dependencies.repository.list(MAX_SUPPORTED_CAMPUSES + 1);
  capacity(records);
  const items = records
    .filter((item) => item.activo)
    .sort((a, b) => a.nombreNormalizado.localeCompare(b.nombreNormalizado, 'es-MX'))
    .map((item) => ({
      campusId: item.documentId,
      nombre: item.nombre,
      clave: item.clave,
      direccion: item.direccion,
      referencia: item.referencia,
    }));
  return { items, total: items.length };
}
export async function createCampusRecord(
  identity: CampusRequestIdentity | null,
  data: unknown,
  dependencies: AdminCampusesDependencies,
) {
  const actor = await requester(identity, dependencies, true);
  const request = requireObject(data);
  requireAllowed(request, [
    'nombre',
    'clave',
    'direccion',
    'referencia',
    'horariosSistemas',
    'activo',
  ]);
  const id = await dependencies.repository.create(actor.uid, mutationInput(request, true));
  return { documentId: id, status: 'completed' as const };
}
export async function updateCampusRecord(
  identity: CampusRequestIdentity | null,
  data: unknown,
  dependencies: AdminCampusesDependencies,
) {
  const actor = await requester(identity, dependencies, true);
  const request = requireObject(data);
  requireAllowed(request, [
    'documentId',
    'nombre',
    'clave',
    'direccion',
    'referencia',
    'horariosSistemas',
  ]);
  const id = documentId(request);
  const input = mutationInput(request, false);
  await dependencies.repository.update(actor.uid, { ...input, documentId: id });
  return { documentId: id, status: 'completed' as const };
}
export async function setCampusRecordStatus(
  identity: CampusRequestIdentity | null,
  data: unknown,
  dependencies: AdminCampusesDependencies,
) {
  const actor = await requester(identity, dependencies, true);
  const request = requireObject(data);
  requireAllowed(request, ['documentId', 'activo']);
  const id = documentId(request);
  await dependencies.repository.setStatus(actor.uid, {
    documentId: id,
    activo: requiredBoolean(request, 'activo'),
  });
  return { documentId: id, status: 'completed' as const };
}
export async function deleteCampusRecord(
  identity: CampusRequestIdentity | null,
  data: unknown,
  dependencies: AdminCampusesDependencies,
) {
  const actor = await requester(identity, dependencies, true);
  const request = requireObject(data);
  requireAllowed(request, ['documentId']);
  const id = documentId(request);
  await dependencies.repository.delete(actor.uid, id);
  return { documentId: id, status: 'completed' as const };
}
