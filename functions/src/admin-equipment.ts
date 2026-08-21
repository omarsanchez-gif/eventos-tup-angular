import type { FunctionsErrorCode } from 'firebase-functions/https';

export const MAX_SUPPORTED_EQUIPMENT = 500;
export type EquipmentClassification = 'fijo' | 'transferible';

export interface EquipmentRequestIdentity {
  readonly uid: string;
  readonly authorized: boolean;
  readonly role: unknown;
}
export interface CanonicalEquipmentRequester {
  readonly uid: string;
  readonly role: 'admin' | 'usuario';
  readonly activo: boolean;
}
export interface EquipmentCampusRecord {
  readonly documentId: string;
  readonly nombre: string;
  readonly activo: boolean;
}
export interface ManagedEquipmentRecord {
  readonly documentId: string;
  readonly nombre: string;
  readonly nombreNormalizado: string;
  readonly campusBaseId: string;
  readonly cantidadOperativa: number;
  readonly clasificacion: EquipmentClassification;
  readonly campusDestinoIdsPermitidos: readonly string[];
  readonly activo: boolean;
  readonly utilizado: boolean;
  readonly fechaCreacion: unknown;
  readonly fechaActualizacion: unknown;
}
export interface EquipmentMutationInput {
  readonly nombre: string;
  readonly nombreNormalizado: string;
  readonly campusBaseId: string;
  readonly cantidadOperativa: number;
  readonly clasificacion: EquipmentClassification;
  readonly campusDestinoIdsPermitidos: readonly string[];
  readonly activo: boolean;
}
export interface AdminEquipmentRepository {
  findCanonicalRequester(uid: string): Promise<CanonicalEquipmentRequester | null>;
  list(limit: number): Promise<readonly ManagedEquipmentRecord[]>;
  findCampuses(documentIds: readonly string[]): Promise<readonly EquipmentCampusRecord[]>;
  create(requesterUid: string, input: EquipmentMutationInput): Promise<string>;
  update(
    requesterUid: string,
    input: Omit<EquipmentMutationInput, 'activo'> & Readonly<{ documentId: string }>,
  ): Promise<void>;
  setStatus(requesterUid: string, input: { documentId: string; activo: boolean }): Promise<void>;
  delete(requesterUid: string, documentId: string): Promise<void>;
}
export interface AdminEquipmentDependencies {
  readonly repository: AdminEquipmentRepository;
  readonly logger: {
    warn(message: string, context?: Readonly<Record<string, unknown>>): void;
    error(message: string, context?: Readonly<Record<string, unknown>>): void;
  };
}
export type AdminEquipmentFunctionalCode =
  | 'unauthenticated'
  | 'permission-denied'
  | 'invalid-argument'
  | 'equipment-name-exists'
  | 'equipment-not-found'
  | 'equipment-in-use'
  | 'equipment-base-campus-immutable'
  | 'campus-not-found'
  | 'campus-inactive'
  | 'invalid-destination-campus'
  | 'active-equipment-requires-stock'
  | 'equipment-capacity-exceeded'
  | 'reservation-review-required'
  | 'service-unavailable';

export class AdminEquipmentError extends Error {
  constructor(
    readonly functionalCode: AdminEquipmentFunctionalCode,
    readonly functionsCode: FunctionsErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AdminEquipmentError';
  }
}

