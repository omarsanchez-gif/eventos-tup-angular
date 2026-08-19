import type { FunctionsErrorCode } from 'firebase-functions/https';

export const MAX_SUPPORTED_COORDINATIONS = 500;
export const MAX_COORDINATION_EMAILS = 10;

export type CoordinationRequesterRole = 'admin' | 'usuario';

export interface CoordinationRequestIdentity {
  readonly uid: string;
  readonly authorized: boolean;
  readonly role: unknown;
}

export interface CanonicalCoordinationRequester {
  readonly uid: string;
  readonly role: CoordinationRequesterRole;
  readonly activo: boolean;
}

export interface ManagedCoordinationRecord {
  readonly documentId: string;
  readonly nombre: string;
  readonly nombreNormalizado: string;
  readonly correos: readonly string[];
  readonly activo: boolean;
  readonly utilizada: boolean;
  readonly fechaCreacion: unknown;
  readonly fechaActualizacion: unknown;
}

export interface CoordinationMutationInput {
  readonly nombre: string;
  readonly nombreNormalizado: string;
  readonly correos: readonly string[];
  readonly activo: boolean;
}

export interface AdminCoordinationsRepository {
  findCanonicalRequester(uid: string): Promise<CanonicalCoordinationRequester | null>;
  list(limit: number): Promise<readonly ManagedCoordinationRecord[]>;
  create(requesterUid: string, input: CoordinationMutationInput): Promise<string>;
  update(
    requesterUid: string,
    input: Omit<CoordinationMutationInput, 'activo'> & Readonly<{ documentId: string }>,
  ): Promise<void>;
  setStatus(
    requesterUid: string,
    input: Readonly<{ documentId: string; activo: boolean }>,
  ): Promise<void>;
  delete(requesterUid: string, documentId: string): Promise<void>;
}

export interface AdminCoordinationsLogger {
  warn(message: string, context?: Readonly<Record<string, unknown>>): void;
  error(message: string, context?: Readonly<Record<string, unknown>>): void;
}

export interface AdminCoordinationsDependencies {
  readonly repository: AdminCoordinationsRepository;
  readonly logger: AdminCoordinationsLogger;
  readonly institutionalDomain: string;
}

export type AdminCoordinationsFunctionalCode =
  | 'unauthenticated'
  | 'permission-denied'
  | 'invalid-argument'
  | 'domain-not-allowed'
  | 'duplicate-email'
  | 'email-capacity-exceeded'
  | 'coordination-name-exists'
  | 'coordination-not-found'
  | 'coordination-in-use'
  | 'active-coordination-requires-email'
  | 'coordination-capacity-exceeded'
  | 'service-unavailable';

export class AdminCoordinationsError extends Error {
  constructor(
    readonly functionalCode: AdminCoordinationsFunctionalCode,
    readonly functionsCode: FunctionsErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AdminCoordinationsError';
  }
}

export interface CoordinationsListResult {
  readonly items: readonly ManagedCoordinationRecord[];
  readonly total: number;
  readonly maxSupported: typeof MAX_SUPPORTED_COORDINATIONS;
}

export interface SelectableCoordinationsListResult {
  readonly items: readonly Readonly<{
    coordinacionId: string;
    nombre: string;
  }>[];
  readonly total: number;
}

export interface CompletedCoordinationMutationResult {
  readonly documentId: string;
  readonly status: 'completed';
}

function normalizeDomain(domain: string): string {
  return domain.trim().toLowerCase().replace(/^@/, '');
}

export function compactCoordinationName(name: string): string {
  return name.trim().replace(/\s+/gu, ' ');
}

export function normalizeCoordinationName(name: string): string {
  return compactCoordinationName(name).toLocaleLowerCase('es-MX');
}

function requireObject(data: unknown): Readonly<Record<string, unknown>> {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new AdminCoordinationsError(
      'invalid-argument',
      'invalid-argument',
      'La solicitud no es válida.',
    );
  }
  return data as Readonly<Record<string, unknown>>;
}

function requireAllowedFields(
  data: Readonly<Record<string, unknown>>,
  allowedFields: readonly string[],
): void {
  if (Object.keys(data).some((key) => !allowedFields.includes(key))) {
    throw new AdminCoordinationsError(
      'invalid-argument',
      'invalid-argument',
      'La solicitud contiene campos no permitidos.',
    );
  }
}

