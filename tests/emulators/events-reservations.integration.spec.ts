import { deleteApp, initializeApp, type App } from 'firebase-admin/app';
import { getFirestore, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  cancelEventRecord,
  checkEventAvailability,
  confirmEquipmentReceptionRecord,
  confirmReservationCoverageRecord,
  createEventRecord,
  getEventDetailRecord,
  listCalendarEventRecords,
  listEventRecords,
  reportEquipmentDelayRecord,
  updateEventRecord,
  type EventRequestIdentity,
  type EventsDependencies,
} from '../../functions/src/events.js';
import { createFirestoreEventsRepository } from '../../functions/src/firestore-events.repository.js';
import { createEventIntegrationsService } from '../../functions/src/event-integrations.js';
import {
  backfillEventHistory,
  cleanupEventProtocols,
} from '../../functions/src/event-maintenance.js';

const projectId = 'demo-eventos-tup';
const identity: EventRequestIdentity = {
  uid: 'user-uid',
  authorized: true,
  role: 'usuario',
};
const adminIdentity: EventRequestIdentity = {
  uid: 'admin-uid',
  authorized: true,
  role: 'admin',
};
const fixedNow = new Date('2026-09-30T12:00:00-05:00');
let app: App;
let firestore: Firestore;
let dependencies: EventsDependencies;

function operatingDay(inicio: string, fin: string) {
  return { operativo: true, inicio, fin };
}

function schedule(inicio: string, fin: string, sabadoFin: string) {
  return {
    lunes: operatingDay(inicio, fin),
    martes: operatingDay(inicio, fin),
    miercoles: operatingDay(inicio, fin),
    jueves: operatingDay(inicio, fin),
    viernes: operatingDay(inicio, fin),
    sabado: operatingDay(inicio, sabadoFin),
    domingo: { operativo: false, inicio: null, fin: null },
  };
}

async function clear(name: string): Promise<void> {
  const documents = await firestore.collection(name).listDocuments();
  if (documents.length === 0) return;
  const batch = firestore.batch();
  documents.forEach((document) => batch.delete(document));
  await batch.commit();
}

async function seedBase(): Promise<void> {
  const now = Timestamp.now();
  await firestore.doc('usuarios/user').set({
    uid: identity.uid,
    nombre: 'Omar Sánchez',
    correo: 'omar.sanchez@tecplayacar.edu.mx',
    rol: 'usuario',
    activo: true,
    fechaCreacion: now,
  });
  await firestore.doc('usuarios/admin').set({
    uid: adminIdentity.uid,
    nombre: 'Admin Sistemas',
    correo: 'omar.sanchez@tecplayacar.edu.mx',
    rol: 'admin',
    activo: true,
    fechaCreacion: now,
  });
  await firestore.doc('campus/tup').set({
    nombre: 'Tecnológico Universitario Playacar',
    nombreNormalizado: 'tecnológico universitario playacar',
    clave: 'TUP',
    direccion: 'Av. Universidades',
    activo: true,
    utilizado: false,
    horariosSistemas: schedule('08:00', '20:00', '18:00'),
    fechaCreacion: now,
    fechaActualizacion: now,
  });
  await firestore.doc('coordinaciones/sistemas').set({
    nombre: 'Sistemas',
    nombreNormalizado: 'sistemas',
    correos: ['omar.sanchez@tecplayacar.edu.mx'],
    activo: true,
    utilizada: false,
    fechaCreacion: now,
    fechaActualizacion: now,
  });
  await firestore.doc('configuracion/logisticaEquipos').set({
    coordinacionSistemasId: 'sistemas',
    montajeMinutos: 60,
    desmontajeMinutos: 30,
    horaSalidaTraslado: '17:00',
    duracionTrasladoInicialMinutos: 30,
    margenLiberacionRegresoMinutos: 60,
    zonaHoraria: 'America/Cancun',
  });
}

async function seedEquipment(id: string, quantity = 1): Promise<void> {
  const now = Timestamp.now();
  await firestore.doc(`equipos/${id}`).set({
    nombre: `Equipo ${id}`,
    nombreNormalizado: `equipo ${id}`,
    campusBaseId: 'tup',
    cantidadOperativa: quantity,
    clasificacion: 'fijo',
    campusDestinoIdsPermitidos: [],
    activo: true,
    utilizado: false,
    fechaCreacion: now,
    fechaActualizacion: now,
  });
}

