import { describe, expect, it, vi } from 'vitest';

import {
  checkEventAvailability,
  syncUpdatedEventIntegrationsRecord,
  type EventDetail,
  buildEventSearchTerms,
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
    getDetail: vi.fn(),
    getNotificationRevision: vi.fn(async () => 1),
    update: vi.fn(),
    cancel: vi.fn(),
    confirmCoverage: vi.fn(),
    confirmReception: vi.fn(),
    reportDelay: vi.fn(),
  };
}

function dependencies(eventsRepository = repository()): EventsDependencies {
  return {
    repository: eventsRepository,
    clock: { now: () => fixedNow },
    logger: { warn: vi.fn(), error: vi.fn() },
    protocols: {
      validate: vi.fn(async () => ({ path: 'eventos/2026/protocolo.pdf' })),
      remove: vi.fn(async () => undefined),
    },
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
      calendarStatus: 'pendiente',
      notificationStatus: 'pendiente',
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

  it('conserva el eventId de una previsualización de edición para validarlo en repositorio', async () => {
    const repo = repository();
    await checkEventAvailability(
      identity,
      { ...availabilityPayload(), eventId: 'event-id' },
      dependencies(repo),
    );
    expect(repo.checkAvailability).toHaveBeenCalledWith(
      identity.uid,
      expect.objectContaining({ eventId: 'event-id' }),
      fixedNow,
    );
  });

  it('genera términos normalizados de evento y responsable sin duplicados', () => {
    const terms = buildEventSearchTerms('Ceremonía Académica', 'Omar Sánchez');
    expect(terms).toContain('ceremonia');
    expect(terms).toContain('academica');
    expect(terms).toContain('omar');
    expect(terms).toContain('sanchez');
    expect(new Set(terms).size).toBe(terms.length);
  });

  describe('sincronización de revisión autorizada antes de consultar', () => {
    function setup(owned = true) {
      const repo = repository();
      vi.mocked(repo.getDetail).mockResolvedValue({ ownedByRequester: owned } as EventDetail);
      const deps = {
        ...dependencies(repo),
        integrations: {
          reconcile: vi.fn(async () => ({
            calendarStatus: 'sincronizado' as const,
            notificationStatus: 'completas' as const,
          })),
        },
      };
      return { repo, deps };
    }
    const request = { eventId: 'event-1', revisionEsperada: 1 };

    it.each([null, { ...identity, authorized: false }, { ...identity, role: 'otro' }])(
      'rechaza identidad %j sin leer evento ni revisión',
      async (actor) => {
        const { repo, deps } = setup();
        await expect(
          syncUpdatedEventIntegrationsRecord(actor, request, deps),
        ).rejects.toBeDefined();
        expect(repo.findCanonicalRequester).not.toHaveBeenCalled();
        expect(repo.getDetail).not.toHaveBeenCalled();
        expect(repo.getNotificationRevision).not.toHaveBeenCalled();
        expect(deps.integrations.reconcile).not.toHaveBeenCalled();
      },
    );
    it.each(['inactivo', 'rol divergente', 'inexistente'])(
      'rechaza perfil canónico %s antes del evento',
      async (variant) => {
        const { repo, deps } = setup();
        vi.mocked(repo.findCanonicalRequester).mockResolvedValue(
          variant === 'inexistente'
            ? null
            : {
                uid: identity.uid,
                nombre: 'Usuario',
                correo: 'user@tecplayacar.edu.mx',
                activo: variant !== 'inactivo',
                role: variant === 'rol divergente' ? 'admin' : 'usuario',
              },
        );
        await expectCode(
          syncUpdatedEventIntegrationsRecord(identity, request, deps),
          'permission-denied',
        );
        expect(repo.getDetail).not.toHaveBeenCalled();
        expect(repo.getNotificationRevision).not.toHaveBeenCalled();
      },
    );
    it('no revela revisión de evento ajeno', async () => {
      const { repo, deps } = setup(false);
      await expectCode(
        syncUpdatedEventIntegrationsRecord(identity, { ...request, revisionEsperada: 99 }, deps),
        'permission-denied',
      );
      expect(repo.getNotificationRevision).not.toHaveBeenCalled();
      expect(deps.integrations.reconcile).not.toHaveBeenCalled();
    });
    it.each(['propietario', 'admin'])(
      'permite %s y verifica revisión después de permisos',
      async (role) => {
        const { repo, deps } = setup(role === 'propietario');
        const actor = role === 'admin' ? { ...identity, role: 'admin' } : identity;
        if (role === 'admin')
          vi.mocked(repo.findCanonicalRequester).mockResolvedValue({
            uid: identity.uid,
            nombre: 'Admin',
            correo: 'admin@tecplayacar.edu.mx',
            activo: true,
            role: 'admin',
          });
        await expect(
          syncUpdatedEventIntegrationsRecord(actor, request, deps),
        ).resolves.toMatchObject({ calendarStatus: 'sincronizado' });
        expect(repo.findCanonicalRequester).toHaveBeenCalledBefore(vi.mocked(repo.getDetail));
        expect(repo.getDetail).toHaveBeenCalledBefore(vi.mocked(repo.getNotificationRevision));
        expect(repo.getNotificationRevision).toHaveBeenCalledBefore(deps.integrations.reconcile);
      },
    );
    it.each([
      { eventId: 'bad/path', revisionEsperada: 1 },
      { ...request, extra: true },
      { ...request, revisionEsperada: '1' },
    ])('rechaza entrada inválida %j', async (data) => {
      const { repo, deps } = setup();
      await expectCode(
        syncUpdatedEventIntegrationsRecord(identity, data, deps),
        'invalid-argument',
      );
      expect(repo.getDetail).not.toHaveBeenCalled();
      expect(repo.getNotificationRevision).not.toHaveBeenCalled();
    });
    it('rechaza revisión antigua sin llamar integraciones', async () => {
      const { repo, deps } = setup();
      vi.mocked(repo.getNotificationRevision).mockResolvedValue(2);
      await expect(
        syncUpdatedEventIntegrationsRecord(identity, request, deps),
      ).rejects.toMatchObject({ functionsCode: 'failed-precondition' });
      expect(deps.integrations.reconcile).not.toHaveBeenCalled();
    });
  });
});