function requireString(data: Readonly<Record<string, unknown>>, key: string): string {
  const value = data[key];
  if (typeof value !== 'string' || !value.trim()) {
    throw new AdminCoordinationsError(
      'invalid-argument',
      'invalid-argument',
      'Faltan datos obligatorios.',
    );
  }
  return value;
}

function requireName(data: Readonly<Record<string, unknown>>): string {
  const name = compactCoordinationName(requireString(data, 'nombre'));
  if (!name) {
    throw new AdminCoordinationsError(
      'invalid-argument',
      'invalid-argument',
      'Capture el nombre de la coordinación.',
    );
  }
  return name;
}

function requireBoolean(data: Readonly<Record<string, unknown>>, key: string): boolean {
  const value = data[key];
  if (typeof value !== 'boolean') {
    throw new AdminCoordinationsError(
      'invalid-argument',
      'invalid-argument',
      'La solicitud no es válida.',
    );
  }
  return value;
}

function requireDocumentId(data: Readonly<Record<string, unknown>>): string {
  const documentId = requireString(data, 'documentId').trim();
  if (documentId.includes('/')) {
    throw new AdminCoordinationsError(
      'invalid-argument',
      'invalid-argument',
      'La coordinación no es válida.',
    );
  }
  return documentId;
}

function requireEmails(
  data: Readonly<Record<string, unknown>>,
  institutionalDomain: string,
): readonly string[] {
  const value = data['correos'];
  if (!Array.isArray(value)) {
    throw new AdminCoordinationsError(
      'invalid-argument',
      'invalid-argument',
      'La lista de correos no es válida.',
    );
  }
  if (value.length > MAX_COORDINATION_EMAILS) {
    throw new AdminCoordinationsError(
      'email-capacity-exceeded',
      'resource-exhausted',
      'Cada coordinación admite como máximo 10 correos.',
    );
  }

  const domain = normalizeDomain(institutionalDomain);
  const emails = value.map((candidate) => {
    if (typeof candidate !== 'string') {
      throw new AdminCoordinationsError(
        'invalid-argument',
        'invalid-argument',
        'La lista de correos no es válida.',
      );
    }
    const email = candidate.trim().toLowerCase();
    const separator = email.lastIndexOf('@');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) {
      throw new AdminCoordinationsError(
        'invalid-argument',
        'invalid-argument',
        'Uno de los correos no es válido.',
      );
    }
    if (!domain || separator < 1 || email.slice(separator + 1) !== domain) {
      throw new AdminCoordinationsError(
        'domain-not-allowed',
        'permission-denied',
        'Todos los correos deben pertenecer al dominio institucional.',
      );
    }
    return email;
  });

  if (new Set(emails).size !== emails.length) {
    throw new AdminCoordinationsError(
      'duplicate-email',
      'already-exists',
      'No se permiten correos duplicados.',
    );
  }
  return emails;
}

async function requireCanonicalRequester(
  identity: CoordinationRequestIdentity | null,
  dependencies: AdminCoordinationsDependencies,
  adminOnly: boolean,
): Promise<CoordinationRequestIdentity> {
  if (!identity) {
    throw new AdminCoordinationsError(
      'unauthenticated',
      'unauthenticated',
      'Se requiere una sesión autenticada.',
    );
  }
  if (!identity.authorized || (adminOnly && identity.role !== 'admin')) {
    throw new AdminCoordinationsError(
      'permission-denied',
      'permission-denied',
      'No tiene permisos para consultar Coordinaciones.',
    );
  }

  const canonical = await dependencies.repository.findCanonicalRequester(identity.uid);
  const hasCanonicalAccess =
    canonical?.activo === true &&
    (canonical.role === 'admin' || (!adminOnly && canonical.role === 'usuario'));
  if (!hasCanonicalAccess || (adminOnly && canonical?.role !== 'admin')) {
    dependencies.logger.warn('Se rechazó una operación de Coordinaciones sin perfil canónico.', {
      requesterUid: identity.uid,
      adminOnly,
    });
    throw new AdminCoordinationsError(
      'permission-denied',
      'permission-denied',
      'No tiene permisos para consultar Coordinaciones.',
    );
  }
  return identity;
}

function requireCapacity(records: readonly ManagedCoordinationRecord[]): void {
  if (records.length > MAX_SUPPORTED_COORDINATIONS) {
    throw new AdminCoordinationsError(
      'coordination-capacity-exceeded',
      'resource-exhausted',
      'La cantidad de coordinaciones supera el límite de esta versión.',
    );
  }
}

