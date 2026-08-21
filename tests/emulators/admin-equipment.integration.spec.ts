import { deleteApp, initializeApp, type App } from 'firebase-admin/app';
import { getFirestore, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  createEquipmentRecord,
  deleteEquipmentRecord,
  listEquipmentRecords,
  listSelectableEquipmentRecords,
  setEquipmentRecordStatus,
  updateEquipmentRecord,
  type AdminEquipmentDependencies,
  type AdminEquipmentError,
  type EquipmentRequestIdentity,
} from '../../functions/src/admin-equipment.js';
import { createFirestoreAdminEquipmentRepository } from '../../functions/src/firestore-admin-equipment.repository.js';

const projectId = 'demo-eventos-tup';
const admin: EquipmentRequestIdentity = { uid: 'admin-uid', authorized: true, role: 'admin' };
const user: EquipmentRequestIdentity = { uid: 'user-uid', authorized: true, role: 'usuario' };
let app: App;
let firestore: Firestore;
let deps: AdminEquipmentDependencies;

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

async function seedCampus(id: string, nombre: string, activo = true): Promise<void> {
  await firestore.doc(`campus/${id}`).set({
    nombre,
    nombreNormalizado: nombre.toLocaleLowerCase('es-MX'),
    clave: id.toUpperCase(),
    direccion: null,
    referencia: null,
    activo,
    utilizado: false,
    fechaCreacion: Timestamp.now(),
    fechaActualizacion: Timestamp.now(),
  });
}

async function seedEquipment(
  id: string,
  options: { utilizado?: boolean; activo?: boolean; campusBaseId?: string } = {},
): Promise<void> {
  await firestore.doc(`equipos/${id}`).set({
    nombre: 'Bocina',
    nombreNormalizado: 'bocina',
    campusBaseId: options.campusBaseId ?? 'tup',
    cantidadOperativa: 2,
    clasificacion: 'transferible',
    campusDestinoIdsPermitidos: ['fcs'],
    activo: options.activo ?? true,
    utilizado: options.utilizado ?? false,
    fechaCreacion: Timestamp.now(),
    fechaActualizacion: Timestamp.now(),
  });
}

async function expectCode(
  promise: Promise<unknown>,
  code: AdminEquipmentError['functionalCode'],
): Promise<void> {
  await expect(promise).rejects.toMatchObject({ functionalCode: code });
}

