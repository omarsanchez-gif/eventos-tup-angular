import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AdminUsersError,
  createAuthorizedUser,
  deleteAuthorizedUser,
  listAuthorizedUsers,
  MAX_SUPPORTED_USERS,
  setAuthorizedUserStatus,
  updateAuthorizedUser,
  type AdminUsersDependencies,
  type AdminUsersRepository,
  type ManagedUserRecord,
} from './admin-users.js';

const adminIdentity = {
  uid: 'admin-uid',
  authorized: true,
  role: 'admin',
} as const;
const admin: ManagedUserRecord = {
  documentId: 'admin-document',
  uid: 'admin-uid',
  nombre: 'Administrador',
  correo: 'admin@institucion.test',
  rol: 'admin',
  activo: true,
  fechaCreacion: null,
  ultimoAcceso: null,
};
const user: ManagedUserRecord = {
  documentId: 'user-document',
  uid: 'user-uid',
  nombre: 'Persona Usuaria',
  correo: 'persona@institucion.test',
  rol: 'usuario',
  activo: true,
  fechaCreacion: null,
  ultimoAcceso: null,
};

function createDependencies(): AdminUsersDependencies {
  const repository: AdminUsersRepository = {
    findCanonicalAdmin: vi.fn().mockResolvedValue(admin),
    list: vi.fn().mockResolvedValue([user, admin]),
    create: vi.fn().mockResolvedValue('new-document'),
    update: vi.fn().mockResolvedValue({ previous: user, current: user }),
    setStatus: vi.fn().mockResolvedValue({ previous: user, current: user }),
    prepareDeletion: vi.fn().mockResolvedValue({
      previous: user,
      current: { ...user, activo: false },
    }),
    completeDeletion: vi.fn().mockResolvedValue(undefined),
  };
  return {
    repository,
    claims: {
      setClaims: vi.fn().mockResolvedValue(undefined),
      revokeRefreshTokens: vi.fn().mockResolvedValue(undefined),
    },
    logger: { warn: vi.fn(), error: vi.fn() },
    institutionalDomain: 'institucion.test',
  };
}

async function expectFunctionalError(
  promise: Promise<unknown>,
  functionalCode: AdminUsersError['functionalCode'],
): Promise<void> {
  await expect(promise).rejects.toMatchObject({ functionalCode });
}

