import {
  FieldValue,
  type DocumentData,
  type DocumentReference,
  type Firestore,
} from 'firebase-admin/firestore';

import {
  AuthorizationError,
  type AuthorizationRepository,
  type AuthorizedUserRecord,
  type CanonicalUserRecord,
  type UserRole,
} from './bootstrap-authorization.js';

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

export function createFirestoreAuthorizationRepository(
  firestore: Firestore,
): AuthorizationRepository {
  return {
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
}
