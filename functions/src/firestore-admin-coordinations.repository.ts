import {
  FieldValue,
  type DocumentData,
  type DocumentReference,
  type Firestore,
  type QueryDocumentSnapshot,
  type Transaction,
} from 'firebase-admin/firestore';

import {
  AdminCoordinationsError,
  MAX_SUPPORTED_COORDINATIONS,
  type AdminCoordinationsRepository,
  type CanonicalCoordinationRequester,
  type ManagedCoordinationRecord,
} from './admin-coordinations.js';

interface TransactionContext {
  readonly transaction: Transaction;
  readonly records: readonly ManagedCoordinationRecord[];
  readonly references: ReadonlyMap<string, DocumentReference<DocumentData>>;
}

function snapshotToRecord(
  snapshot: QueryDocumentSnapshot<DocumentData>,
): ManagedCoordinationRecord {
  const data = snapshot.data();
  return {
    documentId: snapshot.id,
    nombre: typeof data['nombre'] === 'string' ? data['nombre'] : '',
    nombreNormalizado:
      typeof data['nombreNormalizado'] === 'string' ? data['nombreNormalizado'] : '',
    correos: Array.isArray(data['correos'])
      ? data['correos'].filter((value): value is string => typeof value === 'string')
      : [],
    activo: data['activo'] === true,
    utilizada: data['utilizada'] === true,
    fechaCreacion: data['fechaCreacion'] ?? null,
    fechaActualizacion: data['fechaActualizacion'] ?? null,
  };
}

function canonicalRequesterFromSnapshots(
  snapshots: readonly QueryDocumentSnapshot<DocumentData>[],
): CanonicalCoordinationRequester | null {
  if (snapshots.length !== 1 || !snapshots[0]) {
    return null;
  }
  const data = snapshots[0].data();
  const role = data['rol'];
  if (role !== 'admin' && role !== 'usuario') {
    return null;
  }
  return {
    uid: typeof data['uid'] === 'string' ? data['uid'] : '',
    role,
    activo: data['activo'] === true,
  };
}

function requireTarget(
  records: readonly ManagedCoordinationRecord[],
  documentId: string,
): ManagedCoordinationRecord {
  const target = records.find((record) => record.documentId === documentId);
  if (!target) {
    throw new AdminCoordinationsError(
      'coordination-not-found',
      'not-found',
      'La coordinación no existe.',
    );
  }
  return target;
}

function requireCapacity(records: readonly ManagedCoordinationRecord[], creating = false): void {
  if (
    records.length > MAX_SUPPORTED_COORDINATIONS ||
    (creating && records.length >= MAX_SUPPORTED_COORDINATIONS)
  ) {
    throw new AdminCoordinationsError(
      'coordination-capacity-exceeded',
      'resource-exhausted',
      'La cantidad de coordinaciones supera el límite de esta versión.',
    );
  }
}

function requireUniqueName(
  records: readonly ManagedCoordinationRecord[],
  normalizedName: string,
  excludedDocumentId?: string,
): void {
  if (
    records.some(
      (record) =>
        record.documentId !== excludedDocumentId && record.nombreNormalizado === normalizedName,
    )
  ) {
    throw new AdminCoordinationsError(
      'coordination-name-exists',
      'already-exists',
      'Ya existe una coordinación con ese nombre.',
    );
  }
}