function invalid(message: string): never {
  throw new AdminEquipmentError('invalid-argument', 'invalid-argument', message);
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
function documentIdValue(data: Readonly<Record<string, unknown>>, key: string): string {
  const value = requiredString(data, key);
  if (value.includes('/') || value.length > 1500) invalid('La referencia no es válida.');
  return value;
}
function requiredBoolean(data: Readonly<Record<string, unknown>>, key: string): boolean {
  if (typeof data[key] !== 'boolean') invalid('La solicitud no es válida.');
  return data[key] as boolean;
}
function equipmentName(data: Readonly<Record<string, unknown>>): string {
  const value = requiredString(data, 'nombre').replace(/\s+/gu, ' ');
  if (value.length > 120) invalid('El nombre admite como máximo 120 caracteres.');
  return value;
}
export function normalizeEquipmentName(value: string): string {
  return value.trim().replace(/\s+/gu, ' ').toLocaleLowerCase('es-MX');
}
function quantity(data: Readonly<Record<string, unknown>>): number {
  const value = data['cantidadOperativa'];
  if (!Number.isInteger(value) || (value as number) < 0 || (value as number) > 999) {
    invalid('La cantidad operativa debe ser un entero entre 0 y 999.');
  }
  return value as number;
}
function classification(data: Readonly<Record<string, unknown>>): EquipmentClassification {
  const value = data['clasificacion'];
  if (value !== 'fijo' && value !== 'transferible') invalid('La clasificación no es válida.');
  return value;
}
function destinationIds(
  data: Readonly<Record<string, unknown>>,
  baseCampusId: string,
  type: EquipmentClassification,
): readonly string[] {
  const value = data['campusDestinoIdsPermitidos'];
  if (!Array.isArray(value)) invalid('Los destinos no son válidos.');
  const ids = value.map((item) => {
    if (typeof item !== 'string' || !item.trim() || item.includes('/')) {
      invalid('Los destinos no son válidos.');
    }
    return item.trim();
  });
  if (new Set(ids).size !== ids.length || ids.includes(baseCampusId)) {
    throw new AdminEquipmentError(
      'invalid-destination-campus',
      'invalid-argument',
      'Los destinos contienen referencias repetidas o el campus base.',
    );
  }
  if (type === 'fijo' && ids.length > 0) {
    throw new AdminEquipmentError(
      'invalid-destination-campus',
      'invalid-argument',
      'Un equipo fijo no admite destinos.',
    );
  }
  if (type === 'transferible' && ids.length === 0) {
    throw new AdminEquipmentError(
      'invalid-destination-campus',
      'invalid-argument',
      'Un equipo transferible requiere al menos un destino.',
    );
  }
  if (ids.length > 99) invalid('La cantidad de destinos no es válida.');
  return ids;
}
function mutationInput(data: Readonly<Record<string, unknown>>, includeStatus: boolean) {
  const nombre = equipmentName(data);
  const campusBaseId = documentIdValue(data, 'campusBaseId');
  const clasificacion = classification(data);
  const cantidadOperativa = quantity(data);
  const activo = includeStatus ? requiredBoolean(data, 'activo') : false;
  if (includeStatus && activo && cantidadOperativa < 1) {
    throw new AdminEquipmentError(
      'active-equipment-requires-stock',
      'failed-precondition',
      'Un equipo activo requiere al menos una unidad operativa.',
    );
  }
  return {
    nombre,
    nombreNormalizado: normalizeEquipmentName(nombre),
    campusBaseId,
    cantidadOperativa,
    clasificacion,
    campusDestinoIdsPermitidos: destinationIds(data, campusBaseId, clasificacion),
    activo,
  };
}
async function requester(
  identity: EquipmentRequestIdentity | null,
  dependencies: AdminEquipmentDependencies,
  adminOnly: boolean,
): Promise<EquipmentRequestIdentity> {
  if (!identity) {
    throw new AdminEquipmentError('unauthenticated', 'unauthenticated', 'Se requiere una sesión.');
  }
  if (!identity.authorized || (adminOnly && identity.role !== 'admin')) {
    throw new AdminEquipmentError('permission-denied', 'permission-denied', 'No tiene permisos.');
  }
  const canonical = await dependencies.repository.findCanonicalRequester(identity.uid);
  if (
    !canonical?.activo ||
    (adminOnly ? canonical.role !== 'admin' : !['admin', 'usuario'].includes(canonical.role))
  ) {
    dependencies.logger.warn('Operación de Equipos rechazada sin perfil canónico.', {
      requesterUid: identity.uid,
      adminOnly,
    });
    throw new AdminEquipmentError('permission-denied', 'permission-denied', 'No tiene permisos.');
  }
  return identity;
}
function capacity(records: readonly ManagedEquipmentRecord[]): void {
  if (records.length > MAX_SUPPORTED_EQUIPMENT) {
    throw new AdminEquipmentError(
      'equipment-capacity-exceeded',
      'resource-exhausted',
      'La cantidad de equipos supera el límite de esta versión.',
    );
  }
}

export async function listEquipmentRecords(
  identity: EquipmentRequestIdentity | null,
  dependencies: AdminEquipmentDependencies,
) {
  await requester(identity, dependencies, true);
  const records = await dependencies.repository.list(MAX_SUPPORTED_EQUIPMENT + 1);
  capacity(records);
  const items = [...records].sort(
    (a, b) =>
      a.nombreNormalizado.localeCompare(b.nombreNormalizado, 'es-MX') ||
      a.campusBaseId.localeCompare(b.campusBaseId),
  );
  return { items, total: items.length, maxSupported: MAX_SUPPORTED_EQUIPMENT as 500 };
}

export async function listSelectableEquipmentRecords(
  identity: EquipmentRequestIdentity | null,
  dependencies: AdminEquipmentDependencies,
) {
  await requester(identity, dependencies, false);
  const records = await dependencies.repository.list(MAX_SUPPORTED_EQUIPMENT + 1);
  capacity(records);
  const ids = [
    ...new Set(records.flatMap((item) => [item.campusBaseId, ...item.campusDestinoIdsPermitidos])),
  ];
  const activeCampusIds = new Set(
    (await dependencies.repository.findCampuses(ids))
      .filter((campus) => campus.activo)
      .map((campus) => campus.documentId),
  );
  const items = records
    .filter((item) => item.activo && activeCampusIds.has(item.campusBaseId))
    .map((item) => ({
      equipoId: item.documentId,
      nombre: item.nombre,
      campusBaseId: item.campusBaseId,
      clasificacion: item.clasificacion,
      campusDestinoIdsPermitidos: item.campusDestinoIdsPermitidos.filter((id) =>
        activeCampusIds.has(id),
      ),
    }))
    .filter((item) => item.clasificacion === 'fijo' || item.campusDestinoIdsPermitidos.length > 0)
    .sort(
      (a, b) =>
        a.nombre.localeCompare(b.nombre, 'es-MX') || a.campusBaseId.localeCompare(b.campusBaseId),
    );
  return { items, total: items.length };
}

export async function createEquipmentRecord(
  identity: EquipmentRequestIdentity | null,
  data: unknown,
  dependencies: AdminEquipmentDependencies,
) {
  const actor = await requester(identity, dependencies, true);
  const request = requireObject(data);
  requireAllowed(request, [
    'nombre',
    'campusBaseId',
    'cantidadOperativa',
    'clasificacion',
    'campusDestinoIdsPermitidos',
    'activo',
  ]);
  const id = await dependencies.repository.create(actor.uid, mutationInput(request, true));
  return { documentId: id, status: 'completed' as const };
}

export async function updateEquipmentRecord(
  identity: EquipmentRequestIdentity | null,
  data: unknown,
  dependencies: AdminEquipmentDependencies,
) {
  const actor = await requester(identity, dependencies, true);
  const request = requireObject(data);
  requireAllowed(request, [
    'documentId',
    'nombre',
    'campusBaseId',
    'cantidadOperativa',
    'clasificacion',
    'campusDestinoIdsPermitidos',
  ]);
  const documentId = documentIdValue(request, 'documentId');
  const input = mutationInput(request, false);
  await dependencies.repository.update(actor.uid, { ...input, documentId });
  return { documentId, status: 'completed' as const };
}

export async function setEquipmentRecordStatus(
  identity: EquipmentRequestIdentity | null,
  data: unknown,
  dependencies: AdminEquipmentDependencies,
) {
  const actor = await requester(identity, dependencies, true);
  const request = requireObject(data);
  requireAllowed(request, ['documentId', 'activo']);
  const documentId = documentIdValue(request, 'documentId');
  await dependencies.repository.setStatus(actor.uid, {
    documentId,
    activo: requiredBoolean(request, 'activo'),
  });
  return { documentId, status: 'completed' as const };
}

export async function deleteEquipmentRecord(
  identity: EquipmentRequestIdentity | null,
  data: unknown,
  dependencies: AdminEquipmentDependencies,
) {
  const actor = await requester(identity, dependencies, true);
  const request = requireObject(data);
  requireAllowed(request, ['documentId']);
  const documentId = documentIdValue(request, 'documentId');
  await dependencies.repository.delete(actor.uid, documentId);
  return { documentId, status: 'completed' as const };
}
