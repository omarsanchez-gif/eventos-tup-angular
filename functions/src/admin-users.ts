import type { FunctionsErrorCode } from 'firebase-functions/https';

import type { UserRole } from './bootstrap-authorization.js';

export const MAX_SUPPORTED_USERS = 500;

export interface AdminRequestIdentity {
  readonly uid: string;
  readonly authorized: boolean;
  readonly role: unknown;
}

export interface ManagedUserRecord {
  readonly documentId: string;
  readonly uid: string | null;
  readonly nombre: string;
  readonly correo: string;
  readonly rol: UserRole;
  readonly activo: boolean;
  readonly fechaCreacion: unknown;
  readonly ultimoAcceso: unknown | null;
}

export interface UserMutationResult {
  readonly previous: ManagedUserRecord;
  readonly current: ManagedUserRecord;
}

export interface AdminUsersRepository {
  findCanonicalAdmin(uid: string): Promise<ManagedUserRecord | null>;
  list(limit: number): Promise<readonly ManagedUserRecord[]>;
  create(
    requesterUid: string,
    input: Readonly<{
      nombre: string;
      correo: string;
      rol: UserRole;
      activo: boolean;
    }>,
  ): Promise<string>;
  update(
    requesterUid: string,
    input: Readonly<{
      documentId: string;
      nombre: string;
      correo: string;
      rol: UserRole;
    }>,
  ): Promise<UserMutationResult>;
  setStatus(
    requesterUid: string,
    input: Readonly<{ documentId: string; activo: boolean }>,
  ): Promise<UserMutationResult>;
  prepareDeletion(requesterUid: string, documentId: string): Promise<UserMutationResult>;
  completeDeletion(requesterUid: string, documentId: string): Promise<void>;
}

export interface AdminClaimsAdministrator {
  setClaims(
    uid: string,
    claims: Readonly<{ authorized: boolean; role: UserRole | null }>,
  ): Promise<void>;
  revokeRefreshTokens(uid: string): Promise<void>;
}

export interface AdminUsersLogger {
  warn(message: string, context?: Readonly<Record<string, unknown>>): void;
  error(message: string, context?: Readonly<Record<string, unknown>>): void;
}

export interface AdminUsersDependencies {
  readonly repository: AdminUsersRepository;
  readonly claims: AdminClaimsAdministrator;
  readonly logger: AdminUsersLogger;
  readonly institutionalDomain: string;
}

export type AdminUsersFunctionalCode =
  | 'unauthenticated'
  | 'permission-denied'
  | 'invalid-argument'
  | 'domain-not-allowed'
  | 'email-already-exists'
  | 'user-not-found'
  | 'self-delete-forbidden'
  | 'self-status-change-forbidden'
  | 'last-admin-required'
  | 'uid-bound-email-change-forbidden'
  | 'invalid-role'
  | 'user-capacity-exceeded'
  | 'reconciliation-required'
  | 'service-unavailable';

export class AdminUsersError extends Error {
  constructor(
    readonly functionalCode: AdminUsersFunctionalCode,
    readonly functionsCode: FunctionsErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AdminUsersError';
  }
}

export interface ListAuthorizedUsersResult {
  readonly items: readonly ManagedUserRecord[];
  readonly total: number;
  readonly maxSupported: typeof MAX_SUPPORTED_USERS;
}

export interface CompletedMutationResult {
  readonly documentId: string;
  readonly status: 'completed';
}

function normalizeDomain(domain: string): string {
  return domain.trim().toLowerCase().replace(/^@/, '');
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function requireObject(data: unknown): Readonly<Record<string, unknown>> {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new AdminUsersError('invalid-argument', 'invalid-argument', 'La solicitud no es válida.');
  }
  return data as Readonly<Record<string, unknown>>;
}

function requireAllowedFields(
  data: Readonly<Record<string, unknown>>,
  allowedFields: readonly string[],
): void {
  if (Object.keys(data).some((key) => !allowedFields.includes(key))) {
    throw new AdminUsersError(
      'invalid-argument',
      'invalid-argument',
      'La solicitud contiene campos no permitidos.',
    );
  }
}