export function createFirestoreAdminCoordinationsRepository(
  firestore: Firestore,
): AdminCoordinationsRepository {
  const coordinations = firestore.collection('coordinaciones');
  const users = firestore.collection('usuarios');

  async function runAdminTransaction<T>(
    requesterUid: string,
    action: (context: TransactionContext) => T | Promise<T>,
  ): Promise<T> {
    return firestore.runTransaction(async (transaction) => {
      const requesterQuery = users.where('uid', '==', requesterUid).limit(2);
      const requesterSnapshot = await transaction.get(requesterQuery);
      const canonical = canonicalRequesterFromSnapshots(requesterSnapshot.docs);
      if (!canonical?.activo || canonical.role !== 'admin') {
        throw new AdminCoordinationsError(
          'permission-denied',
          'permission-denied',
          'No tiene permisos para administrar coordinaciones.',
        );
      }

      const snapshot = await transaction.get(coordinations.limit(MAX_SUPPORTED_COORDINATIONS + 1));
      const records = snapshot.docs.map(snapshotToRecord);
      requireCapacity(records);
      const references = new Map(
        snapshot.docs.map((document) => [document.id, document.ref] as const),
      );
      return action({ transaction, records, references });
    });
  }

  return {
    async findCanonicalRequester(uid) {
      const snapshot = await users.where('uid', '==', uid).limit(2).get();
      return canonicalRequesterFromSnapshots(snapshot.docs);
    },

    async list(limit) {
      const snapshot = await coordinations.limit(limit).get();
      return snapshot.docs.map(snapshotToRecord);
    },

    async create(requesterUid, input) {
      const reference = coordinations.doc();
      await runAdminTransaction(requesterUid, ({ transaction, records }) => {
        requireCapacity(records, true);
        requireUniqueName(records, input.nombreNormalizado);
        transaction.create(reference, {
          nombre: input.nombre,
          nombreNormalizado: input.nombreNormalizado,
          correos: [...input.correos],
          activo: input.activo,
          utilizada: false,
          fechaCreacion: FieldValue.serverTimestamp(),
          fechaActualizacion: FieldValue.serverTimestamp(),
        });
      });
      return reference.id;
    },

    async update(requesterUid, input) {
      await runAdminTransaction(requesterUid, ({ transaction, records, references }) => {
        const target = requireTarget(records, input.documentId);
        if (target.activo && input.correos.length === 0) {
          throw new AdminCoordinationsError(
            'active-coordination-requires-email',
            'failed-precondition',
            'Una coordinación activa requiere al menos un correo.',
          );
        }
        requireUniqueName(records, input.nombreNormalizado, target.documentId);
        const reference = references.get(target.documentId);
        if (!reference) {
          throw new AdminCoordinationsError(
            'coordination-not-found',
            'not-found',
            'La coordinación no existe.',
          );
        }
        transaction.update(reference, {
          nombre: input.nombre,
          nombreNormalizado: input.nombreNormalizado,
          correos: [...input.correos],
          fechaActualizacion: FieldValue.serverTimestamp(),
        });
      });
    },

    async setStatus(requesterUid, input) {
      await runAdminTransaction(requesterUid, ({ transaction, records, references }) => {
        const target = requireTarget(records, input.documentId);
        if (input.activo && target.correos.length === 0) {
          throw new AdminCoordinationsError(
            'active-coordination-requires-email',
            'failed-precondition',
            'Una coordinación activa requiere al menos un correo.',
          );
        }
        const reference = references.get(target.documentId);
        if (!reference) {
          throw new AdminCoordinationsError(
            'coordination-not-found',
            'not-found',
            'La coordinación no existe.',
          );
        }
        if (target.activo !== input.activo) {
          transaction.update(reference, {
            activo: input.activo,
            fechaActualizacion: FieldValue.serverTimestamp(),
          });
        }
      });
    },

    async delete(requesterUid, documentId) {
      await runAdminTransaction(requesterUid, ({ transaction, records, references }) => {
        const target = requireTarget(records, documentId);
        if (target.utilizada) {
          throw new AdminCoordinationsError(
            'coordination-in-use',
            'failed-precondition',
            'La coordinación ya fue utilizada y solo puede suspenderse.',
          );
        }
        const reference = references.get(documentId);
        if (!reference) {
          throw new AdminCoordinationsError(
            'coordination-not-found',
            'not-found',
            'La coordinación no existe.',
          );
        }
        transaction.delete(reference);
      });
    },
  };
}
