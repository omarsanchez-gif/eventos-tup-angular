import { deleteApp, initializeApp, type App } from 'firebase-admin/app';
import { FieldValue, getFirestore, Timestamp, type Firestore } from 'firebase-admin/firestore';
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
  syncUpdatedEventIntegrationsRecord,
  type EventRequestIdentity,
  type EventsDependencies,
} from '../../functions/src/events.js';
import { createFirestoreEventsRepository } from '../../functions/src/firestore-events.repository.js';
import { createEventIntegrationsService } from '../../functions/src/event-integrations.js';
import {
  backfillEventHistory,
  cleanupEventProtocols,
} from '../../functions/src/event-maintenance.js';

import { createFirestoreAdminEquipmentRepository } from '../../functions/src/firestore-admin-equipment.repository.js';
import { updateEquipmentRecord } from '../../functions/src/admin-equipment.js';

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
    if (!process.env['FIRESTORE_EMULATOR_HOST']) throw new Error('Firestore Emulator required');
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
        'controlIntegracionesEvento',
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
        'controlIntegracionesEvento',
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
    const cancelledSnapshot = (await firestore.doc(`eventos/${created.eventId}`).get()).data();
    await cancelEventRecord(
      identity,
      { eventId: created.eventId },
      {
        ...dependencies,
        clock: { now: () => new Date('2026-10-07T12:00:00-05:00') },
      },
    );
    expect((await firestore.doc(`eventos/${created.eventId}`).get()).data()).toEqual(
      cancelledSnapshot,
    );
  });

  it.each([identity, adminIdentity])(
    'rechaza cancelación desde el fin exacto sin efectos secundarios para creador $role',
    async (owner) => {
      await seedEquipment('bocina');
      const created = await createEventRecord(owner, payload(['bocina']), dependencies);
      const reference = firestore.doc(`eventos/${created.eventId}`);
      const eventBefore = (await reference.get()).data();
      const reservesBefore = (await firestore.collection('reservasEquipo').get()).docs.map((doc) =>
        doc.data(),
      );
      const controlBefore = (await firestore.doc('controlReservasEquipo/bocina').get()).data();
      const remove = vi.fn();
      const reconcile = vi.fn();
      const completedDependencies = {
        ...dependencies,
        clock: { now: () => new Date('2026-10-06T14:00:00-05:00') },
        protocols: { ...dependencies.protocols, remove },
        integrations: { reconcile },
      };
      const detail = await getEventDetailRecord(
        owner,
        { eventId: created.eventId },
        completedDependencies,
      );
      expect(detail).toMatchObject({ status: 'finalizado', canCancel: false, canEdit: true });
      await expect(
        cancelEventRecord(owner, { eventId: created.eventId }, completedDependencies),
      ).rejects.toMatchObject({
        functionalCode: 'event-finished',
        functionsCode: 'failed-precondition',
      });
      expect((await reference.get()).data()).toEqual(eventBefore);
      expect(
        (await firestore.collection('reservasEquipo').get()).docs.map((doc) => doc.data()),
      ).toEqual(reservesBefore);
      expect((await firestore.doc('controlReservasEquipo/bocina').get()).data()).toEqual(
        controlBefore,
      );
      expect((await firestore.collection('notificacionesEventos').get()).empty).toBe(true);
      expect(remove).not.toHaveBeenCalled();
      expect(reconcile).not.toHaveBeenCalled();
    },
  );

  it('permite cancelar en ejecución justo antes del fin de un evento multidiario', async () => {
    const created = await createEventRecord(
      identity,
      {
        ...payload([]),
        fechaFin: '2026-10-08',
      },
      dependencies,
    );
    const beforeEnd = {
      ...dependencies,
      clock: { now: () => new Date('2026-10-08T13:59:59.999-05:00') },
    };
    expect(
      await getEventDetailRecord(identity, { eventId: created.eventId }, beforeEnd),
    ).toMatchObject({ status: 'en_ejecucion', canCancel: true });
    await cancelEventRecord(identity, { eventId: created.eventId }, beforeEnd);
    expect((await firestore.doc(`eventos/${created.eventId}`).get()).data()?.['estatus']).toBe(
      'cancelado',
    );
  });

  it('histórico con fin local válido impide cancelación sin persistir backfill', async () => {
    const created = await createEventRecord(identity, payload([]), dependencies);
    const reference = firestore.doc(`eventos/${created.eventId}`);
    await reference.update({ inicioAt: FieldValue.delete(), finAt: FieldValue.delete() });
    const past = { ...dependencies, clock: { now: () => new Date('2026-10-07T12:00:00-05:00') } };
    expect(await getEventDetailRecord(identity, { eventId: created.eventId }, past)).toMatchObject({
      status: 'finalizado',
      canCancel: false,
    });
    await expect(
      cancelEventRecord(identity, { eventId: created.eventId }, past),
    ).rejects.toMatchObject({ functionalCode: 'event-finished' });
    expect((await reference.get()).data()?.['finAt']).toBeUndefined();
    expect((await reference.get()).data()?.['estatus']).toBe('programado');
  });

  it('cierra cancelación si el fin histórico no puede determinarse', async () => {
    const created = await createEventRecord(identity, payload([]), dependencies);
    await firestore
      .doc(`eventos/${created.eventId}`)
      .update({ finAt: FieldValue.delete(), horaFin: '' });
    expect(
      await getEventDetailRecord(identity, { eventId: created.eventId }, dependencies),
    ).toMatchObject({ canCancel: false });
    await expect(
      cancelEventRecord(identity, { eventId: created.eventId }, dependencies),
    ).rejects.toMatchObject({ functionalCode: 'invalid-date-range' });
  });

  it.each(['Inicio', 'Fin'])(
    'histórico finalizado sin %s no permite cancelar',
    async (boundary) => {
      const created = await createEventRecord(identity, payload([]), dependencies);
      const reference = firestore.doc(`eventos/${created.eventId}`);
      await reference.update({
        estatus: 'finalizado',
        [boundary === 'Inicio' ? 'inicioAt' : 'finAt']: FieldValue.delete(),
        [`hora${boundary}`]: '',
      });
      expect(
        await getEventDetailRecord(identity, { eventId: created.eventId }, dependencies),
      ).toMatchObject({ status: 'finalizado', canCancel: false });
      await expect(
        cancelEventRecord(identity, { eventId: created.eventId }, dependencies),
      ).rejects.toMatchObject({ functionalCode: 'event-finished' });
      expect((await reference.get()).data()?.['estatus']).toBe('finalizado');
    },
  );

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
      { ...dependencies, clock: { now: () => new Date('2026-10-06T18:30:00-05:00') } },
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

  async function reduceStock(equipmentId: string, quantity: number) {
    return updateEquipmentRecord(
      adminIdentity,
      {
        documentId: equipmentId,
        nombre: 'Equipo ' + equipmentId,
        campusBaseId: 'tup',
        cantidadOperativa: quantity,
        clasificacion: 'fijo',
        campusDestinoIdsPermitidos: [],
      },
      {
        repository: createFirestoreAdminEquipmentRepository(firestore, { now: () => fixedNow }),
        logger: { warn() {}, error() {} },
      },
    );
  }

  it('permite una unidad entre reservas sucesivas y rechaza superar el pico real', async () => {
    await seedEquipment('sucesivas', 2);
    await createEventRecord(identity, payload(['sucesivas'], '10:00', '11:00'), dependencies);
    await createEventRecord(identity, payload(['sucesivas'], '14:00', '15:00'), dependencies);
    const candidate = payload(['sucesivas'], '11:00', '14:00');
    await expect(
      checkEventAvailability(
        identity,
        {
          campusId: candidate.campusId,
          fechaInicio: candidate.fechaInicio,
          horaInicio: candidate.horaInicio,
          fechaFin: candidate.fechaFin,
          horaFin: candidate.horaFin,
          equiposSolicitados: candidate.equiposSolicitados,
        },
        dependencies,
      ),
    ).resolves.toMatchObject({ confirmable: true, items: [{ available: 1 }] });
    await createEventRecord(identity, candidate, dependencies);
    await expect(createEventRecord(identity, candidate, dependencies)).rejects.toMatchObject({
      functionalCode: 'equipment-unavailable',
    });
    expect((await firestore.collection('eventos').get()).size).toBe(3);
  });

  it('reduce stock y encola avisos atómicos sin duplicarlos al repetir o reconciliar', async () => {
    await seedEquipment('reduccion', 2);
    const first = await createEventRecord(identity, payload(['reduccion']), dependencies);
    await createEventRecord(identity, payload(['reduccion']), dependencies);
    const separate = await createEventRecord(
      identity,
      payload(['reduccion'], '16:00', '17:00'),
      dependencies,
    );
    const firstReservation = (
      await firestore.collection('reservasEquipo').where('eventoId', '==', first.eventId).get()
    ).docs[0]!;
    await firstReservation.ref.update({
      motivosRevision: ['cobertura_sistemas'],
      estado: 'requiere_revision',
    });
    await reduceStock('reduccion', 1);
    const reservations = (await firestore.collection('reservasEquipo').get()).docs;
    expect(
      reservations.filter((doc) => doc.data()['motivosRevision'].includes('inventario_reducido')),
    ).toHaveLength(2);
    expect((await firstReservation.ref.get()).data()?.['motivosRevision']).toEqual([
      'cobertura_sistemas',
      'inventario_reducido',
    ]);
    expect(
      reservations.find((doc) => doc.data()['eventoId'] === separate.eventId)?.data()['estado'],
    ).toBe('confirmada');
    const jobs = await firestore.collection('notificacionesEventos').get();
    expect(jobs.size).toBe(2);
    expect(
      jobs.docs.every(
        (doc) =>
          doc.data()['estado'] === 'pendiente' && doc.data()['destinatarioTipo'] === 'sistemas',
      ),
    ).toBe(true);
    const version = (await firestore.doc('controlReservasEquipo/reduccion').get()).data()?.[
      'version'
    ];
    await reduceStock('reduccion', 1);
    expect((await firestore.collection('notificacionesEventos').get()).size).toBe(2);
    expect((await firestore.doc('controlReservasEquipo/reduccion').get()).data()?.['version']).toBe(
      version,
    );
    const mailer = { send: vi.fn(async () => undefined) };
    const service = createEventIntegrationsService({
      firestore,
      calendar: { upsert: vi.fn(async () => 'mock'), remove: vi.fn() },
      mailer,
      logger: { warn() {}, error() {} },
      clock: { now: () => fixedNow },
    });
    await service.processDue();
    expect(mailer.send).toHaveBeenCalledTimes(2);
    await service.reconcile(first.eventId);
    expect(
      (
        await firestore
          .collection('notificacionesEventos')
          .where('motivoLogistico', '==', 'inventario_reducido')
          .get()
      ).size,
    ).toBe(2);
  });

  it('revierte reducción completa si falta Sistemas y no altera reservas canceladas o pasadas', async () => {
    await seedEquipment('seguro', 2);
    await createEventRecord(identity, payload(['seguro']), dependencies);
    await createEventRecord(identity, payload(['seguro']), dependencies);
    const before = (await firestore.collection('reservasEquipo').get()).docs.map((doc) =>
      doc.data(),
    );
    await firestore.doc('configuracion/logisticaEquipos').delete();
    await expect(reduceStock('seguro', 1)).rejects.toMatchObject({
      functionalCode: 'reservation-review-required',
    });
    expect((await firestore.doc('equipos/seguro').get()).data()?.['cantidadOperativa']).toBe(2);
    expect(
      (await firestore.collection('reservasEquipo').get()).docs.map((doc) => doc.data()),
    ).toEqual(before);
    expect((await firestore.collection('notificacionesEventos').get()).empty).toBe(true);
    const reservations = (await firestore.collection('reservasEquipo').get()).docs;
    await reservations[0]!.ref.update({ estado: 'cancelada' });
    await reservations[1]!.ref.update({
      bloqueoInicio: Timestamp.fromMillis(fixedNow.getTime() - 7200000),
      bloqueoFin: Timestamp.fromMillis(fixedNow.getTime() - 3600000),
    });
    await reduceStock('seguro', 1);
    expect((await firestore.collection('notificacionesEventos').get()).empty).toBe(true);
  });

  it('serializa una reducción concurrente con una nueva reserva', async () => {
    await seedEquipment('race-stock', 2);
    await createEventRecord(identity, payload(['race-stock']), dependencies);
    const results = await Promise.allSettled([
      reduceStock('race-stock', 1),
      createEventRecord(identity, payload(['race-stock']), dependencies),
    ]);
    expect(results[0]?.status).toBe('fulfilled');
    expect((await firestore.doc('equipos/race-stock').get()).data()?.['cantidadOperativa']).toBe(1);
    const reservations = (await firestore.collection('reservasEquipo').get()).docs;
    if (reservations.length === 2) {
      expect(
        reservations.every((doc) => doc.data()['motivosRevision'].includes('inventario_reducido')),
      ).toBe(true);
      expect((await firestore.collection('notificacionesEventos').get()).size).toBe(2);
    } else {
      expect(reservations).toHaveLength(1);
      expect(results[1]).toMatchObject({
        status: 'rejected',
        reason: { functionalCode: 'equipment-unavailable' },
      });
    }
  });

  it('rechaza el exceso técnico sin aplicar inventario ni revisiones parciales', async () => {
    await seedEquipment('limite', 999);
    const batch = firestore.batch();
    for (let i = 0; i < 401; i += 1)
      batch.set(firestore.doc('reservasEquipo/limit-' + i), {
        equipoId: 'limite',
        eventoId: 'limit-' + i,
        cantidad: 1,
        estado: 'confirmada',
        bloqueoInicio: Timestamp.fromDate(new Date('2026-10-06T16:00:00Z')),
        bloqueoFin: Timestamp.fromDate(new Date('2026-10-06T18:00:00Z')),
      });
    await batch.commit();
    await expect(reduceStock('limite', 998)).rejects.toMatchObject({
      functionalCode: 'reservation-review-required',
    });
    expect((await firestore.doc('equipos/limite').get()).data()?.['cantidadOperativa']).toBe(999);
    expect((await firestore.collection('controlReservasEquipo').get()).empty).toBe(true);
    expect((await firestore.collection('notificacionesEventos').get()).empty).toBe(true);
  });

  it('demora solo amplía el bloqueo y repetirla conserva la versión incluso después de su fecha', async () => {
    await seedEquipment('demora', 1);
    const created = await createEventRecord(identity, payload(['demora']), dependencies);
    const ref = (
      await firestore.collection('reservasEquipo').where('eventoId', '==', created.eventId).get()
    ).docs[0]!.ref;
    await ref.update({
      regresoProgramado: Timestamp.fromDate(new Date('2026-10-06T18:00:00-05:00')),
      liberacionProgramada: Timestamp.fromDate(new Date('2026-10-06T19:00:00-05:00')),
      bloqueoFin: Timestamp.fromDate(new Date('2026-10-06T19:00:00-05:00')),
    });
    const target = { eventId: created.eventId, equipmentId: 'demora' };
    const before = (await ref.get()).data();
    for (const time of ['18:30', '19:00'])
      await expect(
        reportEquipmentDelayRecord(
          adminIdentity,
          { ...target, nuevaLiberacion: '2026-10-06T' + time + ':00-05:00' },
          dependencies,
        ),
      ).rejects.toMatchObject({ functionalCode: 'invalid-argument' });
    expect((await ref.get()).data()).toEqual(before);
    const request = { ...target, nuevaLiberacion: '2026-10-06T20:00:00-05:00' };
    await reportEquipmentDelayRecord(adminIdentity, request, dependencies);
    const version = (await firestore.doc('controlReservasEquipo/demora').get()).data()?.['version'];
    await reportEquipmentDelayRecord(adminIdentity, request, {
      ...dependencies,
      clock: { now: () => new Date('2026-10-07T12:00:00-05:00') },
    });
    expect((await firestore.doc('controlReservasEquipo/demora').get()).data()?.['version']).toBe(
      version,
    );
    expect((await ref.get()).data()?.['bloqueoFin'].toDate().toISOString()).toBe(
      '2026-10-07T01:00:00.000Z',
    );
  });

  it.each(['pendiente', 'parciales'])(
    'correo antiguo no reemplaza resumen actual %s',
    async (currentState) => {
      const created = await createEventRecord(identity, payload([]), dependencies);
      let release!: () => void;
      let started!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      const sending = new Promise<void>((resolve) => {
        started = resolve;
      });
      const service = createEventIntegrationsService({
        firestore,
        calendar: { upsert: vi.fn(async () => 'mock'), remove: vi.fn() },
        mailer: {
          send: vi.fn(async () => {
            started();
            await gate;
          }),
        },
        logger: { warn() {}, error() {} },
        clock: { now: () => fixedNow },
      });
      const work = service.reconcile(created.eventId);
      await sending;
      await firestore
        .doc('eventos/' + created.eventId)
        .update({ revisionNotificacion: 2, notificacionesEstado: currentState });
      release();
      await work;
      expect(
        (await firestore.doc('eventos/' + created.eventId).get()).data()?.['notificacionesEstado'],
      ).toBe(currentState);
      expect(
        (await firestore.collection('notificacionesEventos').get()).docs[0]?.data()['estado'],
      ).toBe('enviado');
    },
  );
  it('reducir stock con reservas sucesivas no genera falsas revisiones', async () => {
    await seedEquipment('stock-sucesivo', 2);
    await createEventRecord(identity, payload(['stock-sucesivo'], '10:00', '11:00'), dependencies);
    await createEventRecord(identity, payload(['stock-sucesivo'], '14:00', '15:00'), dependencies);
    await firestore.doc('configuracion/logisticaEquipos').delete();
    await reduceStock('stock-sucesivo', 1);
    expect(
      (await firestore.collection('reservasEquipo').get()).docs.every(
        (doc) => doc.data()['estado'] === 'confirmada',
      ),
    ).toBe(true);
    expect((await firestore.collection('notificacionesEventos').get()).empty).toBe(true);
  });

  it('el presupuesto de escrituras incluye cada destinatario y revierte el exceso', async () => {
    await seedEquipment('limite-avisos', 41);
    await firestore.doc('coordinaciones/sistemas').update({
      correos: Array.from({ length: 10 }, (_, i) => 'sistemas' + i + '@tecplayacar.edu.mx'),
    });
    const batch = firestore.batch();
    for (let i = 0; i < 41; i += 1)
      batch.set(firestore.doc('reservasEquipo/budget-' + i), {
        equipoId: 'limite-avisos',
        eventoId: 'budget-' + i,
        cantidad: 1,
        estado: 'confirmada',
        bloqueoInicio: Timestamp.fromDate(new Date('2026-10-06T16:00:00Z')),
        bloqueoFin: Timestamp.fromDate(new Date('2026-10-06T18:00:00Z')),
      });
    await batch.commit();
    await expect(reduceStock('limite-avisos', 40)).rejects.toMatchObject({
      functionalCode: 'reservation-review-required',
    });
    expect((await firestore.doc('equipos/limite-avisos').get()).data()?.['cantidadOperativa']).toBe(
      41,
    );
    expect((await firestore.collection('controlReservasEquipo').get()).empty).toBe(true);
    expect((await firestore.collection('notificacionesEventos').get()).empty).toBe(true);
  });

  it('finalizaciones concurrentes de la revisión vigente conservan completas', async () => {
    const created = await createEventRecord(identity, payload([]), dependencies);
    const mailer = { send: vi.fn(async () => undefined) };
    const service = createEventIntegrationsService({
      firestore,
      calendar: { upsert: vi.fn(async () => 'mock'), remove: vi.fn() },
      mailer,
      logger: { warn() {}, error() {} },
      clock: { now: () => fixedNow },
    });
    await service.reconcile(created.eventId);
    const original = (await firestore.collection('notificacionesEventos').get()).docs[0]!;
    const pending = {
      ...original.data(),
      estado: 'pendiente',
      proximoIntento: Timestamp.fromDate(fixedNow),
      procesadorId: null,
      bloqueoHasta: null,
    };
    await original.ref.set(pending);
    await firestore
      .doc('notificacionesEventos/second-recipient')
      .set({ ...pending, destinatarioCorreo: 'otro@tecplayacar.edu.mx' });
    await firestore.doc('eventos/' + created.eventId).update({ notificacionesEstado: 'pendiente' });
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let sending = 0;
    mailer.send.mockImplementation(async () => {
      if (++sending === 2) release();
      await gate;
    });
    await Promise.all([service.processDue(), service.processDue()]);
    expect(sending).toBe(2);
    expect(
      (await firestore.doc('eventos/' + created.eventId).get()).data()?.['notificacionesEstado'],
    ).toBe('completas');
  });

  function deferred() {
    let resolve!: () => void;
    const promise = new Promise<void>((done) => {
      resolve = done;
    });
    return { promise, resolve };
  }

  it.each([false, true])(
    'Calendar converge a la edición nueva aunque termine tarde la anterior (fallo=%s)',
    async (failFirst) => {
      const created = await createEventRecord(identity, payload([]), dependencies);
      const started = deferred(),
        release = deferred();
      const names: string[] = [];
      let externalName = '';
      const calendar = {
        upsert: vi.fn(async (event: { name: string }) => {
          names.push(event.name);
          if (names.length === 1) {
            started.resolve();
            await release.promise;
            if (failFirst) throw new Error('old-request-failed');
          }
          externalName = event.name;
          return 'serialized-calendar';
        }),
        remove: vi.fn(),
      };
      const options = {
        firestore,
        calendar,
        mailer: { send: vi.fn(async () => undefined) },
        logger: { warn() {}, error() {} },
        clock: { now: () => fixedNow },
      };
      const firstService = createEventIntegrationsService(options);
      const secondService = createEventIntegrationsService(options);
      const first = firstService.reconcile(created.eventId);
      await started.promise;
      await updateEventRecord(
        identity,
        { ...payload([]), eventId: created.eventId, nombreEvento: 'Última edición' },
        dependencies,
      );
      expect(await secondService.reconcile(created.eventId)).toMatchObject({
        calendarStatus: 'pendiente',
      });
      expect(calendar.upsert).toHaveBeenCalledTimes(1);
      release.resolve();
      expect(await first).toMatchObject({ calendarStatus: 'sincronizado' });
      expect(names).toEqual(['Evento de prueba', 'Última edición']);
      expect(externalName).toBe('Última edición');
      expect((await firestore.doc('eventos/' + created.eventId).get()).data()).toMatchObject({
        nombreEvento: 'Última edición',
        calendarEstado: 'sincronizado',
      });
      expect(
        (await firestore.doc('controlIntegracionesEvento/' + created.eventId).get()).data()?.[
          'procesadorId'
        ],
      ).toBeNull();
    },
  );

  it.each([false, true])(
    'cancelar durante creación retira Calendar incluso si se pierde la respuesta (perdida=%s)',
    async (loseResponse) => {
      const created = await createEventRecord(identity, payload([]), dependencies);
      const started = deferred(),
        release = deferred();
      let exists = false;
      const calendar = {
        upsert: vi.fn(async () => {
          started.resolve();
          await release.promise;
          exists = true;
          if (loseResponse) throw new Error('response-lost');
          return 'just-created';
        }),
        remove: vi.fn(async () => {
          exists = false;
        }),
      };
      const options = {
        firestore,
        calendar,
        mailer: { send: vi.fn(async () => undefined) },
        logger: { warn() {}, error() {} },
        clock: { now: () => fixedNow },
      };
      const service = createEventIntegrationsService(options);
      const work = service.reconcile(created.eventId);
      await started.promise;
      await cancelEventRecord(identity, { eventId: created.eventId }, dependencies);
      await createEventIntegrationsService(options).reconcile(created.eventId);
      release.resolve();
      expect(await work).toMatchObject({ calendarStatus: 'retirado' });
      expect(exists).toBe(false);
      expect(calendar.remove).toHaveBeenCalledTimes(1);
      expect((await firestore.doc('eventos/' + created.eventId).get()).data()).toMatchObject({
        estatus: 'cancelado',
        calendarEventId: null,
        calendarEstado: 'retirado',
      });
      expect(
        (await firestore.collection('notificacionesEventos').get()).docs.every(
          (doc) => doc.data()['tipo'] === 'cancelacion',
        ),
      ).toBe(true);
    },
  );

  it('un lease vigente impide trabajo paralelo y uno expirado permite recuperar', async () => {
    const created = await createEventRecord(identity, payload([]), dependencies);
    const control = firestore.doc('controlIntegracionesEvento/' + created.eventId);
    await control.set({
      procesadorId: 'old-worker',
      bloqueoHasta: Timestamp.fromMillis(fixedNow.getTime() + 600000),
    });
    const calendar = { upsert: vi.fn(async () => 'recovered'), remove: vi.fn() };
    const service = createEventIntegrationsService({
      firestore,
      calendar,
      mailer: { send: vi.fn(async () => undefined) },
      logger: { warn() {}, error() {} },
      clock: { now: () => fixedNow },
    });
    expect(await service.reconcile(created.eventId)).toMatchObject({ calendarStatus: 'pendiente' });
    expect(calendar.upsert).not.toHaveBeenCalled();
    await control.update({ bloqueoHasta: Timestamp.fromMillis(fixedNow.getTime() - 1) });
    expect(await service.reconcile(created.eventId)).toMatchObject({
      calendarStatus: 'sincronizado',
    });
    expect(calendar.upsert).toHaveBeenCalledTimes(1);
    expect((await control.get()).data()?.['procesadorId']).toBeNull();
  });

  it('un procesador reemplazado no publica su resultado ni libera el lease nuevo', async () => {
    const created = await createEventRecord(identity, payload([]), dependencies);
    const started = deferred(),
      release = deferred();
    const service = createEventIntegrationsService({
      firestore,
      calendar: {
        upsert: vi.fn(async () => {
          started.resolve();
          await release.promise;
          return 'old-result';
        }),
        remove: vi.fn(),
      },
      mailer: { send: vi.fn(async () => undefined) },
      logger: { warn() {}, error() {} },
      clock: { now: () => fixedNow },
    });
    const work = service.reconcile(created.eventId);
    await started.promise;
    const control = firestore.doc('controlIntegracionesEvento/' + created.eventId);
    await control.update({
      procesadorId: 'successor',
      bloqueoHasta: Timestamp.fromMillis(fixedNow.getTime() + 600000),
    });
    release.resolve();
    expect(await work).toMatchObject({ calendarStatus: 'pendiente' });
    expect((await control.get()).data()?.['procesadorId']).toBe('successor');
    expect((await firestore.doc('eventos/' + created.eventId).get()).data()).toMatchObject({
      calendarEstado: 'pendiente',
      calendarEventId: null,
    });
  });

  it('acota cambios continuos a cinco vueltas y deja pendiente recuperable', async () => {
    const created = await createEventRecord(identity, payload([]), dependencies);
    let calls = 0;
    const calendar = {
      upsert: vi.fn(async () => {
        calls += 1;
        if (calls <= 5)
          await firestore
            .doc('eventos/' + created.eventId)
            .update({ observaciones: 'Cambio ' + calls });
        return 'bounded';
      }),
      remove: vi.fn(),
    };
    const service = createEventIntegrationsService({
      firestore,
      calendar,
      mailer: { send: vi.fn(async () => undefined) },
      logger: { warn() {}, error() {} },
      clock: { now: () => fixedNow },
    });
    expect(await service.reconcile(created.eventId)).toMatchObject({ calendarStatus: 'pendiente' });
    expect(calls).toBe(5);
    expect(
      (await firestore.doc('controlIntegracionesEvento/' + created.eventId).get()).data()?.[
        'procesadorId'
      ],
    ).toBeNull();
    expect(await service.reconcile(created.eventId)).toMatchObject({
      calendarStatus: 'sincronizado',
    });
    expect(calls).toBe(6);
  });

  it('recepción local exige fin del evento y conserva idempotencia en la frontera', async () => {
    await seedEquipment('recepcion-local');
    const created = await createEventRecord(identity, payload(['recepcion-local']), dependencies);
    const target = { eventId: created.eventId, equipmentId: 'recepcion-local' };
    const at = (time: string) => ({ ...dependencies, clock: { now: () => new Date(time) } });
    for (const time of [
      '2026-09-30T12:00:00-05:00',
      '2026-10-06T12:30:00-05:00',
      '2026-10-06T13:59:59-05:00',
    ]) {
      await expect(
        confirmEquipmentReceptionRecord(adminIdentity, target, at(time)),
      ).rejects.toMatchObject({ functionalCode: 'reception-not-available' });
      const detail = await getEventDetailRecord(
        adminIdentity,
        { eventId: created.eventId },
        at(time),
      );
      expect(detail.reservations[0]?.canConfirmReception).toBe(false);
    }
    const boundary = at('2026-10-06T14:00:00-05:00');
    expect(
      (await getEventDetailRecord(adminIdentity, { eventId: created.eventId }, boundary))
        .reservations[0]?.canConfirmReception,
    ).toBe(true);
    await confirmEquipmentReceptionRecord(adminIdentity, target, boundary);
    const version = (await firestore.doc('controlReservasEquipo/recepcion-local').get()).data()?.[
      'version'
    ];
    await confirmEquipmentReceptionRecord(adminIdentity, target, boundary);
    expect(
      (await firestore.doc('controlReservasEquipo/recepcion-local').get()).data()?.['version'],
    ).toBe(version);
  });

  it.each([false, true])(
    'recepción remota espera regreso incluso tras cancelar (cancelado=%s)',
    async (cancelled) => {
      await firestore.doc('campus/fcs').set({
        nombre: 'FCS',
        clave: 'FCS',
        activo: true,
        utilizado: false,
        horariosSistemas: schedule('09:00', '18:00', '14:00'),
      });
      await seedEquipment('recepcion-remota');
      await firestore
        .doc('equipos/recepcion-remota')
        .update({ clasificacion: 'transferible', campusDestinoIdsPermitidos: ['fcs'] });
      const created = await createEventRecord(
        identity,
        { ...payload(['recepcion-remota']), campusId: 'fcs' },
        dependencies,
      );
      const at = (time: string) => ({ ...dependencies, clock: { now: () => new Date(time) } });
      if (cancelled)
        await cancelEventRecord(
          identity,
          { eventId: created.eventId },
          at('2026-10-05T17:30:00-05:00'),
        );
      const target = { eventId: created.eventId, equipmentId: 'recepcion-remota' };
      await expect(
        confirmEquipmentReceptionRecord(adminIdentity, target, at('2026-10-06T17:59:59-05:00')),
      ).rejects.toMatchObject({ functionalCode: 'reception-not-available' });
      await confirmEquipmentReceptionRecord(adminIdentity, target, at('2026-10-06T18:00:00-05:00'));
      expect(
        (
          await getEventDetailRecord(
            adminIdentity,
            { eventId: created.eventId },
            at('2026-10-06T18:00:00-05:00'),
          )
        ).reservations[0]?.state,
      ).toBe('finalizada');
    },
  );

  it('recepción con fin canónico ausente falla sin liberar la reserva', async () => {
    await seedEquipment('recepcion-invalida');
    const created = await createEventRecord(
      identity,
      payload(['recepcion-invalida']),
      dependencies,
    );
    await firestore.doc('eventos/' + created.eventId).update({ finAt: null });
    await expect(
      confirmEquipmentReceptionRecord(
        adminIdentity,
        { eventId: created.eventId, equipmentId: 'recepcion-invalida' },
        { ...dependencies, clock: { now: () => new Date('2026-10-06T18:00:00-05:00') } },
      ),
    ).rejects.toMatchObject({ functionalCode: 'reception-not-available' });
    expect((await firestore.collection('reservasEquipo').get()).docs[0]?.data()['estado']).toBe(
      'confirmada',
    );
  });

  it.each([false, true])(
    'avisa una vez por retiro y permite reagregar/retirar sin depender del historial (purga=%s)',
    async (purgeHistory) => {
      await firestore.doc('coordinaciones/marketing').set({
        nombre: 'Marketing',
        correos: ['marketing@tecplayacar.edu.mx'],
        activo: true,
        utilizada: false,
      });
      const mailer = { send: vi.fn(async () => undefined) };
      const service = createEventIntegrationsService({
        firestore,
        calendar: { upsert: vi.fn(async () => 'marketing-calendar'), remove: vi.fn() },
        mailer,
        logger: { warn() {}, error() {} },
        clock: { now: () => fixedNow },
      });
      const integrated = { ...dependencies, integrations: service };
      const request = { ...payload([]), coordinacionIds: ['sistemas', 'marketing'] };
      const created = await createEventRecord(identity, request, integrated);
      if (purgeHistory) await clear('notificacionesEventos');
      await updateEventRecord(
        identity,
        { ...request, eventId: created.eventId, coordinacionIds: ['sistemas'] },
        integrated,
      );
      const retiros = () =>
        firestore
          .collection('notificacionesEventos')
          .where('tipo', '==', 'retiro_coordinacion')
          .get();
      expect((await retiros()).size).toBe(1);
      await updateEventRecord(
        identity,
        {
          ...request,
          eventId: created.eventId,
          nombreEvento: 'Solo cambio de nombre',
          coordinacionIds: ['sistemas'],
        },
        integrated,
      );
      await service.reconcile(created.eventId);
      expect((await retiros()).size).toBe(1);
      await updateEventRecord(identity, { ...request, eventId: created.eventId }, integrated);
      await updateEventRecord(
        identity,
        { ...request, eventId: created.eventId, coordinacionIds: ['sistemas'] },
        integrated,
      );
      expect((await retiros()).size).toBe(2);
      expect(
        (await retiros()).docs.every(
          (doc) =>
            doc.data()['destinatarioCorreo'] === 'marketing@tecplayacar.edu.mx' &&
            doc.data()['estado'] === 'enviado',
        ),
      ).toBe(true);
    },
  );
  it('no inicia Calendar si ya no queda margen suficiente de lease', async () => {
    const created = await createEventRecord(identity, payload([]), dependencies);
    let clockReads = 0;
    const calendar = { upsert: vi.fn(async () => 'must-not-run'), remove: vi.fn() };
    const service = createEventIntegrationsService({
      firestore,
      calendar,
      mailer: { send: vi.fn(async () => undefined) },
      logger: { warn() {}, error() {} },
      clock: { now: () => new Date(fixedNow.getTime() + (++clockReads > 1 ? 9 * 60000 : 0)) },
    });
    expect(await service.reconcile(created.eventId)).toMatchObject({ calendarStatus: 'pendiente' });
    expect(calendar.upsert).not.toHaveBeenCalled();
    expect(
      (await firestore.doc('controlIntegracionesEvento/' + created.eventId).get()).data()?.[
        'procesadorId'
      ],
    ).toBeNull();
  });

  it('sincroniza revisión con repositorio real solo después de autorizar propietario o admin', async () => {
    const created = await createEventRecord(identity, payload([]), dependencies);
    const integrate = vi.fn(async () => ({
      calendarStatus: 'sincronizado' as const,
      notificationStatus: 'completas' as const,
    }));
    const deps = { ...dependencies, integrations: { reconcile: integrate } };
    const request = { eventId: created.eventId, revisionEsperada: 1 };
    await expect(syncUpdatedEventIntegrationsRecord(null, request, deps)).rejects.toMatchObject({
      functionalCode: 'unauthenticated',
    });
    await syncUpdatedEventIntegrationsRecord(identity, request, deps);
    await syncUpdatedEventIntegrationsRecord(adminIdentity, request, deps);
    expect(integrate).toHaveBeenCalledTimes(2);
    await firestore.doc('eventos/' + created.eventId).update({ revisionNotificacion: 2 });
    await expect(syncUpdatedEventIntegrationsRecord(identity, request, deps)).rejects.toMatchObject(
      { functionsCode: 'failed-precondition' },
    );
    expect(integrate).toHaveBeenCalledTimes(2);
  });
});