function requireString(data: Readonly<Record<string, unknown>>, key: string): string {
  const value = data[key];
  if (typeof value !== 'string' || !value.trim()) {
    throw new AdminUsersError('invalid-argument', 'invalid-argument', 'Faltan datos obligatorios.');
  }
  return value.trim();
}

function requireBoolean(data: Readonly<Record<string, unknown>>, key: string): boolean {
  const value = data[key];
  if (typeof value !== 'boolean') {
    throw new AdminUsersError('invalid-argument', 'invalid-argument', 'La solicitud no es válida.');
  }
  return value;
}

function requireRole(value: unknown): UserRole {
  if (value !== 'admin' && value !== 'usuario') {
    throw new AdminUsersError('invalid-role', 'invalid-argument', 'El rol no es válido.');
  }
  return value;
}

function requireEmail(value: string, institutionalDomain: string): string {
  const email = normalizeEmail(value);
  const domain = normalizeDomain(institutionalDomain);
  const separator = email.lastIndexOf('@');
  const hasEmailShape = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email);

  if (!hasEmailShape) {
    throw new AdminUsersError('invalid-argument', 'invalid-argument', 'El correo no es válido.');
  }
  if (!domain || separator < 1 || email.slice(separator + 1) !== domain) {
    throw new AdminUsersError(
      'domain-not-allowed',
      'permission-denied',
      'El correo debe pertenecer al dominio institucional.',
    );
  }
  return email;
}

function requireDocumentId(data: Readonly<Record<string, unknown>>): string {
  const documentId = requireString(data, 'documentId');
  if (documentId.includes('/')) {
    throw new AdminUsersError('invalid-argument', 'invalid-argument', 'El usuario no es válido.');
  }
  return documentId;
}

async function requireAdmin(
  identity: AdminRequestIdentity | null,
  dependencies: AdminUsersDependencies,
): Promise<AdminRequestIdentity> {
  if (!identity) {
    throw new AdminUsersError(
      'unauthenticated',
      'unauthenticated',
      'Se requiere una sesión autenticada.',
    );
  }
  if (!identity.authorized || identity.role !== 'admin') {
    throw new AdminUsersError(
      'permission-denied',
      'permission-denied',
      'No tiene permisos para administrar usuarios.',
    );
  }

  const canonical = await dependencies.repository.findCanonicalAdmin(identity.uid);
  if (!canonical) {
    dependencies.logger.warn('Se rechazó una operación administrativa sin perfil canónico.', {
      requesterUid: identity.uid,
    });
    throw new AdminUsersError(
      'permission-denied',
      'permission-denied',
      'No tiene permisos para administrar usuarios.',
    );
  }
  return identity;
}

function reconciliationError(
  dependencies: AdminUsersDependencies,
  documentId: string,
  stage: string,
  cause: unknown,
): AdminUsersError {
  dependencies.logger.error('Una operación de Usuarios requiere reconciliación.', {
    documentId,
    stage,
    cause: cause instanceof Error ? cause.name : 'unknown',
  });
  return new AdminUsersError(
    'reconciliation-required',
    'failed-precondition',
    'El estado se guardó, pero la autorización requiere reconciliación. Reintente la operación.',
  );
}

export async function listAuthorizedUsers(
  identity: AdminRequestIdentity | null,
  dependencies: AdminUsersDependencies,
): Promise<ListAuthorizedUsersResult> {
  await requireAdmin(identity, dependencies);
  const users = await dependencies.repository.list(MAX_SUPPORTED_USERS + 1);
  if (users.length > MAX_SUPPORTED_USERS) {
    throw new AdminUsersError(
      'user-capacity-exceeded',
      'resource-exhausted',
      'La cantidad de usuarios supera el límite de esta versión.',
    );
  }

  const items = [...users].sort((left, right) => {
    const byName = left.nombre.localeCompare(right.nombre, 'es-MX', {
      sensitivity: 'base',
    });
    return byName || left.documentId.localeCompare(right.documentId);
  });
  return { items, total: items.length, maxSupported: MAX_SUPPORTED_USERS };
}

