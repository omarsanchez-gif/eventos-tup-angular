import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AdminEquipmentError,
  createEquipmentRecord,
  deleteEquipmentRecord,
  listEquipmentRecords,
  listSelectableEquipmentRecords,
  setEquipmentRecordStatus,
  updateEquipmentRecord,
  type AdminEquipmentDependencies,
  type AdminEquipmentRepository,
  type EquipmentRequestIdentity,
  type ManagedEquipmentRecord,
} from './admin-equipment.js';

const admin: EquipmentRequestIdentity = { uid: 'admin-uid', authorized: true, role: 'admin' };
const user: EquipmentRequestIdentity = { uid: 'user-uid', authorized: true, role: 'usuario' };

function equipment(
  documentId: string,
  nombre: string,
  options: Partial<ManagedEquipmentRecord> = {},
): ManagedEquipmentRecord {
  return {
    documentId,
    nombre,
    nombreNormalizado: nombre.toLocaleLowerCase('es-MX'),
    campusBaseId: 'tup',
    cantidadOperativa: 2,
    clasificacion: 'fijo',
    campusDestinoIdsPermitidos: [],
    activo: true,
    utilizado: false,
    fechaCreacion: null,
    fechaActualizacion: null,
    ...options,
  };
}
function repositoryMock(): AdminEquipmentRepository {
  return {
    findCanonicalRequester: vi.fn(async (uid) => ({
      uid,
      role: uid === 'admin-uid' ? 'admin' : 'usuario',
      activo: true,
    })),
    list: vi.fn(async () => []),
    findCampuses: vi.fn(async (ids) =>
      ids.map((id) => ({ documentId: id, nombre: id.toUpperCase(), activo: id !== 'inactive' })),
    ),
    create: vi.fn(async () => 'equipment-id'),
    update: vi.fn(async () => undefined),
    setStatus: vi.fn(async () => undefined),
    delete: vi.fn(async () => undefined),
  };
}
function dependencies(repository = repositoryMock()): AdminEquipmentDependencies {
  return { repository, logger: { warn: vi.fn(), error: vi.fn() } };
}
async function expectCode(promise: Promise<unknown>, code: string): Promise<void> {
  await expect(promise).rejects.toMatchObject<Partial<AdminEquipmentError>>({
    functionalCode: code as AdminEquipmentError['functionalCode'],
  });
}