export async function listCoordinationRecords(
  identity: CoordinationRequestIdentity | null,
  dependencies: AdminCoordinationsDependencies,
): Promise<CoordinationsListResult> {
  await requireCanonicalRequester(identity, dependencies, true);
  const records = await dependencies.repository.list(MAX_SUPPORTED_COORDINATIONS + 1);
  requireCapacity(records);
  const items = [...records].sort(
    (left, right) =>
      left.nombreNormalizado.localeCompare(right.nombreNormalizado, 'es-MX') ||
      left.documentId.localeCompare(right.documentId),
  );
  return {
    items,
    total: items.length,
    maxSupported: MAX_SUPPORTED_COORDINATIONS,
  };
}

export async function listSelectableCoordinationRecords(
  identity: CoordinationRequestIdentity | null,
  dependencies: AdminCoordinationsDependencies,
): Promise<SelectableCoordinationsListResult> {
  await requireCanonicalRequester(identity, dependencies, false);
  const records = await dependencies.repository.list(MAX_SUPPORTED_COORDINATIONS + 1);
  requireCapacity(records);
  const items = records
    .filter((record) => record.activo)
    .sort(
      (left, right) =>
        left.nombreNormalizado.localeCompare(right.nombreNormalizado, 'es-MX') ||
        left.documentId.localeCompare(right.documentId),
    )
    .map((record) => ({
      coordinacionId: record.documentId,
      nombre: record.nombre,
    }));
  return { items, total: items.length };
}

export async function createCoordinationRecord(
  identity: CoordinationRequestIdentity | null,
  data: unknown,
  dependencies: AdminCoordinationsDependencies,
): Promise<CompletedCoordinationMutationResult> {
  const requester = await requireCanonicalRequester(identity, dependencies, true);
  const request = requireObject(data);
  requireAllowedFields(request, ['nombre', 'correos', 'activo']);
  const nombre = requireName(request);
  const correos = requireEmails(request, dependencies.institutionalDomain);
  const activo = requireBoolean(request, 'activo');
  if (activo && correos.length === 0) {
    throw new AdminCoordinationsError(
      'active-coordination-requires-email',
      'failed-precondition',
      'Una coordinación activa requiere al menos un correo.',
    );
  }
  const documentId = await dependencies.repository.create(requester.uid, {
    nombre,
    nombreNormalizado: normalizeCoordinationName(nombre),
    correos,
    activo,
  });
  return { documentId, status: 'completed' };
}

export async function updateCoordinationRecord(
  identity: CoordinationRequestIdentity | null,
  data: unknown,
  dependencies: AdminCoordinationsDependencies,
): Promise<CompletedCoordinationMutationResult> {
  const requester = await requireCanonicalRequester(identity, dependencies, true);
  const request = requireObject(data);
  requireAllowedFields(request, ['documentId', 'nombre', 'correos']);
  const documentId = requireDocumentId(request);
  const nombre = requireName(request);
  const correos = requireEmails(request, dependencies.institutionalDomain);
  await dependencies.repository.update(requester.uid, {
    documentId,
    nombre,
    nombreNormalizado: normalizeCoordinationName(nombre),
    correos,
  });
  return { documentId, status: 'completed' };
}

export async function setCoordinationRecordStatus(
  identity: CoordinationRequestIdentity | null,
  data: unknown,
  dependencies: AdminCoordinationsDependencies,
): Promise<CompletedCoordinationMutationResult> {
  const requester = await requireCanonicalRequester(identity, dependencies, true);
  const request = requireObject(data);
  requireAllowedFields(request, ['documentId', 'activo']);
  const documentId = requireDocumentId(request);
  await dependencies.repository.setStatus(requester.uid, {
    documentId,
    activo: requireBoolean(request, 'activo'),
  });
  return { documentId, status: 'completed' };
}

export async function deleteCoordinationRecord(
  identity: CoordinationRequestIdentity | null,
  data: unknown,
  dependencies: AdminCoordinationsDependencies,
): Promise<CompletedCoordinationMutationResult> {
  const requester = await requireCanonicalRequester(identity, dependencies, true);
  const request = requireObject(data);
  requireAllowedFields(request, ['documentId']);
  const documentId = requireDocumentId(request);
  await dependencies.repository.delete(requester.uid, documentId);
  return { documentId, status: 'completed' };
}
