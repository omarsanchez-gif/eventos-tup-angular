import {
  FieldValue,
  type DocumentSnapshot,
  type Firestore,
  type QueryDocumentSnapshot,
  type Transaction,
} from 'firebase-admin/firestore';

import {
  AdminEquipmentError,
  MAX_SUPPORTED_EQUIPMENT,
  type AdminEquipmentRepository,
  type CanonicalEquipmentRequester,
  type EquipmentCampusRecord,
  type EquipmentClassification,
  type EquipmentMutationInput,
  type ManagedEquipmentRecord,
} from './admin-equipment.js';

function classification(value: unknown): EquipmentClassification {
  return value === 'transferible' ? 'transferible' : 'fijo';
}
function equipmentRecord(snapshot: QueryDocumentSnapshot): ManagedEquipmentRecord {
  const data = snapshot.data();
  return {
    documentId: snapshot.id,
    nombre: typeof data['nombre'] === 'string' ? data['nombre'] : '',
    nombreNormalizado:
      typeof data['nombreNormalizado'] === 'string' ? data['nombreNormalizado'] : '',
    campusBaseId: typeof data['campusBaseId'] === 'string' ? data['campusBaseId'] : '',
    cantidadOperativa:
      typeof data['cantidadOperativa'] === 'number' ? data['cantidadOperativa'] : 0,
    clasificacion: classification(data['clasificacion']),
    campusDestinoIdsPermitidos: Array.isArray(data['campusDestinoIdsPermitidos'])
      ? data['campusDestinoIdsPermitidos'].filter(
          (value: unknown): value is string => typeof value === 'string',
        )
      : [],
    activo: data['activo'] === true,
    utilizado: data['utilizado'] === true,
    fechaCreacion: data['fechaCreacion'] ?? null,
    fechaActualizacion: data['fechaActualizacion'] ?? null,
  };
}
function canonical(
  snapshots: readonly QueryDocumentSnapshot[],
): CanonicalEquipmentRequester | null {
  if (snapshots.length !== 1 || !snapshots[0]) return null;
  const data = snapshots[0].data();
  if (data['rol'] !== 'admin' && data['rol'] !== 'usuario') return null;
  return {
    uid: typeof data['uid'] === 'string' ? data['uid'] : '',
    role: data['rol'],
    activo: data['activo'] === true,
  };
}
function campusRecord(snapshot: DocumentSnapshot): EquipmentCampusRecord | null {
  if (!snapshot.exists) return null;
  const data = snapshot.data() ?? {};
  return {
    documentId: snapshot.id,
    nombre: typeof data['nombre'] === 'string' ? data['nombre'] : '',
    activo: data['activo'] === true,
  };
}
function target(records: readonly ManagedEquipmentRecord[], id: string): ManagedEquipmentRecord {
  const found = records.find((item) => item.documentId === id);
  if (!found) {
    throw new AdminEquipmentError('equipment-not-found', 'not-found', 'El equipo no existe.');
  }
  return found;
}

