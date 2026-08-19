import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AdminCoordinationsError,
  createCoordinationRecord,
  deleteCoordinationRecord,
  listCoordinationRecords,
  listSelectableCoordinationRecords,
  setCoordinationRecordStatus,
  updateCoordinationRecord,
  type AdminCoordinationsDependencies,
  type AdminCoordinationsRepository,
  type CoordinationRequestIdentity,
  type ManagedCoordinationRecord,
} from './admin-coordinations.js';

const adminIdentity: CoordinationRequestIdentity = {
  uid: 'admin-uid',
  authorized: true,
  role: 'admin',
};
const userIdentity: CoordinationRequestIdentity = {
  uid: 'user-uid',
  authorized: true,
  role: 'usuario',
};

function record(documentId: string, nombre: string, activo = true): ManagedCoordinationRecord {
  return {
    documentId,
    nombre,
    nombreNormalizado: nombre.toLocaleLowerCase('es-MX'),
    correos: [`${documentId}@institucion.test`],
    activo,
    utilizada: false,
    fechaCreacion: null,
    fechaActualizacion: null,
  };
}

function repositoryMock(): AdminCoordinationsRepository {
  return {
    findCanonicalRequester: vi.fn(async (uid) => ({
      uid,
      role: uid === 'admin-uid' ? 'admin' : 'usuario',
      activo: true,
    })),
    list: vi.fn(async () => []),
    create: vi.fn(async () => 'coordination-id'),
    update: vi.fn(async () => undefined),
    setStatus: vi.fn(async () => undefined),
    delete: vi.fn(async () => undefined),
  };
}

function dependencies(repository = repositoryMock()): AdminCoordinationsDependencies {
  return {
    repository,
    logger: { warn: vi.fn(), error: vi.fn() },
    institutionalDomain: 'institucion.test',
  };
}

async function expectCode(promise: Promise<unknown>, code: string): Promise<void> {
  await expect(promise).rejects.toMatchObject<Partial<AdminCoordinationsError>>({
    functionalCode: code as AdminCoordinationsError['functionalCode'],
  });
}

describe('operaciones de Coordinaciones', () => {
  let repository: AdminCoordinationsRepository;
  let deps: AdminCoordinationsDependencies;

  beforeEach(() => {
    repository = repositoryMock();
    deps = dependencies(repository);
  });

  it('lista para admin en orden determinista', async () => {
    vi.mocked(repository.list).mockResolvedValue([record('z', 'Zeta'), record('a', 'Academia')]);
    const result = await listCoordinationRecords(adminIdentity, deps);
    expect(result.items.map((item) => item.documentId)).toEqual(['a', 'z']);
    expect(result.maxSupported).toBe(500);
  });

  it('entrega al usuario solo el catálogo activo sanitizado', async () => {
    vi.mocked(repository.list).mockResolvedValue([
      record('academia', 'Academia'),
      record('deportes', 'Deportes', false),
    ]);
    await expect(listSelectableCoordinationRecords(userIdentity, deps)).resolves.toEqual({
      items: [{ coordinacionId: 'academia', nombre: 'Academia' }],
      total: 1,
    });
  });

  it('impide a usuario normal listar documentos completos', async () => {
    await expectCode(listCoordinationRecords(userIdentity, deps), 'permission-denied');
  });

  it('normaliza nombre y correos al crear', async () => {
    await createCoordinationRecord(
      adminIdentity,
      {
        nombre: '  Servicios   Escolares ',
        correos: ['CONTACTO@INSTITUCION.TEST'],
        activo: true,
      },
      deps,
    );
    expect(repository.create).toHaveBeenCalledWith('admin-uid', {
      nombre: 'Servicios Escolares',
      nombreNormalizado: 'servicios escolares',
      correos: ['contacto@institucion.test'],
      activo: true,
    });
  });

  it('rechaza más de diez correos', async () => {
    await expectCode(
      createCoordinationRecord(
        adminIdentity,
        {
          nombre: 'Academia',
          correos: Array.from({ length: 11 }, (_, index) => `persona${index}@institucion.test`),
          activo: true,
        },
        deps,
      ),
      'email-capacity-exceeded',
    );
  });

  it('rechaza duplicados después de normalizar', async () => {
    await expectCode(
      createCoordinationRecord(
        adminIdentity,
        {
          nombre: 'Academia',
          correos: ['contacto@institucion.test', 'CONTACTO@INSTITUCION.TEST'],
          activo: true,
        },
        deps,
      ),
      'duplicate-email',
    );
  });

  it('rechaza correos externos', async () => {
    await expectCode(
      createCoordinationRecord(
        adminIdentity,
        { nombre: 'Academia', correos: ['persona@example.com'], activo: true },
        deps,
      ),
      'domain-not-allowed',
    );
  });

  it('requiere correo para alta activa y permite alta suspendida vacía', async () => {
    await expectCode(
      createCoordinationRecord(
        adminIdentity,
        { nombre: 'Academia', correos: [], activo: true },
        deps,
      ),
      'active-coordination-requires-email',
    );
    await expect(
      createCoordinationRecord(
        adminIdentity,
        { nombre: 'Academia', correos: [], activo: false },
        deps,
      ),
    ).resolves.toMatchObject({ status: 'completed' });
  });

  it('rechaza campos administrados enviados por el cliente', async () => {
    await expectCode(
      createCoordinationRecord(
        adminIdentity,
        {
          nombre: 'Academia',
          correos: ['contacto@institucion.test'],
          activo: true,
          utilizada: true,
        },
        deps,
      ),
      'invalid-argument',
    );
  });

  it('actualiza solo el contrato permitido', async () => {
    await updateCoordinationRecord(
      adminIdentity,
      {
        documentId: 'academia',
        nombre: ' Nueva Academia ',
        correos: ['nueva@institucion.test'],
      },
      deps,
    );
    expect(repository.update).toHaveBeenCalledWith('admin-uid', {
      documentId: 'academia',
      nombre: 'Nueva Academia',
      nombreNormalizado: 'nueva academia',
      correos: ['nueva@institucion.test'],
    });
  });

  it('solicita el estado objetivo sin alternarlo', async () => {
    await setCoordinationRecordStatus(
      adminIdentity,
      { documentId: 'academia', activo: false },
      deps,
    );
    expect(repository.setStatus).toHaveBeenCalledWith('admin-uid', {
      documentId: 'academia',
      activo: false,
    });
  });

  it('delega eliminación con identidad canónica', async () => {
    await deleteCoordinationRecord(adminIdentity, { documentId: 'academia' }, deps);
    expect(repository.delete).toHaveBeenCalledWith('admin-uid', 'academia');
  });
});
