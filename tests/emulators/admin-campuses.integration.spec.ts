import { deleteApp, initializeApp, type App } from 'firebase-admin/app';
import { getFirestore, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  createCampusRecord,
  deleteCampusRecord,
  listCampusRecords,
  listSelectableCampusRecords,
  setCampusRecordStatus,
  updateCampusRecord,
  type AdminCampusesDependencies,
  type AdminCampusesError,
  type CampusRequestIdentity,
  type CampusSchedule,
} from '../../functions/src/admin-campuses.js';
import { createFirestoreAdminCampusesRepository } from '../../functions/src/firestore-admin-campuses.repository.js';

const projectId = 'demo-eventos-tup';
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

let app: App;
let firestore: Firestore;
let deps: AdminCampusesDependencies;

async function clear(name: string): Promise<void> {
  const documents = await firestore.collection(name).listDocuments();
  const batch = firestore.batch();
  documents.forEach((document) => batch.delete(document));
  if (documents.length) await batch.commit();
}

async function seedUsers(): Promise<void> {
  const now = Timestamp.now();
  await firestore.doc('usuarios/admin').set({
    uid: admin.uid,
    nombre: 'Administración',
    correo: 'admin@institucion.test',
    rol: 'admin',
    activo: true,
    fechaCreacion: now,
  });
  await firestore.doc('usuarios/user').set({
    uid: user.uid,
    nombre: 'Usuario',
    correo: 'usuario@institucion.test',
    rol: 'usuario',
    activo: true,
    fechaCreacion: now,
  });
}

async function seedCampus(
  id: string,
  nombre: string,
  options: { activo?: boolean; utilizado?: boolean; clave?: string } = {},
): Promise<void> {
  await firestore.doc(`campus/${id}`).set({
    nombre,
    nombreNormalizado: nombre.toLocaleLowerCase('es-MX'),
    clave: options.clave ?? id.toUpperCase(),
    direccion: null,
    referencia: null,
    activo: options.activo ?? true,
    utilizado: options.utilizado ?? false,
    horariosSistemas: schedule,
    fechaCreacion: Timestamp.now(),
    fechaActualizacion: Timestamp.now(),
  });
}

async function expectCode(
  promise: Promise<unknown>,
  code: AdminCampusesError['functionalCode'],
): Promise<void> {
  await expect(promise).rejects.toMatchObject({ functionalCode: code });
}

describe('Campus con Firestore Emulator', () => {
  beforeAll(() => {
    app = initializeApp({ projectId }, 'admin-campuses-emulator-tests');
    firestore = getFirestore(app);
    deps = {
      repository: createFirestoreAdminCampusesRepository(firestore),
      logger: { warn() {}, error() {} },
    };
  });

  beforeEach(async () => {
    await clear('campus');
    await clear('usuarios');
    await seedUsers();
  });

  afterAll(async () => {
    await clear('campus');
    await clear('usuarios');
    await deleteApp(app);
  });

  it('crea el documento canónico con timestamps del servidor', async () => {
    const result = await createCampusRecord(
      admin,
      {
        nombre: ' Tecnológico  Universitario Playacar ',
        clave: 'tup',
        direccion: null,
        referencia: null,
        horariosSistemas: schedule,
        activo: true,
      },
      deps,
    );
    const data = (await firestore.doc(`campus/${result.documentId}`).get()).data();
    expect(data).toMatchObject({
      nombre: 'Tecnológico Universitario Playacar',
      nombreNormalizado: 'tecnológico universitario playacar',
      clave: 'TUP',
      activo: true,
      utilizado: false,
    });
    expect(data?.['fechaCreacion']).toBeInstanceOf(Timestamp);
    expect(data?.['fechaActualizacion']).toBeInstanceOf(Timestamp);
  });

  it('serializa altas concurrentes y evita nombre o clave repetidos', async () => {
    const input = {
      nombre: 'Facultad de Ciencias de la Salud',
      clave: 'FCS',
      horariosSistemas: schedule,
      activo: true,
    };
    const results = await Promise.allSettled([
      createCampusRecord(admin, input, deps),
      createCampusRecord(admin, { ...input, nombre: ' FACULTAD DE CIENCIAS DE LA SALUD ' }, deps),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.find((result) => result.status === 'rejected')).toMatchObject({
      status: 'rejected',
      reason: { functionalCode: 'campus-name-exists' },
    });
  });

  it('lista completo para admin y solo activos sanitizados para usuario', async () => {
    await seedCampus('tup', 'Tecnológico Universitario Playacar');
    await seedCampus('fcs', 'Facultad de Ciencias de la Salud', {
      activo: false,
    });
    expect((await listCampusRecords(admin, deps)).total).toBe(2);
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

  it('protege unicidad en edición y la clave histórica usada', async () => {
    await seedCampus('tup', 'Tecnológico Universitario Playacar', {
      utilizado: true,
    });
    await seedCampus('fcs', 'Facultad de Ciencias de la Salud');
    await expectCode(
      updateCampusRecord(
        admin,
        {
          documentId: 'fcs',
          nombre: 'Tecnológico Universitario Playacar',
          clave: 'FCS',
          horariosSistemas: schedule,
        },
        deps,
      ),
      'campus-name-exists',
    );
    await expectCode(
      updateCampusRecord(
        admin,
        {
          documentId: 'tup',
          nombre: 'Tecnológico Universitario Playacar',
          clave: 'PLAYA',
          horariosSistemas: schedule,
        },
        deps,
      ),
      'campus-code-immutable',
    );
  });

  it('suspende idempotentemente y elimina solo registros no utilizados', async () => {
    await seedCampus('tup', 'Tecnológico Universitario Playacar');
    await setCampusRecordStatus(admin, { documentId: 'tup', activo: false }, deps);
    await setCampusRecordStatus(admin, { documentId: 'tup', activo: false }, deps);
    expect((await firestore.doc('campus/tup').get()).data()?.['activo']).toBe(false);
    await deleteCampusRecord(admin, { documentId: 'tup' }, deps);
    expect((await firestore.doc('campus/tup').get()).exists).toBe(false);

    await seedCampus('fcs', 'Facultad de Ciencias de la Salud', {
      utilizado: true,
    });
    await expectCode(deleteCampusRecord(admin, { documentId: 'fcs' }, deps), 'campus-in-use');
  });

  it('revalida el perfil canónico del solicitante', async () => {
    await firestore.doc('usuarios/admin').update({ rol: 'usuario' });
    await expectCode(listCampusRecords(admin, deps), 'permission-denied');
  });
});