describe('admin users operations', () => {
  beforeEach(() => vi.clearAllMocks());

  it('requires an authenticated admin with a canonical active record', async () => {
    const dependencies = createDependencies();
    await expectFunctionalError(listAuthorizedUsers(null, dependencies), 'unauthenticated');
    await expectFunctionalError(
      listAuthorizedUsers({ ...adminIdentity, role: 'usuario' }, dependencies),
      'permission-denied',
    );

    vi.mocked(dependencies.repository.findCanonicalAdmin).mockResolvedValue(null);
    await expectFunctionalError(
      listAuthorizedUsers(adminIdentity, dependencies),
      'permission-denied',
    );
  });

  it('sorts a bounded list and returns its capacity contract', async () => {
    const result = await listAuthorizedUsers(adminIdentity, createDependencies());
    expect(result.items.map((item) => item.documentId)).toEqual([
      'admin-document',
      'user-document',
    ]);
    expect(result).toMatchObject({
      total: 2,
      maxSupported: MAX_SUPPORTED_USERS,
    });
  });

  it('rejects a list larger than the approved limit without partial results', async () => {
    const dependencies = createDependencies();
    vi.mocked(dependencies.repository.list).mockResolvedValue(
      Array.from({ length: MAX_SUPPORTED_USERS + 1 }, (_, index) => ({
        ...user,
        documentId: `user-${index}`,
      })),
    );
    await expectFunctionalError(
      listAuthorizedUsers(adminIdentity, dependencies),
      'user-capacity-exceeded',
    );
  });

  it('normalizes a valid create request and leaves managed fields to the repository', async () => {
    const dependencies = createDependencies();
    const result = await createAuthorizedUser(
      adminIdentity,
      {
        nombre: '  Persona Nueva  ',
        correo: '  NUEVA@INSTITUCION.TEST ',
        rol: 'usuario',
        activo: true,
      },
      dependencies,
    );

    expect(dependencies.repository.create).toHaveBeenCalledWith('admin-uid', {
      nombre: 'Persona Nueva',
      correo: 'nueva@institucion.test',
      rol: 'usuario',
      activo: true,
    });
    expect(result).toEqual({ documentId: 'new-document', status: 'completed' });
  });

  it('rejects an external email and an unsupported role', async () => {
    const dependencies = createDependencies();
    await expectFunctionalError(
      createAuthorizedUser(
        adminIdentity,
        {
          nombre: 'Persona',
          correo: 'persona@example.com',
          rol: 'usuario',
          activo: true,
        },
        dependencies,
      ),
      'domain-not-allowed',
    );
    await expectFunctionalError(
      createAuthorizedUser(
        adminIdentity,
        {
          nombre: 'Persona',
          correo: 'persona@institucion.test',
          rol: 'supervisor',
          activo: true,
        },
        dependencies,
      ),
      'invalid-role',
    );
  });

  it('rejects client-managed identity and timestamp fields', async () => {
    const dependencies = createDependencies();
    await expectFunctionalError(
      createAuthorizedUser(
        adminIdentity,
        {
          nombre: 'Persona',
          correo: 'persona@institucion.test',
          rol: 'usuario',
          activo: true,
          uid: 'client-value',
        },
        dependencies,
      ),
      'invalid-argument',
    );
    expect(dependencies.repository.create).not.toHaveBeenCalled();
  });

  it('synchronizes claims and revokes tokens after a demotion', async () => {
    const dependencies = createDependencies();
    vi.mocked(dependencies.repository.update).mockResolvedValue({
      previous: { ...user, rol: 'admin' },
      current: user,
    });

    await updateAuthorizedUser(
      adminIdentity,
      {
        documentId: user.documentId,
        nombre: user.nombre,
        correo: user.correo,
        rol: 'usuario',
      },
      dependencies,
    );

    expect(dependencies.claims.setClaims).toHaveBeenCalledWith('user-uid', {
      authorized: true,
      role: 'usuario',
    });
    expect(dependencies.claims.revokeRefreshTokens).toHaveBeenCalledWith('user-uid');
  });

  it('reconciles the requested user role when the same update is retried', async () => {
    const dependencies = createDependencies();
    vi.mocked(dependencies.repository.update).mockResolvedValue({
      previous: user,
      current: user,
    });

    await updateAuthorizedUser(
      adminIdentity,
      {
        documentId: user.documentId,
        nombre: user.nombre,
        correo: user.correo,
        rol: 'usuario',
      },
      dependencies,
    );

    expect(dependencies.claims.setClaims).toHaveBeenCalledWith('user-uid', {
      authorized: true,
      role: 'usuario',
    });
    expect(dependencies.claims.revokeRefreshTokens).toHaveBeenCalledWith('user-uid');
  });

  it('returns reconciliation-required when claims fail after Firestore', async () => {
    const dependencies = createDependencies();
    vi.mocked(dependencies.repository.update).mockResolvedValue({
      previous: { ...user, rol: 'admin' },
      current: user,
    });
    vi.mocked(dependencies.claims.setClaims).mockRejectedValue(new Error('claims'));

    await expectFunctionalError(
      updateAuthorizedUser(
        adminIdentity,
        {
          documentId: user.documentId,
          nombre: user.nombre,
          correo: user.correo,
          rol: 'usuario',
        },
        dependencies,
      ),
      'reconciliation-required',
    );
    expect(dependencies.logger.error).toHaveBeenCalled();
  });

  it('desynchronizes access and revokes tokens on deactivation', async () => {
    const dependencies = createDependencies();
    vi.mocked(dependencies.repository.setStatus).mockResolvedValue({
      previous: user,
      current: { ...user, activo: false },
    });

    await setAuthorizedUserStatus(
      adminIdentity,
      { documentId: user.documentId, activo: false },
      dependencies,
    );

    expect(dependencies.claims.setClaims).toHaveBeenCalledWith('user-uid', {
      authorized: false,
      role: null,
    });
    expect(dependencies.claims.revokeRefreshTokens).toHaveBeenCalledWith('user-uid');
  });

  it('removes authorization and refresh tokens before completing a deletion', async () => {
    const dependencies = createDependencies();
    await deleteAuthorizedUser(adminIdentity, { documentId: user.documentId }, dependencies);

    expect(dependencies.claims.setClaims).toHaveBeenCalledWith('user-uid', {
      authorized: false,
      role: null,
    });
    expect(dependencies.claims.revokeRefreshTokens).toHaveBeenCalledWith('user-uid');
    expect(dependencies.repository.completeDeletion).toHaveBeenCalledWith(
      'admin-uid',
      user.documentId,
    );
    expect(
      vi.mocked(dependencies.claims.revokeRefreshTokens).mock.invocationCallOrder[0],
    ).toBeLessThan(
      vi.mocked(dependencies.repository.completeDeletion).mock.invocationCallOrder[0] ?? Infinity,
    );
  });
});
