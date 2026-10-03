import { deleteApp, initializeApp, type App } from 'firebase-admin/app';
import { getFirestore, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  getDashboardSummary,
  type DashboardDependencies,
  type DashboardRequestIdentity,
} from '../../functions/src/dashboard.js';
import { createFirestoreDashboardRepository } from '../../functions/src/firestore-dashboard.repository.js';

const projectId = 'demo-eventos-tup';
const fixedNow = new Date('2026-10-03T12:00:00-05:00');
const identity: DashboardRequestIdentity = {
  uid: 'user-uid',
  authorized: true,
  role: 'usuario',
};
let app: App;
let firestore: Firestore;

async function clearCollection(name: string): Promise<void> {
  const references = await firestore.collection(name).listDocuments();
  if (references.length === 0) return;
  const batch = firestore.batch();
  references.forEach((reference) => batch.delete(reference));
  await batch.commit();
}

function event(input: {
  readonly name: string;
  readonly start: string;
  readonly end: string;
  readonly status: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly protocolUrl?: string | null;
}) {
  const start = new Date(input.start);
  const end = new Date(input.end);
  return {
    nombreEvento: input.name,
    fechaInicio: start.toISOString().slice(0, 10),
    horaInicio: start.toISOString().slice(11, 16),
    fechaFin: end.toISOString().slice(0, 10),
    horaFin: end.toISOString().slice(11, 16),
    inicioAt: Timestamp.fromDate(start),
    finAt: Timestamp.fromDate(end),
    responsable: 'Omar Sánchez',
    estatus: input.status,
    protocoloUrl: input.protocolUrl ?? null,
    fechaCreacion: Timestamp.fromDate(new Date(input.createdAt)),
    fechaActualizacion: Timestamp.fromDate(new Date(input.updatedAt)),
  };
}

beforeAll(() => {
  process.env['FIRESTORE_EMULATOR_HOST'] ??= '127.0.0.1:8080';
  app = initializeApp({ projectId }, 'dashboard-integration');
  firestore = getFirestore(app);
});

beforeEach(async () => {
  await Promise.all([clearCollection('eventos'), clearCollection('usuarios')]);
  const batch = firestore.batch();
  batch.set(firestore.doc('usuarios/user'), {
    uid: identity.uid,
    nombre: 'Omar Sánchez',
    correo: 'omar.sanchez@tecplayacar.edu.mx',
    rol: 'usuario',
    activo: true,
    fechaCreacion: Timestamp.fromDate(fixedNow),
  });
  batch.set(firestore.doc('usuarios/inactive'), {
    uid: 'inactive-uid',
    nombre: 'Persona inactiva',
    correo: 'inactiva@tecplayacar.edu.mx',
    rol: 'usuario',
    activo: false,
    fechaCreacion: Timestamp.fromDate(fixedNow),
  });
  batch.set(
    firestore.doc('eventos/upcoming-a'),
    event({
      name: 'Próximo A',
      start: '2026-10-05T15:00:00.000Z',
      end: '2026-10-05T17:00:00.000Z',
      status: 'programado',
      protocolUrl: 'https://storage.test/a.pdf',
      createdAt: '2026-10-01T14:00:00.000Z',
      updatedAt: '2026-10-01T14:00:00.000Z',
    }),
  );
  batch.set(
    firestore.doc('eventos/upcoming-b'),
    event({
      name: 'Próximo histórico',
      start: '2026-10-06T15:00:00.000Z',
      end: '2026-10-06T17:00:00.000Z',
      status: 'registrado',
      createdAt: '2026-09-30T14:00:00.000Z',
      updatedAt: '2026-10-02T14:00:00.000Z',
    }),
  );
  batch.set(
    firestore.doc('eventos/cancelled'),
    event({
      name: 'Cancelado',
      start: '2026-10-07T15:00:00.000Z',
      end: '2026-10-07T17:00:00.000Z',
      status: 'cancelado',
      protocolUrl: 'https://storage.test/cancelled.pdf',
      createdAt: '2026-09-29T14:00:00.000Z',
      updatedAt: '2026-10-03T14:00:00.000Z',
    }),
  );
  batch.set(
    firestore.doc('eventos/past'),
    event({
      name: 'Pasado',
      start: '2026-10-01T15:00:00.000Z',
      end: '2026-10-01T17:00:00.000Z',
      status: 'programado',
      createdAt: '2026-09-28T14:00:00.000Z',
      updatedAt: '2026-09-28T14:00:00.000Z',
    }),
  );
  batch.set(
    firestore.doc('eventos/upper-bound'),
    event({
      name: 'Límite superior',
      start: new Date(fixedNow.getTime() + 30 * 86_400_000).toISOString(),
      end: new Date(fixedNow.getTime() + 30 * 86_400_000 + 3_600_000).toISOString(),
      status: 'programado',
      createdAt: '2026-09-27T14:00:00.000Z',
      updatedAt: '2026-09-27T14:00:00.000Z',
    }),
  );
  await batch.commit();
});

afterAll(async () => {
  await deleteApp(app);
});

describe('Dashboard con Firestore Emulator', () => {
  it('calcula agregados y listas desde datos canónicos sin incluir cancelados como próximos', async () => {
    const dependencies: DashboardDependencies = {
      repository: createFirestoreDashboardRepository(firestore),
      clock: { now: () => fixedNow },
      logger: { warn: () => undefined },
    };
    const result = await getDashboardSummary(identity, {}, dependencies);
    expect(result.metrics).toEqual({
      registeredEvents: 5,
      upcomingEvents: 2,
      activeUsers: 1,
      eventsWithProtocol: 2,
    });
    expect(result.upcoming.map((item) => item.eventId)).toEqual(['upcoming-a', 'upcoming-b']);
    expect(result.recentActivity[0]).toMatchObject({
      eventId: 'cancelled',
      action: 'actualizacion',
      status: 'cancelado',
    });
    expect(result.unavailableSections).toEqual([]);
  });
});