export async function createAuthorizedUser(
  identity: AdminRequestIdentity | null,
  data: unknown,
  dependencies: AdminUsersDependencies,
): Promise<CompletedMutationResult> {
  const requester = await requireAdmin(identity, dependencies);
  const request = requireObject(data);
  requireAllowedFields(request, ['nombre', 'correo', 'rol', 'activo']);
  const nombre = requireString(request, 'nombre');
  const correo = requireEmail(requireString(request, 'correo'), dependencies.institutionalDomain);
  const rol = requireRole(request['rol']);
  const activo = requireBoolean(request, 'activo');
  const documentId = await dependencies.repository.create(requester.uid, {
    nombre,
    correo,
    rol,
    activo,
  });
  return { documentId, status: 'completed' };
}

export async function updateAuthorizedUser(
  identity: AdminRequestIdentity | null,
  data: unknown,
  dependencies: AdminUsersDependencies,
): Promise<CompletedMutationResult> {
  const requester = await requireAdmin(identity, dependencies);
  const request = requireObject(data);
  requireAllowedFields(request, ['documentId', 'nombre', 'correo', 'rol']);
  const input = {
    documentId: requireDocumentId(request),
    nombre: requireString(request, 'nombre'),
    correo: requireEmail(requireString(request, 'correo'), dependencies.institutionalDomain),
    rol: requireRole(request['rol']),
  } as const;
  const mutation = await dependencies.repository.update(requester.uid, input);

  if (mutation.current.uid) {
    try {
      await dependencies.claims.setClaims(mutation.current.uid, {
        authorized: mutation.current.activo,
        role: mutation.current.activo ? mutation.current.rol : null,
      });
      if (mutation.current.rol === 'usuario') {
        await dependencies.claims.revokeRefreshTokens(mutation.current.uid);
      }
    } catch (error) {
      throw reconciliationError(dependencies, input.documentId, 'claims-or-revocation', error);
    }
  }
  return { documentId: input.documentId, status: 'completed' };
}

export async function setAuthorizedUserStatus(
  identity: AdminRequestIdentity | null,
  data: unknown,
  dependencies: AdminUsersDependencies,
): Promise<CompletedMutationResult> {
  const requester = await requireAdmin(identity, dependencies);
  const request = requireObject(data);
  requireAllowedFields(request, ['documentId', 'activo']);
  const input = {
    documentId: requireDocumentId(request),
    activo: requireBoolean(request, 'activo'),
  } as const;
  const mutation = await dependencies.repository.setStatus(requester.uid, input);

  if (mutation.current.uid) {
    try {
      await dependencies.claims.setClaims(mutation.current.uid, {
        authorized: mutation.current.activo,
        role: mutation.current.activo ? mutation.current.rol : null,
      });
      if (!mutation.current.activo) {
        await dependencies.claims.revokeRefreshTokens(mutation.current.uid);
      }
    } catch (error) {
      throw reconciliationError(dependencies, input.documentId, 'claims-or-revocation', error);
    }
  }
  return { documentId: input.documentId, status: 'completed' };
}

export async function deleteAuthorizedUser(
  identity: AdminRequestIdentity | null,
  data: unknown,
  dependencies: AdminUsersDependencies,
): Promise<CompletedMutationResult> {
  const requester = await requireAdmin(identity, dependencies);
  const request = requireObject(data);
  requireAllowedFields(request, ['documentId']);
  const documentId = requireDocumentId(request);
  const mutation = await dependencies.repository.prepareDeletion(requester.uid, documentId);

  try {
    if (mutation.current.uid) {
      await dependencies.claims.setClaims(mutation.current.uid, {
        authorized: false,
        role: null,
      });
      await dependencies.claims.revokeRefreshTokens(mutation.current.uid);
    }
    await dependencies.repository.completeDeletion(requester.uid, documentId);
  } catch (error) {
    throw reconciliationError(dependencies, documentId, 'claims-revocation-or-delete', error);
  }
  return { documentId, status: 'completed' };
}
