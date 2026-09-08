import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AdminCampusesError,
  createCampusRecord,
  deleteCampusRecord,
  listCampusRecords,
  listSelectableCampusRecords,
  setCampusRecordStatus,
  updateCampusRecord,
  type AdminCampusesDependencies,
  type AdminCampusesRepository,
  type CampusRequestIdentity,
  type CampusSchedule,
  type ManagedCampusRecord,
} from './admin-campuses.js';

const admin: CampusRequestIdentity = {
  uid: 'admin-uid',
  authorized: true,
  role: 'admin',
};
const user: CampusRequestIdentity = {
  uid: 'user-uid',
  authorized: true,
  role: 'usuario',
};

const schedule: CampusSchedule = {
  lunes: { operativo: true, inicio: '08:00', fin: '20:00' },
  martes: { operativo: true, inicio: '08:00', fin: '20:00' },
  miercoles: { operativo: true, inicio: '08:00', fin: '20:00' },
  jueves: { operativo: true, inicio: '08:00', fin: '20:00' },
  viernes: { operativo: true, inicio: '08:00', fin: '20:00' },
  sabado: { operativo: true, inicio: '08:00', fin: '18:00' },
  domingo: { operativo: false, inicio: null, fin: null },
};

function campus(documentId: string, nombre: string, activo = true): ManagedCampusRecord {
  return {
    documentId,
    nombre,
    nombreNormalizado: nombre.toLocaleLowerCase('es-MX'),
    clave: documentId.toUpperCase(),
    direccion: null,
    referencia: null,
    activo,
    utilizado: false,
    horariosSistemas: schedule,
    fechaCreacion: null,
    fechaActualizacion: null,
  };
}

function repositoryMock(): AdminCampusesRepository {
  return {
    findCanonicalRequester: vi.fn(async (uid) => ({
      uid,
      role: uid === 'admin-uid' ? 'admin' : 'usuario',
      activo: true,
    })),
    list: vi.fn(async () => []),
    create: vi.fn(async () => 'campus-id'),
    update: vi.fn(async () => undefined),
    setStatus: vi.fn(async () => undefined),
    delete: vi.fn(async () => undefined),
  };
}

function dependencies(repository = repositoryMock()): AdminCampusesDependencies {
  return { repository, logger: { warn: vi.fn(), error: vi.fn() } };
}

async function expectCode(promise: Promise<unknown>, code: string): Promise<void> {
  await expect(promise).rejects.toMatchObject<Partial<AdminCampusesError>>({
    functionalCode: code as AdminCampusesError['functionalCode'],
  });
}

describe('operaciones de Campus', () => {
  let repository: AdminCampusesRepository;
  let deps: AdminCampusesDependencies;

  beforeEach(() => {
    repository = repositoryMock();
    deps = dependencies(repository);
  });

  it('lista para admin en orden determinista', async () => {
    vi.mocked(repository.list).mockResolvedValue([
      campus('tup', 'Tecnológico Universitario Playacar'),
      campus('fcs', 'Facultad de Ciencias de la Salud'),
    ]);
    const result = await listCampusRecords(admin, deps);
    expect(result.items.map((item) => item.documentId)).toEqual(['fcs', 'tup']);
    expect(result.maxSupported).toBe(100);
  });

  it('entrega al usuario solo el catálogo activo sanitizado', async () => {
    vi.mocked(repository.list).mockResolvedValue([
      campus('tup', 'Tecnológico Universitario Playacar'),
      campus('fcs', 'Facultad de Ciencias de la Salud', false),
    ]);
    await expect(listSelectableCampusRecords(user, deps)).resolves.toEqual({
      items: [
        {
          campusId: 'tup',
          nombre: 'Tecnológico Universitario Playacar',
          clave: 'TUP',
          direccion: null,
          referencia: null,
        },
      ],
      total: 1,
    });
  });

  it('impide a usuario normal listar el catálogo administrativo', async () => {
    await expectCode(listCampusRecords(user, deps), 'permission-denied');
  });

  it('normaliza los datos al crear', async () => {
    await createCampusRecord(
      admin,
      {
        nombre: '  Tecnológico   Universitario Playacar ',
        clave: ' tup ',
        direccion: '',
        referencia: '  Entrada principal  ',
        horariosSistemas: schedule,
        activo: true,
      },
      deps,
    );
    expect(repository.create).toHaveBeenCalledWith('admin-uid', {
      nombre: 'Tecnológico Universitario Playacar',
      nombreNormalizado: 'tecnológico universitario playacar',
      clave: 'TUP',
      direccion: null,
      referencia: 'Entrada principal',
      horariosSistemas: schedule,
      activo: true,
    });
  });

  it('obliga a mantener domingo inactivo', async () => {
    await expectCode(
      createCampusRecord(
        admin,
        {
          nombre: 'TUP',
          clave: 'TUP',
          horariosSistemas: {
            ...schedule,
            domingo: { operativo: true, inicio: '08:00', fin: '12:00' },
          },
          activo: true,
        },
        deps,
      ),
      'invalid-argument',
    );
  });

  it('rechaza un campus activo sin días operativos', async () => {
    const inactive = Object.fromEntries(
      Object.keys(schedule).map((day) => [day, { operativo: false, inicio: null, fin: null }]),
    );
    await expectCode(
      createCampusRecord(
        admin,
        {
          nombre: 'TUP',
          clave: 'TUP',
          horariosSistemas: inactive,
          activo: true,
        },
        deps,
      ),
      'active-campus-requires-schedule',
    );
  });

  it('rechaza campos administrados por el servidor', async () => {
    await expectCode(
      createCampusRecord(
        admin,
        {
          nombre: 'TUP',
          clave: 'TUP',
          horariosSistemas: schedule,
          activo: true,
          utilizado: true,
        },
        deps,
      ),
      'invalid-argument',
    );
  });

  it('actualiza únicamente el contrato editable', async () => {
    await updateCampusRecord(
      admin,
      {
        documentId: 'tup',
        nombre: ' TUP Playa ',
        clave: 'tup',
        direccion: null,
        referencia: null,
        horariosSistemas: schedule,
      },
      deps,
    );
    expect(repository.update).toHaveBeenCalledWith(
      'admin-uid',
      expect.objectContaining({
        documentId: 'tup',
        nombre: 'TUP Playa',
        clave: 'TUP',
      }),
    );
  });

  it('solicita un estado objetivo y delega la eliminación', async () => {
    await setCampusRecordStatus(admin, { documentId: 'tup', activo: false }, deps);
    expect(repository.setStatus).toHaveBeenCalledWith('admin-uid', {
      documentId: 'tup',
      activo: false,
    });
    await deleteCampusRecord(admin, { documentId: 'tup' }, deps);
    expect(repository.delete).toHaveBeenCalledWith('admin-uid', 'tup');
  });
});
