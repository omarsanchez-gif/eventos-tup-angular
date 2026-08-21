import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import {
  FieldValue,
  getFirestore,
  type DocumentData,
  type DocumentReference,
} from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { defineString } from 'firebase-functions/params';

import {
  AuthorizationError,
  bootstrapAuthorization as authorize,
  type AuthorizationRepository,
  type AuthorizedUserRecord,
  type CanonicalUserRecord,
  type UserRole,
} from './bootstrap-authorization.js';
import {
  AdminCampusesError,
  createCampusRecord,
  deleteCampusRecord,
  listCampusRecords,
  listSelectableCampusRecords,
  setCampusRecordStatus,
  updateCampusRecord,
  type AdminCampusesDependencies,
  type CampusRequestIdentity,
} from './admin-campuses.js';
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
} from './admin-coordinations.js';
import {
  AdminUsersError,
  createAuthorizedUser as createUser,
  deleteAuthorizedUser as deleteUser,
  listAuthorizedUsers as listUsers,
  setAuthorizedUserStatus as setUserStatus,
  updateAuthorizedUser as updateUser,
  type AdminRequestIdentity,
  type AdminUsersDependencies,
} from './admin-users.js';
import { createFirestoreAdminCampusesRepository } from './firestore-admin-campuses.repository.js';
import { createFirestoreAdminCoordinationsRepository } from './firestore-admin-coordinations.repository.js';
import { createFirestoreAdminUsersRepository } from './firestore-admin-users.repository.js';

if (getApps().length === 0) {
  initializeApp();
}

const institutionalDomain = defineString('INSTITUTIONAL_DOMAIN');
const firestore = getFirestore();
const adminAuth = getAuth();
const adminCampusesRepository = createFirestoreAdminCampusesRepository(firestore);
const adminCoordinationsRepository = createFirestoreAdminCoordinationsRepository(firestore);
const adminUsersRepository = createFirestoreAdminUsersRepository(firestore);

function dataToUserRecord(
  reference: DocumentReference<DocumentData>,
  data: DocumentData,
): AuthorizedUserRecord {
  return {
    id: reference.id,
    uid: typeof data['uid'] === 'string' ? data['uid'] : null,
    nombre: typeof data['nombre'] === 'string' ? data['nombre'] : '',
    correo: typeof data['correo'] === 'string' ? data['correo'].trim().toLowerCase() : '',
    rol: data['rol'],
    activo: data['activo'] === true,
  };
}

function isRole(value: unknown): value is UserRole {
  return value === 'admin' || value === 'usuario';
}

const repository: AuthorizationRepository = {
  async findByEmail(email) {
    const snapshot = await firestore
      .collection('usuarios')
      .where('correo', '==', email)
      .limit(2)
      .get();
    return snapshot.docs.map((document) => dataToUserRecord(document.ref, document.data()));
  },

  async recordSuccessfulAccess(record, authenticatedUid) {
    const reference = firestore.collection('usuarios').doc(record.id);
    return firestore.runTransaction(async (transaction): Promise<CanonicalUserRecord> => {
      const snapshot = await transaction.get(reference);
      const current = snapshot.exists ? dataToUserRecord(reference, snapshot.data() ?? {}) : null;

      if (!current) {
        throw new AuthorizationError(
          'user-not-authorized',
          'permission-denied',
          'El usuario ya no existe.',
        );
      }
      if (!current.activo) {
        throw new AuthorizationError(
          'user-inactive',
          'permission-denied',
          'El usuario está inactivo.',
        );
      }
      if (!isRole(current.rol)) {
        throw new AuthorizationError('invalid-role', 'permission-denied', 'El rol no es válido.');
      }
      if (current.uid !== null && current.uid !== authenticatedUid) {
        throw new AuthorizationError(
          'uid-conflict',
          'permission-denied',
          'El UID no corresponde al usuario autorizado.',
        );
      }

      transaction.update(reference, {
        ...(current.uid === null ? { uid: authenticatedUid } : {}),
        ultimoAcceso: FieldValue.serverTimestamp(),
      });

      return {
        ...current,
        uid: authenticatedUid,
        rol: current.rol,
        activo: true,
      };
    });
  },
};

