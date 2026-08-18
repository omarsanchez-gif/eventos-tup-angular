import {
  FieldValue,
  type DocumentData,
  type DocumentReference,
  type Firestore,
  type QueryDocumentSnapshot,
  type Transaction,
} from 'firebase-admin/firestore';

import {
  AdminUsersError,
  MAX_SUPPORTED_USERS,
  type AdminUsersRepository,
  type ManagedUserRecord,
  type UserMutationResult,
} from './admin-users.js';
import type { UserRole } from './bootstrap-authorization.js';

interface TransactionContext {
  readonly transaction: Transaction;
  readonly records: readonly ManagedUserRecord[];
  readonly references: ReadonlyMap<string, DocumentReference<DocumentData>>;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isRole(value: unknown): value is UserRole {
  return value === 'admin' || value === 'usuario';
}

function snapshotToRecord(snapshot: QueryDocumentSnapshot<DocumentData>): ManagedUserRecord {
  const data = snapshot.data();
  if (!isRole(data['rol'])) {
    throw new AdminUsersError('invalid-role', 'failed-precondition', 'Existe un rol no válido.');
  }

  return {
    documentId: snapshot.id,
    uid: typeof data['uid'] === 'string' && data['uid'] ? data['uid'] : null,
    nombre: typeof data['nombre'] === 'string' ? data['nombre'] : '',
    correo: typeof data['correo'] === 'string' ? normalizeEmail(data['correo']) : '',
    rol: data['rol'],
    activo: data['activo'] === true,
    fechaCreacion: data['fechaCreacion'] ?? null,
    ultimoAcceso: data['ultimoAcceso'] ?? null,
  };
}

function requireTarget(
  records: readonly ManagedUserRecord[],
  documentId: string,
): ManagedUserRecord {
  const target = records.find((record) => record.documentId === documentId);
  if (!target) {
    throw new AdminUsersError('user-not-found', 'not-found', 'El usuario no existe.');
  }
  return target;
}

function requireCanonicalRequester(records: readonly ManagedUserRecord[], uid: string): void {
  const matches = records.filter((record) => record.uid === uid);
  if (matches.length !== 1 || !matches[0]?.activo || matches[0].rol !== 'admin') {
    throw new AdminUsersError(
      'permission-denied',
      'permission-denied',
      'No tiene permisos para administrar usuarios.',
    );
  }
}

function requireCapacity(records: readonly ManagedUserRecord[], creating = false): void {
  if (records.length > MAX_SUPPORTED_USERS || (creating && records.length >= MAX_SUPPORTED_USERS)) {
    throw new AdminUsersError(
      'user-capacity-exceeded',
      'resource-exhausted',
      'La cantidad de usuarios supera el límite de esta versión.',
    );
  }
}

function requireUniqueEmail(
  records: readonly ManagedUserRecord[],
  email: string,
  excludedDocumentId?: string,
): void {
  const exists = records.some(
    (record) => record.documentId !== excludedDocumentId && normalizeEmail(record.correo) === email,
  );
  if (exists) {
    throw new AdminUsersError(
      'email-already-exists',
      'already-exists',
      'Ya existe una autorización para ese correo.',
    );
  }
}

function requireAnotherActiveAdmin(
  records: readonly ManagedUserRecord[],
  target: ManagedUserRecord,
): void {
  const anotherAdminExists = records.some(
    (record) => record.documentId !== target.documentId && record.activo && record.rol === 'admin',
  );
  if (!anotherAdminExists) {
    throw new AdminUsersError(
      'last-admin-required',
      'failed-precondition',
      'Debe permanecer al menos otro administrador activo.',
    );
  }
}

export function createFirestoreAdminUsersRepository(firestore: Firestore): AdminUsersRepository {
  const collection = firestore.collection('usuarios');

  async function runTransaction<T>(
    requesterUid: string,
    action: (context: TransactionContext) => T | Promise<T>,
  ): Promise<T> {
    return firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(collection.limit(MAX_SUPPORTED_USERS + 1));
      const records = snapshot.docs.map(snapshotToRecord);
      requireCapacity(records);
      requireCanonicalRequester(records, requesterUid);
      const references = new Map(
        snapshot.docs.map((document) => [document.id, document.ref] as const),
      );
      return action({ transaction, records, references });
    });
  }

  return {
    async findCanonicalAdmin(uid) {
      const snapshot = await collection.where('uid', '==', uid).limit(2).get();
      if (snapshot.size !== 1 || !snapshot.docs[0]) {
        return null;
      }
      const record = snapshotToRecord(snapshot.docs[0]);
      return record.activo && record.rol === 'admin' ? record : null;
    },

    async list(limit) {
      const snapshot = await collection.limit(limit).get();
      return snapshot.docs.map(snapshotToRecord);
    },

    async create(requesterUid, input) {
      const reference = collection.doc();
      await runTransaction(requesterUid, ({ transaction, records }) => {
        requireCapacity(records, true);
        requireUniqueEmail(records, input.correo);
        transaction.create(reference, {
          uid: null,
          nombre: input.nombre,
          correo: input.correo,
          rol: input.rol,
          activo: input.activo,
          fechaCreacion: FieldValue.serverTimestamp(),
          ultimoAcceso: null,
        });
      });
      return reference.id;
    },

    async update(requesterUid, input) {
      return runTransaction(requesterUid, ({ transaction, records, references }) => {
        const previous = requireTarget(records, input.documentId);
        if (previous.uid && previous.correo !== input.correo) {
          throw new AdminUsersError(
            'uid-bound-email-change-forbidden',
            'failed-precondition',
            'El correo no puede cambiarse después de asociar la cuenta.',
          );
        }
        if (previous.uid === requesterUid && previous.rol === 'admin' && input.rol !== 'admin') {
          throw new AdminUsersError(
            'self-status-change-forbidden',
            'failed-precondition',
            'No puede reducir su propio rol.',
          );
        }
        if (previous.activo && previous.rol === 'admin' && input.rol !== 'admin') {
          requireAnotherActiveAdmin(records, previous);
        }
        requireUniqueEmail(records, input.correo, previous.documentId);

        const reference = references.get(previous.documentId);
        if (!reference) {
          throw new AdminUsersError('user-not-found', 'not-found', 'El usuario no existe.');
        }
        transaction.update(reference, {
          nombre: input.nombre,
          correo: input.correo,
          rol: input.rol,
        });
        return {
          previous,
          current: {
            ...previous,
            nombre: input.nombre,
            correo: input.correo,
            rol: input.rol,
          },
        } satisfies UserMutationResult;
      });
    },

    async setStatus(requesterUid, input) {
      return runTransaction(requesterUid, ({ transaction, records, references }) => {
        const previous = requireTarget(records, input.documentId);
        if (previous.uid === requesterUid && !input.activo) {
          throw new AdminUsersError(
            'self-status-change-forbidden',
            'failed-precondition',
            'No puede desactivar su propio registro.',
          );
        }
        if (previous.activo && previous.rol === 'admin' && !input.activo) {
          requireAnotherActiveAdmin(records, previous);
        }

        const reference = references.get(previous.documentId);
        if (!reference) {
          throw new AdminUsersError('user-not-found', 'not-found', 'El usuario no existe.');
        }
        if (previous.activo !== input.activo) {
          transaction.update(reference, { activo: input.activo });
        }
        return {
          previous,
          current: { ...previous, activo: input.activo },
        } satisfies UserMutationResult;
      });
    },

    async prepareDeletion(requesterUid, documentId) {
      return runTransaction(requesterUid, ({ transaction, records, references }) => {
        const previous = requireTarget(records, documentId);
        if (previous.uid === requesterUid) {
          throw new AdminUsersError(
            'self-delete-forbidden',
            'failed-precondition',
            'No puede eliminar su propio registro.',
          );
        }
        if (previous.activo && previous.rol === 'admin') {
          requireAnotherActiveAdmin(records, previous);
        }

        const reference = references.get(previous.documentId);
        if (!reference) {
          throw new AdminUsersError('user-not-found', 'not-found', 'El usuario no existe.');
        }
        if (previous.activo) {
          transaction.update(reference, { activo: false });
        }
        return {
          previous,
          current: { ...previous, activo: false },
        } satisfies UserMutationResult;
      });
    },

    async completeDeletion(requesterUid, documentId) {
      await runTransaction(requesterUid, ({ transaction, records, references }) => {
        const target = requireTarget(records, documentId);
        if (target.uid === requesterUid) {
          throw new AdminUsersError(
            'self-delete-forbidden',
            'failed-precondition',
            'No puede eliminar su propio registro.',
          );
        }
        if (target.activo) {
          throw new Error('Target must be inactive before deletion.');
        }
        const reference = references.get(documentId);
        if (!reference) {
          throw new AdminUsersError('user-not-found', 'not-found', 'El usuario no existe.');
        }
        transaction.delete(reference);
      });
    },
  };
}
