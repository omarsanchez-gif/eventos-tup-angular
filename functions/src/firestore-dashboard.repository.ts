import {
  Timestamp,
  type DocumentData,
  type Firestore,
  type Query,
  type QueryDocumentSnapshot,
} from 'firebase-admin/firestore';

import type {
  DashboardCanonicalRequester,
  DashboardEventRecord,
  DashboardRepository,
} from './dashboard.js';

const nonCancelledStatuses = ['programado', 'registrado', 'en_proceso', 'finalizado'] as const;

function dateFromUnknown(value: unknown): Date | null {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  return null;
}

function eventFromSnapshot(snapshot: QueryDocumentSnapshot<DocumentData>): DashboardEventRecord {
  const data = snapshot.data();
  return {
    eventId: snapshot.id,
    name: typeof data['nombreEvento'] === 'string' ? data['nombreEvento'] : 'Evento sin nombre',
    dateStart: typeof data['fechaInicio'] === 'string' ? data['fechaInicio'] : '',
    timeStart: typeof data['horaInicio'] === 'string' ? data['horaInicio'] : '',
    responsible: typeof data['responsable'] === 'string' ? data['responsable'] : '',
    persistedStatus: data['estatus'],
    start: dateFromUnknown(data['inicioAt']),
    end: dateFromUnknown(data['finAt']),
    createdAt: dateFromUnknown(data['fechaCreacion']),
    updatedAt: dateFromUnknown(data['fechaActualizacion']),
  };
}

export function createFirestoreDashboardRepository(firestore: Firestore): DashboardRepository {
  const events = firestore.collection('eventos');
  const users = firestore.collection('usuarios');

  function upcomingQuery(start: Date, end: Date): Query<DocumentData> {
    return events
      .where('estatus', 'in', nonCancelledStatuses)
      .where('inicioAt', '>=', Timestamp.fromDate(start))
      .where('inicioAt', '<', Timestamp.fromDate(end));
  }

  return {
    async findCanonicalRequester(uid): Promise<DashboardCanonicalRequester | null> {
      const snapshot = await users.where('uid', '==', uid).limit(2).get();
      if (snapshot.size !== 1 || !snapshot.docs[0]) return null;
      const data = snapshot.docs[0].data();
      if (data['rol'] !== 'admin' && data['rol'] !== 'usuario') return null;
      return { active: data['activo'] === true, role: data['rol'] };
    },

    async countRegisteredEvents() {
      return (await events.count().get()).data().count;
    },

    async countUpcomingEvents(start, end) {
      return (await upcomingQuery(start, end).count().get()).data().count;
    },

    async countActiveUsers() {
      return (await users.where('activo', '==', true).count().get()).data().count;
    },

    async countEventsWithProtocol() {
      return (await events.where('protocoloUrl', '>', '').count().get()).data().count;
    },

    async listUpcomingEvents(start, end, limit) {
      const snapshot = await upcomingQuery(start, end)
        .orderBy('inicioAt', 'asc')
        .orderBy('__name__', 'asc')
        .limit(limit)
        .get();
      return snapshot.docs.map(eventFromSnapshot);
    },

    async listRecentActivity(limit) {
      const snapshot = await events
        .orderBy('fechaActualizacion', 'desc')
        .orderBy('__name__', 'desc')
        .limit(limit)
        .get();
      return snapshot.docs.map(eventFromSnapshot);
    },
  };
}