export const bootstrapAuthorization = onCall(
  { invoker: 'public', region: 'us-central1' },
  async (request) => {
    try {
      return await authorize(
        request.auth
          ? {
              uid: request.auth.uid,
              email: typeof request.auth.token.email === 'string' ? request.auth.token.email : null,
              emailVerified: request.auth.token.email_verified === true,
            }
          : null,
        {
          repository,
          claims: {
            async getClaims(uid) {
              return (await adminAuth.getUser(uid)).customClaims ?? {};
            },
            async setClaims(uid, claims) {
              await adminAuth.setCustomUserClaims(uid, claims);
            },
            async revokeRefreshTokens(uid) {
              await adminAuth.revokeRefreshTokens(uid);
            },
          },
          logger,
          institutionalDomain: institutionalDomain.value(),
        },
      );
    } catch (error) {
      if (error instanceof AuthorizationError) {
        throw new HttpsError(error.functionsCode, error.message, {
          functionalCode: error.functionalCode,
        });
      }

      logger.error('Error no controlado en bootstrapAuthorization.', error);
      throw new HttpsError('unavailable', 'El servicio no está disponible.', {
        functionalCode: 'service-unavailable',
      });
    }
  },
);

function toAdminIdentity(
  auth: Readonly<{ uid: string; token: Readonly<Record<string, unknown>> }> | undefined,
): AdminRequestIdentity | null {
  return auth
    ? {
        uid: auth.uid,
        authorized: auth.token['authorized'] === true,
        role: auth.token['role'],
      }
    : null;
}

function adminUsersDependencies(): AdminUsersDependencies {
  return {
    repository: adminUsersRepository,
    claims: {
      async setClaims(uid, claims) {
        await adminAuth.setCustomUserClaims(uid, claims);
      },
      async revokeRefreshTokens(uid) {
        await adminAuth.revokeRefreshTokens(uid);
      },
    },
    logger,
    institutionalDomain: institutionalDomain.value(),
  };
}

function toCoordinationIdentity(
  auth: Readonly<{ uid: string; token: Readonly<Record<string, unknown>> }> | undefined,
): CoordinationRequestIdentity | null {
  return auth
    ? {
        uid: auth.uid,
        authorized: auth.token['authorized'] === true,
        role: auth.token['role'],
      }
    : null;
}

function adminCoordinationsDependencies(): AdminCoordinationsDependencies {
  return {
    repository: adminCoordinationsRepository,
    logger,
    institutionalDomain: institutionalDomain.value(),
  };
}

function toCampusIdentity(
  auth: Readonly<{ uid: string; token: Readonly<Record<string, unknown>> }> | undefined,
): CampusRequestIdentity | null {
  return auth
    ? {
        uid: auth.uid,
        authorized: auth.token['authorized'] === true,
        role: auth.token['role'],
      }
    : null;
}

function adminCampusesDependencies(): AdminCampusesDependencies {
  return {
    repository: adminCampusesRepository,
    logger,
  };
}

async function executeAdminOperation<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof AdminUsersError) {
      throw new HttpsError(error.functionsCode, error.message, {
        functionalCode: error.functionalCode,
      });
    }

    logger.error('Error no controlado en una operación administrativa de Usuarios.', {
      cause: error instanceof Error ? error.name : 'unknown',
    });
    throw new HttpsError('unavailable', 'El servicio no está disponible.', {
      functionalCode: 'service-unavailable',
    });
  }
}

async function executeCoordinationOperation<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof AdminCoordinationsError) {
      throw new HttpsError(error.functionsCode, error.message, {
        functionalCode: error.functionalCode,
      });
    }

    logger.error('Error no controlado en una operación de Coordinaciones.', {
      cause: error instanceof Error ? error.name : 'unknown',
    });
    throw new HttpsError('unavailable', 'El servicio no está disponible.', {
      functionalCode: 'service-unavailable',
    });
  }
}

async function executeCampusOperation<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof AdminCampusesError) {
      throw new HttpsError(error.functionsCode, error.message, {
        functionalCode: error.functionalCode,
      });
    }

    logger.error('Error no controlado en una operación de Campus.', {
      cause: error instanceof Error ? error.name : 'unknown',
    });
    throw new HttpsError('unavailable', 'El servicio no está disponible.', {
      functionalCode: 'service-unavailable',
    });
  }
}

