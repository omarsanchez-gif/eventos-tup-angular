import { deleteApp, initializeApp, type App } from 'firebase-admin/app';
import { getFirestore, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  AdminCoordinationsError,
  createCoordinationRecord,
  deleteCoordinationRecord,
  listCoordinationRecords,
  listSelectableCoordinationRecords,
  setCoordinationRecordStatus,
  updateCoordinationRecord,
  type AdminCoordinationsDependencies,
  type CoordinationRequestIdentity,
} from '../../functions/src/admin-coordinations.js';
import { createFirestoreAdminCoordinationsRepository } from '../../functions/src/firestore-admin-coordinations.repository.js';

const projectId = 'demo-eventos-tup';
const domain = 'institucion.test';
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

let app: App;
let firestore: Firestore;
let dependencies: AdminCoordinationsDependencies;

async function clearCollection(name: string): Promise<void> {
  const documents = await firestore.collection(name).listDocuments();
  if (documents.length === 0) {
    return;
  }
  const batch = firestore.batch();
  documents.forEach((document) => batch.delete(document));
  await batch.commit();
}

async function seedBaseData(): Promise<void> {
  await firestore
    .collection('usuarios')
    .doc('admin')
    .set({
      uid: adminIdentity.uid,
      nombre: 'Administración',
      correo: `admin@${domain}`,
      rol: 'admin',
      activo: true,
      fechaCreacion: Timestamp.now(),
      ultimoAcceso: null,
    });
  await firestore
    .collection('usuarios')
    .doc('user')
    .set({
      uid: userIdentity.uid,
      nombre: 'Usuario',
      correo: `usuario@${domain}`,
      rol: 'usuario',
      activo: true,
      fechaCreacion: Timestamp.now(),
      ultimoAcceso: null,
    });
}

async function seedCoordination(input: {
  readonly documentId: string;
  readonly nombre: string;
  readonly correos?: readonly string[];
  readonly activo?: boolean;
  readonly utilizada?: boolean;
}): Promise<void> {
  await firestore
    .collection('coordinaciones')
    .doc(input.documentId)
    .set({
      nombre: input.nombre,
      nombreNormalizado: input.nombre.toLocaleLowerCase('es-MX'),
      correos: input.correos ?? [`${input.documentId}@${domain}`],
      activo: input.activo ?? true,
      utilizada: input.utilizada ?? false,
      fechaCreacion: Timestamp.now(),
      fechaActualizacion: Timestamp.now(),
    });
}

async function expectCode(
  promise: Promise<unknown>,
  functionalCode: AdminCoordinationsError['functionalCode'],
): Promise<void> {
  await expect(promise).rejects.toMatchObject({ functionalCode });
}