describe('operaciones de Equipos', () => {
  let repository: AdminEquipmentRepository;
  let deps: AdminEquipmentDependencies;

  beforeEach(() => {
    repository = repositoryMock();
    deps = dependencies(repository);
  });

  it('lista para admin en orden determinista', async () => {
    vi.mocked(repository.list).mockResolvedValue([
      equipment('z', 'Proyector'),
      equipment('a', 'Bocina'),
    ]);
    const result = await listEquipmentRecords(admin, deps);
    expect(result.items.map((item) => item.documentId)).toEqual(['a', 'z']);
    expect(result.maxSupported).toBe(500);
  });

  it('entrega catálogo activo sanitizado y filtra campus suspendidos', async () => {
    vi.mocked(repository.list).mockResolvedValue([
      equipment('speaker', 'Bocina', {
        clasificacion: 'transferible',
        campusDestinoIdsPermitidos: ['fcs', 'inactive'],
      }),
      equipment('projector', 'Proyector', { campusBaseId: 'inactive' }),
    ]);
    await expect(listSelectableEquipmentRecords(user, deps)).resolves.toEqual({
      items: [
        {
          equipoId: 'speaker',
          nombre: 'Bocina',
          campusBaseId: 'tup',
          clasificacion: 'transferible',
          campusDestinoIdsPermitidos: ['fcs'],
        },
      ],
      total: 1,
    });
  });

  it('impide a usuario normal listar documentos completos', async () => {
    await expectCode(listEquipmentRecords(user, deps), 'permission-denied');
  });

  it('normaliza y crea un equipo fijo', async () => {
    await createEquipmentRecord(
      admin,
      {
        nombre: '  Proyector   portátil ',
        campusBaseId: 'tup',
        cantidadOperativa: 3,
        clasificacion: 'fijo',
        campusDestinoIdsPermitidos: [],
        activo: true,
      },
      deps,
    );
    expect(repository.create).toHaveBeenCalledWith('admin-uid', {
      nombre: 'Proyector portátil',
      nombreNormalizado: 'proyector portátil',
      campusBaseId: 'tup',
      cantidadOperativa: 3,
      clasificacion: 'fijo',
      campusDestinoIdsPermitidos: [],
      activo: true,
    });
  });

  it('crea un equipo transferible con destino explícito', async () => {
    await createEquipmentRecord(
      admin,
      {
        nombre: 'Bocina',
        campusBaseId: 'tup',
        cantidadOperativa: 2,
        clasificacion: 'transferible',
        campusDestinoIdsPermitidos: ['fcs'],
        activo: true,
      },
      deps,
    );
    expect(repository.create).toHaveBeenCalledWith(
      'admin-uid',
      expect.objectContaining({
        clasificacion: 'transferible',
        campusDestinoIdsPermitidos: ['fcs'],
      }),
    );
  });

  it('rechaza cantidades fuera de límites y activo sin stock', async () => {
    const base = {
      nombre: 'Bocina',
      campusBaseId: 'tup',
      clasificacion: 'fijo',
      campusDestinoIdsPermitidos: [],
      activo: true,
    };
    await expectCode(
      createEquipmentRecord(admin, { ...base, cantidadOperativa: 1000 }, deps),
      'invalid-argument',
    );
    await expectCode(
      createEquipmentRecord(admin, { ...base, cantidadOperativa: 0 }, deps),
      'active-equipment-requires-stock',
    );
  });

  it('valida destinos según clasificación', async () => {
    const base = {
      nombre: 'Bocina',
      campusBaseId: 'tup',
      cantidadOperativa: 2,
      activo: true,
    };
    await expectCode(
      createEquipmentRecord(
        admin,
        { ...base, clasificacion: 'fijo', campusDestinoIdsPermitidos: ['fcs'] },
        deps,
      ),
      'invalid-destination-campus',
    );
    await expectCode(
      createEquipmentRecord(
        admin,
        { ...base, clasificacion: 'transferible', campusDestinoIdsPermitidos: ['tup'] },
        deps,
      ),
      'invalid-destination-campus',
    );
  });

  it('rechaza campos administrados por servidor', async () => {
    await expectCode(
      createEquipmentRecord(
        admin,
        {
          nombre: 'Bocina',
          campusBaseId: 'tup',
          cantidadOperativa: 2,
          clasificacion: 'fijo',
          campusDestinoIdsPermitidos: [],
          activo: true,
          utilizado: true,
        },
        deps,
      ),
      'invalid-argument',
    );
  });

  it('actualiza el contrato permitido', async () => {
    await updateEquipmentRecord(
      admin,
      {
        documentId: 'speaker',
        nombre: 'Bocina principal',
        campusBaseId: 'tup',
        cantidadOperativa: 4,
        clasificacion: 'transferible',
        campusDestinoIdsPermitidos: ['fcs'],
      },
      deps,
    );
    expect(repository.update).toHaveBeenCalledWith(
      'admin-uid',
      expect.objectContaining({ documentId: 'speaker', cantidadOperativa: 4 }),
    );
  });

  it('solicita estado objetivo y delega eliminación', async () => {
    await setEquipmentRecordStatus(admin, { documentId: 'speaker', activo: false }, deps);
    expect(repository.setStatus).toHaveBeenCalledWith('admin-uid', {
      documentId: 'speaker',
      activo: false,
    });
    await deleteEquipmentRecord(admin, { documentId: 'speaker' }, deps);
    expect(repository.delete).toHaveBeenCalledWith('admin-uid', 'speaker');
  });
});
