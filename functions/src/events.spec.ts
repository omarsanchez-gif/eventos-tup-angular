import { describe, expect, it, vi } from 'vitest';

import {
  checkEventAvailability,
  createEventRecord,
  type EventRequestIdentity,
  type EventsDependencies,
  type EventsError,
  type EventsRepository,
} from './events.js';

const identity: EventRequestIdentity = { uid: 'user-uid', authorized: true, role: 'usuario' };
const fixedNow = new Date('2026-09-30T12:00:00-05:00');

function repository(): EventsRepository {
  return {
    findCanonicalRequester: vi.fn(async () => ({
      uid: 'user-uid',
      nombre: 'Omar Sánchez',
      correo: 'omar.sanchez@tecplayacar.edu.mx',
      role: 'usuario',
      activo: true,
    })),
    checkAvailability: vi.fn(async (_uid, input) =>
      input.equipment.map((item) => ({
        equipmentId: item.equipmentId,
        requested: item.quantity,
        available: 2,
        confirmable: item.quantity <= 2,
        blockStart: input.start,
        blockEnd: input.end,
        requiresTransfer: false,
      })),
    ),
    list: vi.fn(async () => ({ items: [], nextCursor: null, serverNow: fixedNow })),
    listRange: vi.fn(async () => []),
    create: vi.fn(async () => ({ eventId: 'event-id' })),
  };
}

function dependencies(eventsRepository = repository()): EventsDependencies {
  return {
    repository: eventsRepository,
    clock: { now: () => fixedNow },
    logger: { warn: vi.fn(), error: vi.fn() },
    protocols: { validate: vi.fn(async () => undefined) },
  };
}

function payload(count = 1) {
  return {
    nombreEvento: 'Ceremonia institucional',
    campusId: 'tup',
    fechaInicio: '2026-10-06',
    horaInicio: '12:00',
    fechaFin: '2026-10-06',
    horaFin: '14:00',
    observaciones: '',
    coordinacionIds: ['sistemas'],
    equiposSolicitados: Array.from({ length: count }, (_, index) => ({
      equipoId: `equipo-${index}`,
      cantidad: 1,
    })),
    protocoloUrl: 'https://storage.test/protocolo.pdf',
    protocoloNombre: 'protocolo.pdf',
  };
}

function availabilityPayload(count = 1) {
  const request = payload(count);
  return {
    campusId: request.campusId,
    fechaInicio: request.fechaInicio,
    horaInicio: request.horaInicio,
    fechaFin: request.fechaFin,
    horaFin: request.horaFin,
    equiposSolicitados: request.equiposSolicitados,
  };
}

async function expectCode(promise: Promise<unknown>, functionalCode: string): Promise<void> {
  await expect(promise).rejects.toMatchObject<Partial<EventsError>>({ functionalCode });
}

describe('casos de uso de Eventos', () => {
  it('acepta veinte tipos distintos y delega la creación transaccional', async () => {
    const repo = repository();
    await expect(createEventRecord(identity, payload(20), dependencies(repo))).resolves.toEqual({
      eventId: 'event-id',
      status: 'saved',
      calendarStatus: 'pending',
      notificationStatus: 'pending',
    });
    expect(repo.create).toHaveBeenCalledOnce();
  });

  it('rechaza veintiún tipos antes de consultar disponibilidad', async () => {
    const repo = repository();
    await expectCode(
      createEventRecord(identity, payload(21), dependencies(repo)),
      'invalid-argument',
    );
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('rechaza IDs de equipo repetidos', async () => {
    const request = payload(2);
    request.equiposSolicitados[1] = { equipoId: 'equipo-0', cantidad: 1 };
    await expectCode(createEventRecord(identity, request, dependencies()), 'invalid-argument');
  });

  it('rechaza identidad sin claim y perfil canónico inactivo', async () => {
    await expectCode(createEventRecord(null, payload(), dependencies()), 'unauthenticated');
    const repo = repository();
    vi.mocked(repo.findCanonicalRequester).mockResolvedValue({
      uid: 'user-uid',
      nombre: 'Omar Sánchez',
      correo: 'omar.sanchez@tecplayacar.edu.mx',
      role: 'usuario',
      activo: false,
    });
    await expectCode(
      createEventRecord(identity, payload(), dependencies(repo)),
      'permission-denied',
    );
  });

  it('devuelve fechas ISO y marca la previsualización como no confirmable', async () => {
    const repo = repository();
    vi.mocked(repo.checkAvailability).mockResolvedValue([
      {
        equipmentId: 'equipo-0',
        requested: 2,
        available: 1,
        confirmable: false,
        blockStart: new Date('2026-10-06T16:00:00.000Z'),
        blockEnd: new Date('2026-10-06T19:30:00.000Z'),
        requiresTransfer: false,
      },
    ]);
    await expect(
      checkEventAvailability(identity, availabilityPayload(), dependencies(repo)),
    ).resolves.toMatchObject({
      confirmable: false,
      items: [
        {
          blockStart: '2026-10-06T16:00:00.000Z',
          blockEnd: '2026-10-06T19:30:00.000Z',
        },
      ],
    });
  });
});
