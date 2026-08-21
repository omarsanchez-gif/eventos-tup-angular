import { FieldValue, type Firestore, type QueryDocumentSnapshot } from 'firebase-admin/firestore';

import {
  AdminCampusesError,
  CAMPUS_DAYS,
  MAX_SUPPORTED_CAMPUSES,
  type AdminCampusesRepository,
  type CampusSchedule,
  type CanonicalCampusRequester,
  type ManagedCampusRecord,
} from './admin-campuses.js';

function schedule(value: unknown): CampusSchedule {
  const data = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return Object.fromEntries(
    CAMPUS_DAYS.map((day) => {
      const raw = data[day] as Record<string, unknown> | undefined;
      return [
        day,
        {
          operativo: raw?.['operativo'] === true,
          inicio: typeof raw?.['inicio'] === 'string' ? raw['inicio'] : null,
          fin: typeof raw?.['fin'] === 'string' ? raw['fin'] : null,
        },
      ];
    }),
  ) as unknown as CampusSchedule;
}
function record(snapshot: QueryDocumentSnapshot): ManagedCampusRecord {
  const data = snapshot.data();
  return {
    documentId: snapshot.id,
    nombre: typeof data['nombre'] === 'string' ? data['nombre'] : '',
    nombreNormalizado:
      typeof data['nombreNormalizado'] === 'string' ? data['nombreNormalizado'] : '',
    clave: typeof data['clave'] === 'string' ? data['clave'] : '',
    direccion: typeof data['direccion'] === 'string' ? data['direccion'] : null,
    referencia: typeof data['referencia'] === 'string' ? data['referencia'] : null,
    activo: data['activo'] === true,
    utilizado: data['utilizado'] === true,
    horariosSistemas: schedule(data['horariosSistemas']),
    fechaCreacion: data['fechaCreacion'] ?? null,
    fechaActualizacion: data['fechaActualizacion'] ?? null,
  };
}
function canonical(snapshots: readonly QueryDocumentSnapshot[]): CanonicalCampusRequester | null {
  if (snapshots.length !== 1 || !snapshots[0]) return null;
  const data = snapshots[0].data();
  if (data['rol'] !== 'admin' && data['rol'] !== 'usuario') return null;
  return {
    uid: typeof data['uid'] === 'string' ? data['uid'] : '',
    role: data['rol'],
    activo: data['activo'] === true,
  };
}
function target(records: readonly ManagedCampusRecord[], id: string): ManagedCampusRecord {
  const found = records.find((item) => item.documentId === id);
  if (!found) throw new AdminCampusesError('campus-not-found', 'not-found', 'El campus no existe.');
  return found;
}
function operational(value: CampusSchedule): boolean {
  return CAMPUS_DAYS.some((day) => day !== 'domingo' && value[day].operativo);
}

export function createFirestoreAdminCampusesRepository(
  firestore: Firestore,
): AdminCampusesRepository {
  const campuses = firestore.collection('campus');
  const users = firestore.collection('usuarios');
  async function transact<T>(
    uid: string,
    action: (
      transaction: FirebaseFirestore.Transaction,
      records: readonly ManagedCampusRecord[],
    ) => T | Promise<T>,
  ): Promise<T> {
    return firestore.runTransaction(async (transaction) => {
      const requester = await transaction.get(users.where('uid', '==', uid).limit(2));
      if (canonical(requester.docs)?.role !== 'admin' || !canonical(requester.docs)?.activo) {
        throw new AdminCampusesError(
          'permission-denied',
          'permission-denied',
          'No tiene permisos.',
        );
      }
      const snapshot = await transaction.get(campuses.limit(MAX_SUPPORTED_CAMPUSES + 1));
      const records = snapshot.docs.map(record);
      if (records.length > MAX_SUPPORTED_CAMPUSES) {
        throw new AdminCampusesError(
          'campus-capacity-exceeded',
          'resource-exhausted',
          'La cantidad de campus supera el límite.',
        );
      }
      return action(transaction, records);
    });
  }
  function unique(
    records: readonly ManagedCampusRecord[],
    input: { nombreNormalizado: string; clave: string },
    excluded?: string,
  ): void {
    if (
      records.some(
        (item) =>
          item.documentId !== excluded && item.nombreNormalizado === input.nombreNormalizado,
      )
    ) {
      throw new AdminCampusesError(
        'campus-name-exists',
        'already-exists',
        'Ya existe un campus con ese nombre.',
      );
    }
    if (records.some((item) => item.documentId !== excluded && item.clave === input.clave)) {
      throw new AdminCampusesError(
        'campus-code-exists',
        'already-exists',
        'Ya existe un campus con esa clave.',
      );
    }
  }
  return {
    async findCanonicalRequester(uid) {
      return canonical((await users.where('uid', '==', uid).limit(2).get()).docs);
    },
    async list(limit) {
      return (await campuses.limit(limit).get()).docs.map(record);
    },
    async create(uid, input) {
      const reference = campuses.doc();
      await transact(uid, (transaction, records) => {
        if (records.length >= MAX_SUPPORTED_CAMPUSES) {
          throw new AdminCampusesError(
            'campus-capacity-exceeded',
            'resource-exhausted',
            'La cantidad de campus supera el límite.',
          );
        }
        unique(records, input);
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
      await transact(uid, (transaction, records) => {
        const current = target(records, input.documentId);
        unique(records, input, current.documentId);
        if (current.utilizado && current.clave !== input.clave) {
          throw new AdminCampusesError(
            'campus-code-immutable',
            'failed-precondition',
            'La clave de un campus utilizado no puede cambiar.',
          );
        }
        if (current.activo && !operational(input.horariosSistemas)) {
          throw new AdminCampusesError(
            'active-campus-requires-schedule',
            'failed-precondition',
            'Un campus activo requiere al menos un día operativo.',
          );
        }
        transaction.update(campuses.doc(current.documentId), {
          nombre: input.nombre,
          nombreNormalizado: input.nombreNormalizado,
          clave: input.clave,
          direccion: input.direccion,
          referencia: input.referencia,
          horariosSistemas: input.horariosSistemas,
          fechaActualizacion: FieldValue.serverTimestamp(),
        });
      });
    },
    async setStatus(uid, input) {
      await transact(uid, (transaction, records) => {
        const current = target(records, input.documentId);
        if (input.activo && !operational(current.horariosSistemas)) {
          throw new AdminCampusesError(
            'active-campus-requires-schedule',
            'failed-precondition',
            'Un campus activo requiere al menos un día operativo.',
          );
        }
        if (current.activo !== input.activo) {
          transaction.update(campuses.doc(current.documentId), {
            activo: input.activo,
            fechaActualizacion: FieldValue.serverTimestamp(),
          });
        }
      });
    },
    async delete(uid, id) {
      await transact(uid, (transaction, records) => {
        const current = target(records, id);
        if (current.utilizado) {
          throw new AdminCampusesError(
            'campus-in-use',
            'failed-precondition',
            'El campus ya fue utilizado y solo puede suspenderse.',
          );
        }
        transaction.delete(campuses.doc(current.documentId));
      });
    },
  };
}