export function createFirestoreAdminEquipmentRepository(
  firestore: Firestore,
): AdminEquipmentRepository {
  const equipment = firestore.collection('equipos');
  const campuses = firestore.collection('campus');
  const users = firestore.collection('usuarios');

  async function transact<T>(
    uid: string,
    action: (
      transaction: Transaction,
      records: readonly ManagedEquipmentRecord[],
    ) => T | Promise<T>,
  ): Promise<T> {
    return firestore.runTransaction(async (transaction) => {
      const requester = await transaction.get(users.where('uid', '==', uid).limit(2));
      const requesterRecord = canonical(requester.docs);
      if (requesterRecord?.role !== 'admin' || !requesterRecord.activo) {
        throw new AdminEquipmentError(
          'permission-denied',
          'permission-denied',
          'No tiene permisos.',
        );
      }
      const snapshot = await transaction.get(equipment.limit(MAX_SUPPORTED_EQUIPMENT + 1));
      const records = snapshot.docs.map(equipmentRecord);
      if (records.length > MAX_SUPPORTED_EQUIPMENT) {
        throw new AdminEquipmentError(
          'equipment-capacity-exceeded',
          'resource-exhausted',
          'La cantidad de equipos supera el límite.',
        );
      }
      return action(transaction, records);
    });
  }

  function unique(
    records: readonly ManagedEquipmentRecord[],
    input: Pick<EquipmentMutationInput, 'nombreNormalizado' | 'campusBaseId'>,
    excluded?: string,
  ): void {
    if (
      records.some(
        (item) =>
          item.documentId !== excluded &&
          item.nombreNormalizado === input.nombreNormalizado &&
          item.campusBaseId === input.campusBaseId,
      )
    ) {
      throw new AdminEquipmentError(
        'equipment-name-exists',
        'already-exists',
        'Ya existe un equipo con ese nombre en el campus.',
      );
    }
  }

  async function validateCampuses(
    transaction: Transaction,
    input: Pick<
      EquipmentMutationInput,
      'campusBaseId' | 'campusDestinoIdsPermitidos' | 'clasificacion'
    >,
  ): Promise<readonly DocumentSnapshot[]> {
    const ids = [...new Set([input.campusBaseId, ...input.campusDestinoIdsPermitidos])];
    const snapshots = await Promise.all(ids.map((id) => transaction.get(campuses.doc(id))));
    const base = snapshots.find((snapshot) => snapshot.id === input.campusBaseId);
    if (!base?.exists) {
      throw new AdminEquipmentError('campus-not-found', 'not-found', 'El campus base no existe.');
    }
    if (base.data()?.['activo'] !== true) {
      throw new AdminEquipmentError(
        'campus-inactive',
        'failed-precondition',
        'El campus base está suspendido.',
      );
    }
    for (const destinationId of input.campusDestinoIdsPermitidos) {
      const destination = snapshots.find((snapshot) => snapshot.id === destinationId);
      if (!destination?.exists || destination.data()?.['activo'] !== true) {
        throw new AdminEquipmentError(
          'invalid-destination-campus',
          'failed-precondition',
          'Un campus destino no existe o está suspendido.',
        );
      }
    }
    return snapshots;
  }

  function markCampusesUsed(
    transaction: Transaction,
    snapshots: readonly DocumentSnapshot[],
  ): void {
    snapshots.forEach((snapshot) => {
      if (snapshot.exists && snapshot.data()?.['utilizado'] !== true) {
        transaction.update(snapshot.ref, {
          utilizado: true,
          fechaActualizacion: FieldValue.serverTimestamp(),
        });
      }
    });
  }

  return {
    async findCanonicalRequester(uid) {
      return canonical((await users.where('uid', '==', uid).limit(2).get()).docs);
    },
    async list(limit) {
      return (await equipment.limit(limit).get()).docs.map(equipmentRecord);
    },
    async findCampuses(documentIds) {
      if (documentIds.length === 0) return [];
      const snapshots = await firestore.getAll(...documentIds.map((id) => campuses.doc(id)));
      return snapshots
        .map(campusRecord)
        .filter((record): record is EquipmentCampusRecord => record !== null);
    },
    async create(uid, input) {
      const reference = equipment.doc();
      await transact(uid, async (transaction, records) => {
        if (records.length >= MAX_SUPPORTED_EQUIPMENT) {
          throw new AdminEquipmentError(
            'equipment-capacity-exceeded',
            'resource-exhausted',
            'La cantidad de equipos supera el límite.',
          );
        }
        unique(records, input);
        const campusSnapshots = await validateCampuses(transaction, input);
        markCampusesUsed(transaction, campusSnapshots);
        transaction.create(reference, {
          ...input,
          utilizado: false,
          fechaCreacion: FieldValue.serverTimestamp(),
          fechaActualizacion: FieldValue.serverTimestamp(),
        });
      });
      return reference.id;
    },
    async update(uid, input) {
      await transact(uid, async (transaction, records) => {
        const current = target(records, input.documentId);
        unique(records, input, current.documentId);
        if (current.utilizado && current.campusBaseId !== input.campusBaseId) {
          throw new AdminEquipmentError(
            'equipment-base-campus-immutable',
            'failed-precondition',
            'El campus base de un equipo utilizado no puede cambiar.',
          );
        }
        if (current.activo && input.cantidadOperativa < 1) {
          throw new AdminEquipmentError(
            'active-equipment-requires-stock',
            'failed-precondition',
            'Un equipo activo requiere al menos una unidad operativa.',
          );
        }
        const campusSnapshots = await validateCampuses(transaction, input);
        markCampusesUsed(transaction, campusSnapshots);
        transaction.update(equipment.doc(current.documentId), {
          nombre: input.nombre,
          nombreNormalizado: input.nombreNormalizado,
          campusBaseId: input.campusBaseId,
          cantidadOperativa: input.cantidadOperativa,
          clasificacion: input.clasificacion,
          campusDestinoIdsPermitidos: input.campusDestinoIdsPermitidos,
          fechaActualizacion: FieldValue.serverTimestamp(),
        });
      });
    },
    async setStatus(uid, input) {
      await transact(uid, async (transaction, records) => {
        const current = target(records, input.documentId);
        if (input.activo) {
          if (current.cantidadOperativa < 1) {
            throw new AdminEquipmentError(
              'active-equipment-requires-stock',
              'failed-precondition',
              'Un equipo activo requiere al menos una unidad operativa.',
            );
          }
          await validateCampuses(transaction, current);
        }
        if (current.activo !== input.activo) {
          transaction.update(equipment.doc(current.documentId), {
            activo: input.activo,
            fechaActualizacion: FieldValue.serverTimestamp(),
          });
        }
      });
    },
    async delete(uid, documentId) {
      await transact(uid, (transaction, records) => {
        const current = target(records, documentId);
        if (current.utilizado) {
          throw new AdminEquipmentError(
            'equipment-in-use',
            'failed-precondition',
            'El equipo ya fue utilizado y solo puede suspenderse.',
          );
        }
        transaction.delete(equipment.doc(current.documentId));
      });
    },
  };
}
