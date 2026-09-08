import { deleteApp, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  AdminUsersError,
  createAuthorizedUser,
  deleteAuthorizedUser,
  listAuthorizedUsers,
  setAuthorizedUserStatus,
  updateAuthorizedUser,
  type AdminRequestIdentity,
  type AdminUsersDependencies,
} from '../../functions/src/admin-users.js';
import { createFirestoreAdminUsersRepository } from '../../functions/src/firestore-admin-users.repository.js';

const projectId = 'demo-eventos-tup';
const domain = 'institucion.test';
const adminAIdentity: AdminRequestIdentity = {
  uid: 'admin-a-uid',
  authorized: true,
  role: 'admin',
};

let app: App;
let auth: Auth;
let firestore: Firestore;
let dependencies: AdminUsersDependencies;

async function clearEmulatedData(): Promise<void> {
  const documents = await firestore.collection('usuarios').listDocuments();
  if (documents.length > 0) {
    const batch = firestore.batch();
    documents.forEach((document) => batch.delete(document));
    await batch.commit();
  }

  const users = await auth.listUsers(1_000);
  if (users.users.length > 0) {
    await auth.deleteUsers(users.users.map((user) => user.uid));
  }
}

async function seedUser(input: {
  readonly documentId: string;
  readonly uid: string | null;
  readonly nombre: string;
  readonly correo: string;
  readonly rol: 'admin' | 'usuario';
  readonly activo: boolean;
}): Promise<void> {
  if (input.uid) {
    await auth.createUser({
      uid: input.uid,
      email: input.correo,
      emailVerified: true,
      displayName: input.nombre,
    });
    await auth.setCustomUserClaims(input.uid, {
      authorized: input.activo,
      role: input.activo ? input.rol : null,
    });
  }
  await firestore
    .collection('usuarios')
    .doc(input.documentId)
    .set({
      uid: input.uid,
      nombre: input.nombre,
      correo: input.correo,
      rol: input.rol,
      activo: input.activo,
      fechaCreacion: Timestamp.fromMillis(1_700_000_000_000),
      ultimoAcceso: null,
    });
}

async function seedBaseData(): Promise<void> {
  await seedUser({
    documentId: 'admin-a',
    uid: adminAIdentity.uid,
    nombre: 'Admin A',
    correo: `admin.a@${domain}`,
    rol: 'admin',
    activo: true,
  });
  await seedUser({
    documentId: 'admin-b',
    uid: 'admin-b-uid',
    nombre: 'Admin B',
    correo: `admin.b@${domain}`,
    rol: 'admin',
    activo: true,
  });
  await seedUser({
    documentId: 'user-a',
    uid: 'user-a-uid',
    nombre: 'Usuario A',
    correo: `usuario.a@${domain}`,
    rol: 'usuario',
    activo: true,
  });
  await seedUser({
    documentId: 'pending-a',
    uid: null,
    nombre: 'Pendiente A',
    correo: `pendiente.a@${domain}`,
    rol: 'usuario',
    activo: true,
  });
}

async function expectFunctionalError(
  promise: Promise<unknown>,
  functionalCode: AdminUsersError['functionalCode'],
): Promise<void> {
  await expect(promise).rejects.toMatchObject({ functionalCode });
}

