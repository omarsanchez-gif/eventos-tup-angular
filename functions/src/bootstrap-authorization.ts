import type { FunctionsErrorCode } from 'firebase-functions/https';

export type UserRole = 'admin' | 'usuario';

export interface AuthorizationIdentity {
  readonly uid: string;
  readonly email: string | null;
  readonly emailVerified: boolean;
}

export interface AuthorizedUserRecord {
  readonly id: string;
  readonly uid: string | null;
  readonly nombre: string;
  readonly correo: string;
  readonly rol: unknown;
  readonly activo: boolean;
}

export interface CanonicalUserRecord extends AuthorizedUserRecord {
  readonly uid: string;
  readonly rol: UserRole;
  readonly activo: true;
}

export interface AuthorizationRepository {
  findByEmail(email: string): Promise<readonly AuthorizedUserRecord[]>;
  recordSuccessfulAccess(
    record: AuthorizedUserRecord,
    authenticatedUid: string,
  ): Promise<CanonicalUserRecord>;
}

export interface ClaimsAdministrator {
  getClaims(uid: string): Promise<Readonly<Record<string, unknown>>>;
  setClaims(
    uid: string,
    claims: Readonly<{ authorized: boolean; role: UserRole | null }>,
  ): Promise<void>;
  revokeRefreshTokens(uid: string): Promise<void>;
}

export interface AuthorizationLogger {
  warn(message: string, context?: Readonly<Record<string, unknown>>): void;
  error(message: string, context?: Readonly<Record<string, unknown>>): void;
}

export interface AuthorizationDependencies {
  readonly repository: AuthorizationRepository;
  readonly claims: ClaimsAdministrator;
  readonly logger: AuthorizationLogger;
  readonly institutionalDomain: string;
}

export interface BootstrapAuthorizationResult {
  readonly uid: string;
  readonly nombre: string;
  readonly correo: string;
  readonly rol: UserRole;
  readonly activo: true;
  readonly claimsUpdated: boolean;
}

export type FunctionalAuthorizationCode =
  | 'unauthenticated'
  | 'domain-not-allowed'
  | 'user-not-authorized'
  | 'user-inactive'
  | 'uid-conflict'
  | 'invalid-role'
  | 'service-unavailable';

export class AuthorizationError extends Error {
  constructor(
    readonly functionalCode: FunctionalAuthorizationCode,
    readonly functionsCode: FunctionsErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

function isUserRole(role: unknown): role is UserRole {
  return role === 'admin' || role === 'usuario';
}

function normalizedDomain(domain: string): string {
  return domain.trim().toLowerCase().replace(/^@/, '');
}

function normalizedEmail(email: string): string {
  return email.trim().toLowerCase();
}

function emailBelongsToDomain(email: string, domain: string): boolean {
  const separator = email.lastIndexOf('@');
  return separator > 0 && email.slice(separator + 1) === domain;
}

async function denyAccess(
  uid: string,
  error: AuthorizationError,
  dependencies: AuthorizationDependencies,
): Promise<void> {
  try {
    await dependencies.claims.setClaims(uid, { authorized: false, role: null });
    if (error.functionalCode === 'user-inactive') {
      await dependencies.claims.revokeRefreshTokens(uid);
    }
  } catch (claimError) {
    dependencies.logger.error('No fue posible retirar la autorización.', {
      uid,
      cause: claimError instanceof Error ? claimError.name : 'unknown',
    });
  }
}

export async function bootstrapAuthorization(
  identity: AuthorizationIdentity | null,
  dependencies: AuthorizationDependencies,
): Promise<BootstrapAuthorizationResult> {
  if (!identity) {
    throw new AuthorizationError(
      'unauthenticated',
      'unauthenticated',
      'Se requiere una sesión autenticada.',
    );
  }

  try {
    if (!identity.email || !identity.emailVerified) {
      throw new AuthorizationError(
        'domain-not-allowed',
        'permission-denied',
        'El correo debe estar verificado.',
      );
    }

    const email = normalizedEmail(identity.email);
    const domain = normalizedDomain(dependencies.institutionalDomain);
    if (!domain || !emailBelongsToDomain(email, domain)) {
      throw new AuthorizationError(
        'domain-not-allowed',
        'permission-denied',
        'El dominio no está permitido.',
      );
    }

    const records = await dependencies.repository.findByEmail(email);
    if (records.length !== 1) {
      dependencies.logger.warn('La autorización no resolvió un usuario único.', {
        uid: identity.uid,
        matches: records.length,
      });
      throw new AuthorizationError(
        'user-not-authorized',
        'permission-denied',
        'El usuario no está autorizado.',
      );
    }

    const record = records[0];
    if (!record) {
      throw new AuthorizationError(
        'user-not-authorized',
        'permission-denied',
        'El usuario no está autorizado.',
      );
    }

    if (!record.activo) {
      throw new AuthorizationError(
        'user-inactive',
        'permission-denied',
        'El usuario está inactivo.',
      );
    }

    if (!isUserRole(record.rol)) {
      throw new AuthorizationError('invalid-role', 'permission-denied', 'El rol no es válido.');
    }

    if (record.uid !== null && record.uid !== identity.uid) {
      dependencies.logger.warn('Se detectó un conflicto de UID.', {
        authenticatedUid: identity.uid,
        userDocumentId: record.id,
      });
      throw new AuthorizationError(
        'uid-conflict',
        'permission-denied',
        'El UID no corresponde al usuario autorizado.',
      );
    }

    const canonical = await dependencies.repository.recordSuccessfulAccess(record, identity.uid);
    const currentClaims = await dependencies.claims.getClaims(identity.uid);
    const claimsUpdated =
      currentClaims['authorized'] !== true || currentClaims['role'] !== canonical.rol;

    if (claimsUpdated) {
      await dependencies.claims.setClaims(identity.uid, {
        authorized: true,
        role: canonical.rol,
      });
    }

    return {
      uid: identity.uid,
      nombre: canonical.nombre,
      correo: canonical.correo,
      rol: canonical.rol,
      activo: true,
      claimsUpdated,
    };
  } catch (error) {
    if (error instanceof AuthorizationError) {
      await denyAccess(identity.uid, error, dependencies);
      throw error;
    }

    dependencies.logger.error('Falló el bootstrap de autorización.', {
      uid: identity.uid,
      cause: error instanceof Error ? error.name : 'unknown',
    });
    throw new AuthorizationError(
      'service-unavailable',
      'unavailable',
      'El servicio de autorización no está disponible.',
    );
  }
}