describe('Equipos con Firestore Emulator', () => {
  beforeAll(() => {
    app = initializeApp({ projectId }, 'admin-equipment-emulator-tests');
    firestore = getFirestore(app);
    deps = {
      repository: createFirestoreAdminEquipmentRepository(firestore),
      logger: { warn() {}, error() {} },
    };
  });

  beforeEach(async () => {
    await clear('equipos');
    await clear('campus');
    await clear('usuarios');
    await seedUsers();
    await seedCampus('tup', 'Tecnológico Universitario Playacar');
    await seedCampus('fcs', 'Facultad de Ciencias de la Salud');
  });

  afterAll(async () => {
    await clear('equipos');
    await clear('campus');
    await clear('usuarios');
    await deleteApp(app);
  });

  it('crea el registro canónico y marca los campus referenciados como utilizados', async () => {
    const result = await createEquipmentRecord(
      admin,
      {
        nombre: ' Bocina  activa ',
        campusBaseId: 'tup',
        cantidadOperativa: 2,
        clasificacion: 'transferible',
        campusDestinoIdsPermitidos: ['fcs'],
        activo: true,
      },
      deps,
    );
    const data = (await firestore.doc(`equipos/${result.documentId}`).get()).data();
    expect(data).toMatchObject({
      nombre: 'Bocina activa',
      nombreNormalizado: 'bocina activa',
      campusBaseId: 'tup',
      cantidadOperativa: 2,
      clasificacion: 'transferible',
      campusDestinoIdsPermitidos: ['fcs'],
      activo: true,
      utilizado: false,
    });
    expect(data?.['fechaCreacion']).toBeInstanceOf(Timestamp);
    await expect(firestore.doc('campus/tup').get()).resolves.toMatchObject({
      exists: true,
    });
    expect((await firestore.doc('campus/tup').get()).data()?.['utilizado']).toBe(true);
    expect((await firestore.doc('campus/fcs').get()).data()?.['utilizado']).toBe(true);
  });

  it('serializa altas y evita el mismo nombre dentro del mismo campus', async () => {
    const input = {
      nombre: 'Micrófono',
      campusBaseId: 'tup',
      cantidadOperativa: 3,
      clasificacion: 'fijo',
      campusDestinoIdsPermitidos: [],
      activo: true,
    };
    const results = await Promise.allSettled([
      createEquipmentRecord(admin, input, deps),
      createEquipmentRecord(admin, { ...input, nombre: ' MICRÓFONO ' }, deps),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.find((result) => result.status === 'rejected')).toMatchObject({
      status: 'rejected',
      reason: { functionalCode: 'equipment-name-exists' },
    });
  });

  it('permite el mismo nombre en campus base diferentes', async () => {
    const base = {
      nombre: 'Proyector',
      cantidadOperativa: 1,
      clasificacion: 'fijo',
      campusDestinoIdsPermitidos: [],
      activo: true,
    };
    await createEquipmentRecord(admin, { ...base, campusBaseId: 'tup' }, deps);
    await createEquipmentRecord(admin, { ...base, campusBaseId: 'fcs' }, deps);
    expect((await listEquipmentRecords(admin, deps)).total).toBe(2);
  });

  it('rechaza campus base suspendido y destinos inexistentes', async () => {
    await firestore.doc('campus/tup').update({ activo: false });
    await expectCode(
      createEquipmentRecord(
        admin,
        {
          nombre: 'Pantalla',
          campusBaseId: 'tup',
          cantidadOperativa: 1,
          clasificacion: 'fijo',
          campusDestinoIdsPermitidos: [],
          activo: true,
        },
        deps,
      ),
      'campus-inactive',
    );
    await expectCode(
      createEquipmentRecord(
        admin,
        {
          nombre: 'Bocina',
          campusBaseId: 'fcs',
          cantidadOperativa: 1,
          clasificacion: 'transferible',
          campusDestinoIdsPermitidos: ['desconocido'],
          activo: true,
        },
        deps,
      ),
      'invalid-destination-campus',
    );
  });

  it('mantiene inmutable el campus base después del primer uso', async () => {
    await seedEquipment('bocina', { utilizado: true });
    await expectCode(
      updateEquipmentRecord(
        admin,
        {
          documentId: 'bocina',
          nombre: 'Bocina',
          campusBaseId: 'fcs',
          cantidadOperativa: 2,
          clasificacion: 'fijo',
          campusDestinoIdsPermitidos: [],
        },
        deps,
      ),
      'equipment-base-campus-immutable',
    );
  });

  it('suspende de forma idempotente y elimina solo equipos sin uso', async () => {
    await seedEquipment('bocina');
    await setEquipmentRecordStatus(admin, { documentId: 'bocina', activo: false }, deps);
    await setEquipmentRecordStatus(admin, { documentId: 'bocina', activo: false }, deps);
    expect((await firestore.doc('equipos/bocina').get()).data()?.['activo']).toBe(false);
    await deleteEquipmentRecord(admin, { documentId: 'bocina' }, deps);
    expect((await firestore.doc('equipos/bocina').get()).exists).toBe(false);

    await seedEquipment('usado', { utilizado: true });
    await expectCode(
      deleteEquipmentRecord(admin, { documentId: 'usado' }, deps),
      'equipment-in-use',
    );
  });

  it('expone al usuario solo activos sanitizados y revalida al admin canónico', async () => {
    await seedEquipment('bocina');
    await seedEquipment('suspendido', { activo: false });
    const selectable = await listSelectableEquipmentRecords(user, deps);
    expect(selectable).toEqual({
      items: [
        {
          equipoId: 'bocina',
          nombre: 'Bocina',
          campusBaseId: 'tup',
          clasificacion: 'transferible',
          campusDestinoIdsPermitidos: ['fcs'],
        },
      ],
      total: 1,
    });
    await firestore.doc('usuarios/admin').update({ rol: 'usuario' });
    await expectCode(listEquipmentRecords(admin, deps), 'permission-denied');
  });
});