function payload(equipmentIds: readonly string[], start = '12:00', end = '14:00') {
  return {
    nombreEvento: 'Evento de prueba',
    campusId: 'tup',
    fechaInicio: '2026-10-06',
    horaInicio: start,
    fechaFin: '2026-10-06',
    horaFin: end,
    observaciones: '',
    coordinacionIds: ['sistemas'],
    equiposSolicitados: equipmentIds.map((equipoId) => ({
      equipoId,
      cantidad: 1,
    })),
    protocoloUrl: 'https://storage.test/protocolo.pdf',
    protocoloNombre: 'protocolo.pdf',
  };
}

describe('Eventos y reservaciones con Firestore Emulator', () => {
  beforeAll(() => {
    app = initializeApp({ projectId }, 'events-reservations-emulator-tests');
    firestore = getFirestore(app);
    dependencies = {
      repository: createFirestoreEventsRepository(firestore),
      clock: { now: () => fixedNow },
      logger: { warn() {}, error() {} },
      protocols: {
        async validate() {
          return { path: 'eventos/2026/protocolo.pdf' };
        },
        async remove() {},
      },
    };
  });

  beforeEach(async () => {
    await Promise.all(
      [
        'eventos',
        'reservasEquipo',
        'controlReservasEquipo',
        'equipos',
        'coordinaciones',
        'campus',
        'usuarios',
        'configuracion',
        'notificacionesEventos',
      ].map(clear),
    );
    await seedBase();
  });

  afterAll(async () => {
    await Promise.all(
      [
        'eventos',
        'reservasEquipo',
        'controlReservasEquipo',
        'equipos',
        'coordinaciones',
        'campus',
        'usuarios',
        'configuracion',
        'notificacionesEventos',
      ].map(clear),
    );
    await deleteApp(app);
  });

  it('serializa dos confirmaciones concurrentes y evita sobreasignación fantasma', async () => {
    await seedEquipment('bocina', 1);
    const results = await Promise.allSettled([
      createEventRecord(identity, payload(['bocina']), dependencies),
      createEventRecord(identity, payload(['bocina']), dependencies),
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.find((result) => result.status === 'rejected')).toMatchObject({
      status: 'rejected',
      reason: { functionalCode: 'equipment-unavailable' },
    });
    expect((await firestore.collection('eventos').get()).size).toBe(1);
    expect((await firestore.collection('reservasEquipo').get()).size).toBe(1);
    expect((await firestore.doc('controlReservasEquipo/bocina').get()).data()?.['version']).toBe(1);
  });

  it('confirma todos los equipos o no escribe ninguno', async () => {
    await seedEquipment('bocina', 1);
    await seedEquipment('microfono', 1);
    await firestore.doc('reservasEquipo/existente').set({
      eventoId: 'evento-existente',
      equipoId: 'microfono',
      cantidad: 1,
      campusEventoId: 'tup',
      estado: 'confirmada',
      bloqueoInicio: Timestamp.fromDate(new Date('2026-10-06T16:00:00.000Z')),
      bloqueoFin: Timestamp.fromDate(new Date('2026-10-06T20:00:00.000Z')),
    });

    await expect(
      createEventRecord(identity, payload(['bocina', 'microfono']), dependencies),
    ).rejects.toMatchObject({ functionalCode: 'equipment-unavailable' });
    expect((await firestore.collection('eventos').get()).size).toBe(0);
    expect((await firestore.collection('reservasEquipo').get()).size).toBe(1);
    expect((await firestore.collection('controlReservasEquipo').get()).size).toBe(0);
    expect((await firestore.doc('equipos/bocina').get()).data()?.['utilizado']).toBe(false);
  });

  it('excluye solo la reserva propia al previsualizar una edición', async () => {
    await seedEquipment('bocina-edicion', 2);
    const own = await createEventRecord(identity, payload(['bocina-edicion']), dependencies);
    const other = await createEventRecord(adminIdentity, payload(['bocina-edicion']), dependencies);
    const availabilityRequest = {
      eventId: own.eventId,
      campusId: 'tup',
      fechaInicio: '2026-10-06',
      horaInicio: '12:00',
      fechaFin: '2026-10-06',
      horaFin: '14:00',
      equiposSolicitados: [{ equipoId: 'bocina-edicion', cantidad: 1 }],
    };

    await expect(
      checkEventAvailability(identity, availabilityRequest, dependencies),
    ).resolves.toMatchObject({
      confirmable: true,
      items: [
        {
          equipmentId: 'bocina-edicion',
          requested: 1,
          available: 1,
          confirmable: true,
        },
      ],
    });
    await expect(
      checkEventAvailability(
        identity,
        { ...availabilityRequest, eventId: other.eventId },
        dependencies,
      ),
    ).rejects.toMatchObject({ functionalCode: 'permission-denied' });
    await expect(
      checkEventAvailability(
        identity,
        { ...availabilityRequest, eventId: 'evento-inexistente' },
        dependencies,
      ),
    ).rejects.toMatchObject({ functionalCode: 'event-not-found' });
    await expect(
      checkEventAvailability(
        identity,
        {
          campusId: availabilityRequest.campusId,
          fechaInicio: availabilityRequest.fechaInicio,
          horaInicio: availabilityRequest.horaInicio,
          fechaFin: availabilityRequest.fechaFin,
          horaFin: availabilityRequest.horaFin,
          equiposSolicitados: availabilityRequest.equiposSolicitados,
        },
        dependencies,
      ),
    ).resolves.toMatchObject({
      confirmable: false,
      items: [{ equipmentId: 'bocina-edicion', available: 0, confirmable: false }],
    });

    await cancelEventRecord(identity, { eventId: own.eventId }, dependencies);
    await expect(
      checkEventAvailability(identity, availabilityRequest, dependencies),
    ).rejects.toMatchObject({ functionalCode: 'event-cancelled' });
  });

  it('incrementa la versión monotónica por cada reservación confirmada', async () => {
    await seedEquipment('proyector', 1);
    await createEventRecord(identity, payload(['proyector']), dependencies);
    await createEventRecord(identity, payload(['proyector'], '15:30', '17:00'), dependencies);

    expect((await firestore.doc('controlReservasEquipo/proyector').get()).data()?.['version']).toBe(
      2,
    );
    expect((await firestore.collection('eventos').get()).size).toBe(2);
    expect((await firestore.collection('reservasEquipo').get()).size).toBe(2);
  });

  it('pagina 25 eventos con cursor opaco y orden descendente', async () => {
    const batch = firestore.batch();
    for (let index = 0; index < 30; index += 1) {
      batch.set(firestore.doc(`eventos/event-${String(index).padStart(2, '0')}`), {
        nombreEvento: `Evento ${index}`,
        fechaInicio: '2026-10-06',
        horaInicio: '12:00',
        fechaFin: '2026-10-06',
        horaFin: '14:00',
        inicioAt: Timestamp.fromDate(new Date('2026-10-06T17:00:00.000Z')),
        finAt: Timestamp.fromDate(new Date('2026-10-06T19:00:00.000Z')),
        responsable: 'Omar Sánchez',
        estatus: 'programado',
        creadoPorUid: identity.uid,
        fechaCreacion: Timestamp.fromMillis(1_800_000_000_000 + index),
      });
    }
    await batch.commit();

    const first = await listEventRecords(identity, { cursor: null }, dependencies);
    expect(first.items).toHaveLength(25);
    expect(first.items[0]?.name).toBe('Evento 29');
    expect(first.nextCursor).toBeTruthy();
    const second = await listEventRecords(identity, { cursor: first.nextCursor }, dependencies);
    expect(second.items).toHaveLength(5);
    expect(second.items[0]?.name).toBe('Evento 4');
    expect(second.nextCursor).toBeNull();
  });

  it('consulta por superposición y filtra por campus sin usar Calendar externo', async () => {
    await firestore.doc('eventos/crossing').set({
      nombreEvento: 'Cruza el inicio',
      fechaInicio: '2026-10-05',
      horaInicio: '18:00',
      fechaFin: '2026-10-06',
      horaFin: '10:00',
      inicioAt: Timestamp.fromDate(new Date('2026-10-05T23:00:00.000Z')),
      finAt: Timestamp.fromDate(new Date('2026-10-06T15:00:00.000Z')),
      responsable: 'Omar Sánchez',
      estatus: 'programado',
      campusId: 'tup',
      campusHistorico: { nombre: 'Tecnológico Universitario Playacar' },
      creadoPorUid: identity.uid,
      fechaCreacion: Timestamp.now(),
    });
    await firestore.doc('eventos/other-campus').set({
      nombreEvento: 'Otro campus',
      fechaInicio: '2026-10-06',
      horaInicio: '09:00',
      fechaFin: '2026-10-06',
      horaFin: '11:00',
      inicioAt: Timestamp.fromDate(new Date('2026-10-06T14:00:00.000Z')),
      finAt: Timestamp.fromDate(new Date('2026-10-06T16:00:00.000Z')),
      responsable: 'Omar Sánchez',
      estatus: 'programado',
      campusId: 'fcs',
      campusHistorico: { nombre: 'Facultad de Ciencias de la Salud' },
      creadoPorUid: identity.uid,
      fechaCreacion: Timestamp.now(),
    });

    const result = await listCalendarEventRecords(
      identity,
      {
        inicio: '2026-10-06T05:00:00.000Z',
        fin: '2026-10-07T05:00:00.000Z',
        campusId: 'tup',
      },
      dependencies,
    );
    expect(result.items.map((item) => item.eventId)).toEqual(['crossing']);
  });

  it('busca globalmente, carga detalle y sustituye reservaciones sin parciales', async () => {
    await seedEquipment('bocina', 1);
    await seedEquipment('microfono', 1);
    const created = await createEventRecord(identity, payload(['bocina']), dependencies);

    const search = await listEventRecords(
      identity,
      { cursor: null, busqueda: 'pru' },
      dependencies,
    );
    expect(search.items.map((item) => item.eventId)).toEqual([created.eventId]);

    const current = await getEventDetailRecord(
      identity,
      { eventId: created.eventId },
      dependencies,
    );
    expect(current.canEdit).toBe(true);
    expect(current.reservations[0]?.equipmentId).toBe('bocina');

    await updateEventRecord(
      identity,
      {
        eventId: created.eventId,
        ...payload(['microfono']),
        nombreEvento: 'Evento actualizado',
      },
      dependencies,
    );
    const updated = await getEventDetailRecord(
      identity,
      { eventId: created.eventId },
      dependencies,
    );
    expect(updated.name).toBe('Evento actualizado');
    expect(updated.requestedEquipment.map((item) => item.equipmentId)).toEqual(['microfono']);
    expect(updated.reservations.find((item) => item.equipmentId === 'bocina')?.state).toBe(
      'cancelada',
    );
  });

  it('cancela históricamente y libera equipo local de forma idempotente', async () => {
    await seedEquipment('pantalla', 1);
    const created = await createEventRecord(identity, payload(['pantalla']), dependencies);
    await cancelEventRecord(identity, { eventId: created.eventId }, dependencies);
    await cancelEventRecord(identity, { eventId: created.eventId }, dependencies);

    const detail = await getEventDetailRecord(identity, { eventId: created.eventId }, dependencies);
    expect(detail.status).toBe('cancelado');
    expect(detail.canEdit).toBe(false);
    expect(detail.reservations[0]?.state).toBe('cancelada');
  });

  it('aplica cobertura, recepción y demora solo mediante admin', async () => {
    await firestore.doc('campus/fcs').set({
      nombre: 'Facultad de Ciencias de la Salud',
      nombreNormalizado: 'facultad de ciencias de la salud',
      clave: 'FCS',
      direccion: 'Av. Paseo Central',
      activo: true,
      utilizado: false,
      horariosSistemas: schedule('09:00', '18:00', '14:00'),
      fechaCreacion: Timestamp.now(),
      fechaActualizacion: Timestamp.now(),
    });
    await seedEquipment('bocina-movil', 1);
    await firestore.doc('equipos/bocina-movil').update({
      clasificacion: 'transferible',
      campusDestinoIdsPermitidos: ['fcs'],
    });
    const request = { ...payload(['bocina-movil']), campusId: 'fcs' };
    const created = await createEventRecord(identity, request, dependencies);

    await expect(
      confirmReservationCoverageRecord(
        identity,
        { eventId: created.eventId, equipmentId: 'bocina-movil' },
        dependencies,
      ),
    ).rejects.toMatchObject({ functionalCode: 'permission-denied' });

    await reportEquipmentDelayRecord(
      adminIdentity,
      {
        eventId: created.eventId,
        equipmentId: 'bocina-movil',
        nuevaLiberacion: '2026-10-07T02:00:00.000Z',
      },
      dependencies,
    );
    let detail = await getEventDetailRecord(identity, { eventId: created.eventId }, dependencies);
    expect(detail.reservations[0]?.delayReported).toBe(true);

    await confirmEquipmentReceptionRecord(
      adminIdentity,
      { eventId: created.eventId, equipmentId: 'bocina-movil' },
      dependencies,
    );
    detail = await getEventDetailRecord(identity, { eventId: created.eventId }, dependencies);
    expect(detail.reservations[0]?.state).toBe('finalizada');
  });

  it('reconcilia Calendar y correo sin duplicar recursos enviados', async () => {
    const calendar = {
      upsert: vi.fn(async () => 'calendar-event-1'),
      remove: vi.fn(async () => undefined),
    };
    const mailer = { send: vi.fn(async () => undefined) };
    const integrations = createEventIntegrationsService({
      firestore,
      calendar,
      mailer,
      logger: { warn() {}, error() {} },
      clock: { now: () => fixedNow },
    });
    const created = await createEventRecord(identity, payload([]), dependencies);

    await integrations.reconcile(created.eventId);
    await integrations.reconcile(created.eventId);

    const event = (await firestore.doc(`eventos/${created.eventId}`).get()).data();
    expect(event?.['calendarEstado']).toBe('sincronizado');
    expect(event?.['notificacionesEstado']).toBe('completas');
    expect(calendar.upsert).toHaveBeenCalledTimes(2);
    expect(mailer.send).toHaveBeenCalledTimes(1);
    expect(mailer.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'omar.sanchez@tecplayacar.edu.mx',
        recipientType: 'coordinacion',
        coordinationId: 'sistemas',
      }),
    );
    expect((await firestore.collection('notificacionesEventos').get()).size).toBe(1);

    await cancelEventRecord(identity, { eventId: created.eventId }, dependencies);
    await integrations.reconcile(created.eventId);
    expect(calendar.remove).toHaveBeenCalledWith('calendar-event-1');
  });

  it('deduplica por causa los avisos logísticos enviados a Sistemas', async () => {
    await firestore.doc('campus/fcs').set({
      nombre: 'Facultad de Ciencias de la Salud',
      nombreNormalizado: 'facultad de ciencias de la salud',
      clave: 'FCS',
      direccion: 'Av. Paseo Central',
      activo: true,
      utilizado: false,
      horariosSistemas: schedule('09:00', '18:00', '14:00'),
      fechaCreacion: Timestamp.now(),
      fechaActualizacion: Timestamp.now(),
    });
    await seedEquipment('bocina-logistica', 1);
    await firestore.doc('equipos/bocina-logistica').update({
      clasificacion: 'transferible',
      campusDestinoIdsPermitidos: ['fcs'],
    });
    let currentNow = fixedNow;
    const mailer = { send: vi.fn(async () => undefined) };
    const integrations = createEventIntegrationsService({
      firestore,
      calendar: {
        upsert: vi.fn(async () => 'calendar-logistics'),
        remove: vi.fn(),
      },
      mailer,
      logger: { warn() {}, error() {} },
      clock: { now: () => currentNow },
    });
    const integratedDependencies: EventsDependencies = {
      ...dependencies,
      clock: { now: () => currentNow },
      integrations,
    };
    const created = await createEventRecord(
      identity,
      { ...payload(['bocina-logistica'], '19:00', '21:00'), campusId: 'fcs' },
      integratedDependencies,
    );

    await integrations.reconcile(created.eventId);
    let logisticsJobs = (
      await firestore.collection('notificacionesEventos').where('tipo', '==', 'logistica').get()
    ).docs;
    expect(logisticsJobs.map((job) => job.data()['motivoLogistico'])).toEqual([
      'cobertura_sistemas',
    ]);
    expect(logisticsJobs[0]?.data()).toMatchObject({
      destinatarioTipo: 'sistemas',
      coordinacionId: 'sistemas',
      equipoId: 'bocina-logistica',
      estado: 'enviado',
      revision: 1,
    });

    await reportEquipmentDelayRecord(
      adminIdentity,
      {
        eventId: created.eventId,
        equipmentId: 'bocina-logistica',
        nuevaLiberacion: '2026-10-08T03:00:00.000Z',
      },
      integratedDependencies,
    );
    logisticsJobs = (
      await firestore.collection('notificacionesEventos').where('tipo', '==', 'logistica').get()
    ).docs;
    expect(logisticsJobs.map((job) => job.data()['motivoLogistico']).sort()).toEqual([
      'cobertura_sistemas',
      'demora',
    ]);

    currentNow = new Date('2026-10-05T17:30:00-05:00');
    await cancelEventRecord(identity, { eventId: created.eventId }, integratedDependencies);
    await integrations.reconcile(created.eventId);
    logisticsJobs = (
      await firestore.collection('notificacionesEventos').where('tipo', '==', 'logistica').get()
    ).docs;
    expect(logisticsJobs.map((job) => job.data()['motivoLogistico']).sort()).toEqual([
      'cancelacion_post_salida',
      'cobertura_sistemas',
      'demora',
    ]);
    expect(logisticsJobs.every((job) => job.data()['estado'] === 'enviado')).toBe(true);
  });

  it('un lease transaccional impide dos envíos concurrentes del mismo trabajo', async () => {
    const mailer = {
      send: vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
      }),
    };
    const integrations = createEventIntegrationsService({
      firestore,
      calendar: { upsert: vi.fn(async () => 'calendar-id'), remove: vi.fn() },
      mailer,
      logger: { warn() {}, error() {} },
      clock: { now: () => fixedNow },
    });
    const created = await createEventRecord(identity, payload([]), dependencies);
    await integrations.reconcile(created.eventId);
    mailer.send.mockClear();
    const notification = (await firestore.collection('notificacionesEventos').limit(1).get())
      .docs[0];
    await notification?.ref.update({
      estado: 'pendiente',
      intentos: 0,
      proximoIntento: Timestamp.fromDate(fixedNow),
      fechaFinalizacion: null,
      fechaExpiracion: null,
    });

    await Promise.all([integrations.processDue(50), integrations.processDue(50)]);
    expect(mailer.send).toHaveBeenCalledTimes(1);
  });

  it('ejecuta backfill en modo seco y después actualiza solo campos derivados', async () => {
    await firestore.doc('eventos/historico').set({
      nombreEvento: 'Ceremonía Histórica',
      fechaInicio: '2026-10-06',
      horaInicio: '12:00',
      fechaFin: '2026-10-06',
      horaFin: '14:00',
      responsable: 'Omar Sánchez',
      estatus: 'registrado',
      fechaCreacion: Timestamp.now(),
    });
    const dryRun = await backfillEventHistory({
      firestore,
      data: { dryRun: true },
    });
    expect(dryRun).toMatchObject({ eligible: 1, updated: 0 });
    expect((await firestore.doc('eventos/historico').get()).data()?.['inicioAt']).toBeUndefined();

    const execution = await backfillEventHistory({
      firestore,
      data: { dryRun: false },
    });
    expect(execution.updated).toBe(1);
    const event = (await firestore.doc('eventos/historico').get()).data();
    expect(event?.['inicioAt']).toBeInstanceOf(Timestamp);
    expect(event?.['terminosBusqueda']).toContain('ceremonia');
    expect(event?.['reservasEquipo']).toBeUndefined();
  });

  it('la limpieza conserva protocolos referenciados y elimina solo huérfanos antiguos', async () => {
    const referencedDelete = vi.fn(async () => undefined);
    const orphanDelete = vi.fn(async () => undefined);
    await firestore.doc('eventos/referenced').set({
      protocoloRuta: 'eventos/2026/referenced.pdf',
    });
    const result = await cleanupEventProtocols({
      firestore,
      now: fixedNow,
      bucket: {
        async getFiles() {
          return [
            [
              {
                name: 'eventos/2026/referenced.pdf',
                metadata: { timeCreated: '2026-09-28T12:00:00.000Z' },
                delete: referencedDelete,
              },
              {
                name: 'eventos/2026/orphan.pdf',
                metadata: { timeCreated: '2026-09-28T12:00:00.000Z' },
                delete: orphanDelete,
              },
            ],
          ] as const;
        },
      },
    });
    expect(result).toMatchObject({
      deleted: 1,
      failed: 0,
      reconciliationRequired: false,
    });
    expect(referencedDelete).not.toHaveBeenCalled();
    expect(orphanDelete).toHaveBeenCalledOnce();
  });
});