describe('Coordinaciones con Firestore Emulator', () => {
  beforeAll(() => {
    app = initializeApp({ projectId }, 'admin-coordinations-emulator-tests');
    firestore = getFirestore(app);
    dependencies = {
      repository: createFirestoreAdminCoordinationsRepository(firestore),
      logger: { warn() {}, error() {} },
      institutionalDomain: domain,
    };
  });

  beforeEach(async () => {
    await clearCollection('coordinaciones');
    await clearCollection('usuarios');
    await seedBaseData();
  });

  afterAll(async () => {
    await clearCollection('coordinaciones');
    await clearCollection('usuarios');
    await deleteApp(app);
  });

  it('crea campos canónicos y timestamps del servidor', async () => {
    const result = await createCoordinationRecord(
      adminIdentity,
      {
        nombre: '  Servicios   Escolares ',
        correos: [`CONTACTO@${domain.toUpperCase()}`],
        activo: true,
      },
      dependencies,
    );
    const data = (await firestore.doc(`coordinaciones/${result.documentId}`).get()).data();
    expect(data).toMatchObject({
      nombre: 'Servicios Escolares',
      nombreNormalizado: 'servicios escolares',
      correos: [`contacto@${domain}`],
      activo: true,
      utilizada: false,
    });
    expect(data?.['fechaCreacion']).toBeInstanceOf(Timestamp);
    expect(data?.['fechaActualizacion']).toBeInstanceOf(Timestamp);
  });

  it('serializa altas concurrentes con el mismo nombre normalizado', async () => {
    const input = {
      nombre: 'Academia',
      correos: [`academia@${domain}`],
      activo: true,
    };
    const results = await Promise.allSettled([
      createCoordinationRecord(adminIdentity, input, dependencies),
      createCoordinationRecord(adminIdentity, { ...input, nombre: ' ACADEMIA ' }, dependencies),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((result) => result.status === 'rejected');
    expect(rejected?.status === 'rejected' ? rejected.reason : null).toMatchObject({
      functionalCode: 'coordination-name-exists',
    });
    expect((await firestore.collection('coordinaciones').get()).size).toBe(1);
  });

  it('lista completo para admin y sanitizado para usuario', async () => {
    await seedCoordination({ documentId: 'academia', nombre: 'Academia' });
    await seedCoordination({
      documentId: 'deportes',
      nombre: 'Deportes',
      activo: false,
    });
    const adminList = await listCoordinationRecords(adminIdentity, dependencies);
    expect(adminList.total).toBe(2);
    expect(adminList.items[0]?.correos).toEqual([`academia@${domain}`]);

    const selectable = await listSelectableCoordinationRecords(userIdentity, dependencies);
    expect(selectable).toEqual({
      items: [{ coordinacionId: 'academia', nombre: 'Academia' }],
      total: 1,
    });
  });

  it('rechaza renombre duplicado sin escritura parcial', async () => {
    await seedCoordination({ documentId: 'academia', nombre: 'Academia' });
    await seedCoordination({ documentId: 'deportes', nombre: 'Deportes' });
    await expectCode(
      updateCoordinationRecord(
        adminIdentity,
        {
          documentId: 'deportes',
          nombre: ' academia ',
          correos: [`deportes@${domain}`],
        },
        dependencies,
      ),
      'coordination-name-exists',
    );
    expect((await firestore.doc('coordinaciones/deportes').get()).data()?.['nombre']).toBe(
      'Deportes',
    );
  });

  it('impide que una edición deje sin correos a una coordinación activa', async () => {
    await seedCoordination({ documentId: 'academia', nombre: 'Academia' });
    await expectCode(
      updateCoordinationRecord(
        adminIdentity,
        { documentId: 'academia', nombre: 'Academia', correos: [] },
        dependencies,
      ),
      'active-coordination-requires-email',
    );
    expect((await firestore.doc('coordinaciones/academia').get()).data()?.['correos']).toEqual([
      `academia@${domain}`,
    ]);
  });

  it('suspende de forma idempotente y bloquea activar sin correos', async () => {
    await seedCoordination({ documentId: 'academia', nombre: 'Academia' });
    await setCoordinationRecordStatus(
      adminIdentity,
      { documentId: 'academia', activo: false },
      dependencies,
    );
    await setCoordinationRecordStatus(
      adminIdentity,
      { documentId: 'academia', activo: false },
      dependencies,
    );
    expect((await firestore.doc('coordinaciones/academia').get()).data()?.['activo']).toBe(false);

    await firestore.doc('coordinaciones/academia').update({ correos: [] });
    await expectCode(
      setCoordinationRecordStatus(
        adminIdentity,
        { documentId: 'academia', activo: true },
        dependencies,
      ),
      'active-coordination-requires-email',
    );
  });

  it('elimina solo una coordinación nunca utilizada', async () => {
    await seedCoordination({ documentId: 'nueva', nombre: 'Nueva' });
    await seedCoordination({
      documentId: 'usada',
      nombre: 'Usada',
      utilizada: true,
    });
    await deleteCoordinationRecord(adminIdentity, { documentId: 'nueva' }, dependencies);
    expect((await firestore.doc('coordinaciones/nueva').get()).exists).toBe(false);
    await expectCode(
      deleteCoordinationRecord(adminIdentity, { documentId: 'usada' }, dependencies),
      'coordination-in-use',
    );
    expect((await firestore.doc('coordinaciones/usada').get()).exists).toBe(true);
  });

  it('revalida que el perfil canónico del solicitante siga siendo admin', async () => {
    await firestore.doc('usuarios/admin').update({ rol: 'usuario' });
    await expectCode(listCoordinationRecords(adminIdentity, dependencies), 'permission-denied');
    await expectCode(
      createCoordinationRecord(
        adminIdentity,
        { nombre: 'Academia', correos: [`academia@${domain}`], activo: true },
        dependencies,
      ),
      'permission-denied',
    );
  });
});