describe('Usuarios con Auth y Firestore Emulator', () => {
  beforeAll(() => {
    app = initializeApp({ projectId }, 'admin-users-emulator-tests');
    auth = getAuth(app);
    firestore = getFirestore(app);
    dependencies = {
      repository: createFirestoreAdminUsersRepository(firestore),
      claims: {
        async setClaims(uid, claims) {
          await auth.setCustomUserClaims(uid, claims);
        },
        async revokeRefreshTokens(uid) {
          await auth.revokeRefreshTokens(uid);
        },
      },
      logger: { warn() {}, error() {} },
      institutionalDomain: domain,
    };
  });

  beforeEach(async () => {
    await clearEmulatedData();
    await seedBaseData();
  });

  afterAll(async () => {
    await clearEmulatedData();
    await deleteApp(app);
  });

  it('lista usuarios ordenados usando el perfil canónico del admin', async () => {
    const result = await listAuthorizedUsers(adminAIdentity, dependencies);
    expect(result.total).toBe(4);
    expect(result.items.map((user) => user.documentId)).toEqual([
      'admin-a',
      'admin-b',
      'pending-a',
      'user-a',
    ]);
  });

  it('crea solo el documento canónico con fechas administradas por servidor', async () => {
    const beforeAuthCount = (await auth.listUsers()).users.length;
    const result = await createAuthorizedUser(
      adminAIdentity,
      {
        nombre: '  Nueva Persona  ',
        correo: `NUEVA@${domain.toUpperCase()}`,
        rol: 'usuario',
        activo: true,
      },
      dependencies,
    );

    const snapshot = await firestore.collection('usuarios').doc(result.documentId).get();
    expect(snapshot.data()).toMatchObject({
      uid: null,
      nombre: 'Nueva Persona',
      correo: `nueva@${domain}`,
      rol: 'usuario',
      activo: true,
      ultimoAcceso: null,
    });
    expect(snapshot.data()?.['fechaCreacion']).toBeInstanceOf(Timestamp);
    expect((await auth.listUsers()).users).toHaveLength(beforeAuthCount);
  });

  it('serializa altas concurrentes y conserva un solo correo normalizado', async () => {
    const input = {
      nombre: 'Concurrente',
      correo: `concurrente@${domain}`,
      rol: 'usuario' as const,
      activo: true,
    };
    const results = await Promise.allSettled([
      createAuthorizedUser(adminAIdentity, input, dependencies),
      createAuthorizedUser(adminAIdentity, input, dependencies),
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((result) => result.status === 'rejected');
    expect(rejected?.status === 'rejected' ? rejected.reason : null).toMatchObject({
      functionalCode: 'email-already-exists',
    });
    const snapshot = await firestore
      .collection('usuarios')
      .where('correo', '==', input.correo)
      .get();
    expect(snapshot.size).toBe(1);
  });

  it('restringe correo con UID y sincroniza una degradación de rol', async () => {
    await expectFunctionalError(
      updateAuthorizedUser(
        adminAIdentity,
        {
          documentId: 'user-a',
          nombre: 'Usuario A',
          correo: `otra.identidad@${domain}`,
          rol: 'usuario',
        },
        dependencies,
      ),
      'uid-bound-email-change-forbidden',
    );

    await updateAuthorizedUser(
      adminAIdentity,
      {
        documentId: 'admin-b',
        nombre: 'Admin B',
        correo: `admin.b@${domain}`,
        rol: 'usuario',
      },
      dependencies,
    );
    expect((await firestore.doc('usuarios/admin-b').get()).data()?.['rol']).toBe('usuario');
    expect((await auth.getUser('admin-b-uid')).customClaims).toEqual({
      authorized: true,
      role: 'usuario',
    });
  });

  it('desactiva en Firestore y retira los claims canónicos', async () => {
    await setAuthorizedUserStatus(
      adminAIdentity,
      { documentId: 'user-a', activo: false },
      dependencies,
    );

    expect((await firestore.doc('usuarios/user-a').get()).data()?.['activo']).toBe(false);
    expect((await auth.getUser('user-a-uid')).customClaims).toEqual({
      authorized: false,
      role: null,
    });
  });

  it('elimina la autorización sin eliminar la cuenta de Authentication', async () => {
    await deleteAuthorizedUser(adminAIdentity, { documentId: 'user-a' }, dependencies);

    expect((await firestore.doc('usuarios/user-a').get()).exists).toBe(false);
    const authenticationUser = await auth.getUser('user-a-uid');
    expect(authenticationUser.customClaims).toEqual({ authorized: false, role: null });
  });

  it('rechaza claims admin cuando el perfil canónico deja de ser administrativo', async () => {
    await firestore.doc('usuarios/admin-a').update({ rol: 'usuario' });
    await expectFunctionalError(
      listAuthorizedUsers(adminAIdentity, dependencies),
      'permission-denied',
    );
  });
});
