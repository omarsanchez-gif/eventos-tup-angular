import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AuthorizationError,
  bootstrapAuthorization,
  type AuthorizationDependencies,
  type AuthorizedUserRecord,
} from './bootstrap-authorization.js';

const identity = {
  uid: 'firebase-uid',
  email: 'persona@institucion.test',
  emailVerified: true,
} as const;

const activeUser: AuthorizedUserRecord = {
  id: 'user-document',
  uid: null,
  nombre: 'Persona Autorizada',
  correo: 'persona@institucion.test',
  rol: 'usuario',
  activo: true,
};

function createDependencies(
  records: readonly AuthorizedUserRecord[] = [activeUser],
): AuthorizationDependencies {
  return {
    institutionalDomain: 'institucion.test',
    logger: { warn: vi.fn(), error: vi.fn() },
    repository: {
      findByEmail: vi.fn().mockResolvedValue(records),
      recordSuccessfulAccess: vi.fn().mockImplementation(async (record) => ({
        ...record,
        uid: identity.uid,
        rol: record.rol as 'admin' | 'usuario',
        activo: true as const,
      })),
    },
    claims: {
      getClaims: vi.fn().mockResolvedValue({}),
      setClaims: vi.fn().mockResolvedValue(undefined),
      revokeRefreshTokens: vi.fn().mockResolvedValue(undefined),
    },
  };
}

async function expectFunctionalError(
  promise: Promise<unknown>,
  functionalCode: AuthorizationError['functionalCode'],
): Promise<void> {
  await expect(promise).rejects.toMatchObject({ functionalCode });
}

describe('bootstrapAuthorization', () => {
  beforeEach(() => vi.clearAllMocks());

  it('authorizes an active institutional user and associates the UID', async () => {
    const dependencies = createDependencies();

    const result = await bootstrapAuthorization(identity, dependencies);

    expect(result).toMatchObject({
      uid: identity.uid,
      correo: activeUser.correo,
      rol: 'usuario',
      activo: true,
      claimsUpdated: true,
    });
    expect(dependencies.repository.recordSuccessfulAccess).toHaveBeenCalledWith(
      activeUser,
      identity.uid,
    );
    expect(dependencies.claims.setClaims).toHaveBeenCalledWith(identity.uid, {
      authorized: true,
      role: 'usuario',
    });
  });

  it('does not rewrite canonical claims when they are current', async () => {
    const dependencies = createDependencies();
    vi.mocked(dependencies.claims.getClaims).mockResolvedValue({
      authorized: true,
      role: 'usuario',
    });

    const result = await bootstrapAuthorization(identity, dependencies);

    expect(result.claimsUpdated).toBe(false);
    expect(dependencies.claims.setClaims).not.toHaveBeenCalled();
  });

  it('rejects a non-institutional domain', async () => {
    const dependencies = createDependencies();
    await expectFunctionalError(
      bootstrapAuthorization({ ...identity, email: 'persona@example.com' }, dependencies),
      'domain-not-allowed',
    );
  });

  it('rejects a user that does not exist', async () => {
    await expectFunctionalError(
      bootstrapAuthorization(identity, createDependencies([])),
      'user-not-authorized',
    );
  });

  it('rejects duplicate authorization records', async () => {
    await expectFunctionalError(
      bootstrapAuthorization(identity, createDependencies([activeUser, activeUser])),
      'user-not-authorized',
    );
  });

  it('rejects an inactive user and revokes refresh tokens', async () => {
    const dependencies = createDependencies([{ ...activeUser, activo: false }]);

    await expectFunctionalError(bootstrapAuthorization(identity, dependencies), 'user-inactive');
    expect(dependencies.claims.revokeRefreshTokens).toHaveBeenCalledWith(identity.uid);
  });

  it('rejects an invalid role', async () => {
    await expectFunctionalError(
      bootstrapAuthorization(identity, createDependencies([{ ...activeUser, rol: 'supervisor' }])),
      'invalid-role',
    );
  });

  it('rejects a conflicting UID without recording access', async () => {
    const dependencies = createDependencies([{ ...activeUser, uid: 'another-firebase-uid' }]);

    await expectFunctionalError(bootstrapAuthorization(identity, dependencies), 'uid-conflict');
    expect(dependencies.repository.recordSuccessfulAccess).not.toHaveBeenCalled();
  });

  it('requires an authenticated identity', async () => {
    await expectFunctionalError(
      bootstrapAuthorization(null, createDependencies()),
      'unauthenticated',
    );
  });
});
