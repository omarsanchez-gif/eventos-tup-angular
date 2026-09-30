import { deleteApp, initializeApp, type App } from 'firebase-admin/app';
import { getFirestore, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  createEventRecord,
  listCalendarEventRecords,
  listEventRecords,
  type EventRequestIdentity,
  type EventsDependencies,
} from '../../functions/src/events.js';
import { createFirestoreEventsRepository } from '../../functions/src/firestore-events.repository.js';

const projectId = 'demo-eventos-tup';
const identity: EventRequestIdentity = {
  uid: 'user-uid',
  authorized: true,
  role: 'usuario',
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
    equiposSolicitados: equipmentIds.map((equipoId) => ({ equipoId, cantidad: 1 })),
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
      protocols: { async validate() {} },
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
});