const adminCallableOptions = {
  invoker: 'public' as const,
  region: 'us-central1' as const,
};

export const listAuthorizedUsers = onCall(adminCallableOptions, async (request) =>
  executeAdminOperation(() => listUsers(toAdminIdentity(request.auth), adminUsersDependencies())),
);

export const createAuthorizedUser = onCall(adminCallableOptions, async (request) =>
  executeAdminOperation(() =>
    createUser(toAdminIdentity(request.auth), request.data, adminUsersDependencies()),
  ),
);

export const updateAuthorizedUser = onCall(adminCallableOptions, async (request) =>
  executeAdminOperation(() =>
    updateUser(toAdminIdentity(request.auth), request.data, adminUsersDependencies()),
  ),
);

export const setAuthorizedUserStatus = onCall(adminCallableOptions, async (request) =>
  executeAdminOperation(() =>
    setUserStatus(toAdminIdentity(request.auth), request.data, adminUsersDependencies()),
  ),
);

export const deleteAuthorizedUser = onCall(adminCallableOptions, async (request) =>
  executeAdminOperation(() =>
    deleteUser(toAdminIdentity(request.auth), request.data, adminUsersDependencies()),
  ),
);

export const listCoordinations = onCall(adminCallableOptions, async (request) =>
  executeCoordinationOperation(() =>
    listCoordinationRecords(toCoordinationIdentity(request.auth), adminCoordinationsDependencies()),
  ),
);

export const listSelectableCoordinations = onCall(adminCallableOptions, async (request) =>
  executeCoordinationOperation(() =>
    listSelectableCoordinationRecords(
      toCoordinationIdentity(request.auth),
      adminCoordinationsDependencies(),
    ),
  ),
);

export const createCoordination = onCall(adminCallableOptions, async (request) =>
  executeCoordinationOperation(() =>
    createCoordinationRecord(
      toCoordinationIdentity(request.auth),
      request.data,
      adminCoordinationsDependencies(),
    ),
  ),
);

export const updateCoordination = onCall(adminCallableOptions, async (request) =>
  executeCoordinationOperation(() =>
    updateCoordinationRecord(
      toCoordinationIdentity(request.auth),
      request.data,
      adminCoordinationsDependencies(),
    ),
  ),
);

export const setCoordinationStatus = onCall(adminCallableOptions, async (request) =>
  executeCoordinationOperation(() =>
    setCoordinationRecordStatus(
      toCoordinationIdentity(request.auth),
      request.data,
      adminCoordinationsDependencies(),
    ),
  ),
);

export const deleteCoordination = onCall(adminCallableOptions, async (request) =>
  executeCoordinationOperation(() =>
    deleteCoordinationRecord(
      toCoordinationIdentity(request.auth),
      request.data,
      adminCoordinationsDependencies(),
    ),
  ),
);

export const listCampuses = onCall(adminCallableOptions, async (request) =>
  executeCampusOperation(() =>
    listCampusRecords(toCampusIdentity(request.auth), adminCampusesDependencies()),
  ),
);

export const listSelectableCampuses = onCall(adminCallableOptions, async (request) =>
  executeCampusOperation(() =>
    listSelectableCampusRecords(toCampusIdentity(request.auth), adminCampusesDependencies()),
  ),
);

export const createCampus = onCall(adminCallableOptions, async (request) =>
  executeCampusOperation(() =>
    createCampusRecord(toCampusIdentity(request.auth), request.data, adminCampusesDependencies()),
  ),
);

export const updateCampus = onCall(adminCallableOptions, async (request) =>
  executeCampusOperation(() =>
    updateCampusRecord(toCampusIdentity(request.auth), request.data, adminCampusesDependencies()),
  ),
);

export const setCampusStatus = onCall(adminCallableOptions, async (request) =>
  executeCampusOperation(() =>
    setCampusRecordStatus(
      toCampusIdentity(request.auth),
      request.data,
      adminCampusesDependencies(),
    ),
  ),
);

export const deleteCampus = onCall(adminCallableOptions, async (request) =>
  executeCampusOperation(() =>
    deleteCampusRecord(toCampusIdentity(request.auth), request.data, adminCampusesDependencies()),
  ),
);
