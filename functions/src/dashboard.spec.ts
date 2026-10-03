import { describe, expect, it, vi } from 'vitest';

import {
  DashboardError,
  deriveDashboardStatus,
  getDashboardSummary,
  type DashboardDependencies,
  type DashboardEventRecord,
  type DashboardRepository,
} from './dashboard.js';

const fixedNow = new Date('2026-10-03T12:00:00-05:00');
const identity = { uid: 'user-uid', authorized: true, role: 'usuario' as const };

function event(overrides: Partial<DashboardEventRecord> = {}): DashboardEventRecord {
  return {
    eventId: 'event-1',
    name: 'Ceremonia institucional',
    dateStart: '2026-10-10',
    timeStart: '10:00',
    responsible: 'Omar Sánchez',
    persistedStatus: 'programado',
    start: new Date('2026-10-10T10:00:00-05:00'),
    end: new Date('2026-10-10T12:00:00-05:00'),
    createdAt: new Date('2026-10-01T14:00:00-05:00'),
    updatedAt: new Date('2026-10-01T14:00:00-05:00'),
    ...overrides,
  };
}

function repository(): DashboardRepository {
  return {
    findCanonicalRequester: vi.fn(async () => ({ active: true, role: 'usuario' as const })),
    countRegisteredEvents: vi.fn(async () => 12),
    countUpcomingEvents: vi.fn(async () => 4),
    countActiveUsers: vi.fn(async () => 3),
    countEventsWithProtocol: vi.fn(async () => 10),
    listUpcomingEvents: vi.fn(async () => [event()]),
    listRecentActivity: vi.fn(async () => [event()]),
  };
}

function dependencies(repo = repository()): DashboardDependencies {
  return {
    repository: repo,
    clock: { now: () => fixedNow },
    logger: { warn: vi.fn() },
  };
}

async function expectCode(promise: Promise<unknown>, functionalCode: string): Promise<void> {
  await expect(promise).rejects.toMatchObject<Partial<DashboardError>>({ functionalCode });
}

describe('Dashboard', () => {
  it('rechaza entrada, sesión o perfil canónico no válidos', async () => {
    await expectCode(
      getDashboardSummary(identity, { filter: true }, dependencies()),
      'invalid-argument',
    );
    await expectCode(getDashboardSummary(null, {}, dependencies()), 'unauthenticated');
    await expectCode(
      getDashboardSummary({ ...identity, authorized: false }, {}, dependencies()),
      'permission-denied',
    );
    const repo = repository();
    vi.mocked(repo.findCanonicalRequester).mockResolvedValue({ active: false, role: 'usuario' });
    await expectCode(getDashboardSummary(identity, {}, dependencies(repo)), 'permission-denied');
  });

  it('devuelve métricas, listas sanitizadas y hora de servidor', async () => {
    const result = await getDashboardSummary(identity, {}, dependencies());
    expect(result).toMatchObject({
      serverNow: fixedNow.toISOString(),
      metrics: {
        registeredEvents: 12,
        upcomingEvents: 4,
        activeUsers: 3,
        eventsWithProtocol: 10,
      },
      unavailableSections: [],
      upcoming: [{ eventId: 'event-1', status: 'programado' }],
      recentActivity: [{ eventId: 'event-1', action: 'creacion' }],
    });
  });

  it('consulta una ventana de treinta días y limita ambas listas a cinco', async () => {
    const repo = repository();
    await getDashboardSummary(identity, {}, dependencies(repo));
    const expectedEnd = new Date(fixedNow.getTime() + 30 * 86_400_000);
    expect(repo.countUpcomingEvents).toHaveBeenCalledWith(fixedNow, expectedEnd);
    expect(repo.listUpcomingEvents).toHaveBeenCalledWith(fixedNow, expectedEnd, 5);
    expect(repo.listRecentActivity).toHaveBeenCalledWith(5);
  });

  it('conserva secciones válidas y marca un fallo parcial sin filtrar la causa', async () => {
    const repo = repository();
    vi.mocked(repo.countActiveUsers).mockRejectedValue(new Error('sensitive query detail'));
    const deps = dependencies(repo);
    const result = await getDashboardSummary(identity, {}, deps);
    expect(result.metrics.activeUsers).toBeNull();
    expect(result.metrics.registeredEvents).toBe(12);
    expect(result.unavailableSections).toEqual(['activeUsers']);
    expect(deps.logger.warn).toHaveBeenCalledWith('Una sección del Dashboard no está disponible.', {
      section: 'activeUsers',
      cause: 'Error',
    });
  });

  it('clasifica actividad modificada y omite una actividad sin timestamps', async () => {
    const repo = repository();
    vi.mocked(repo.listRecentActivity).mockResolvedValue([
      event({ updatedAt: new Date('2026-10-02T14:00:00-05:00') }),
      event({ eventId: 'event-2', createdAt: null, updatedAt: null }),
    ]);
    const result = await getDashboardSummary(identity, {}, dependencies(repo));
    expect(result.recentActivity).toHaveLength(1);
    expect(result.recentActivity[0]).toMatchObject({ action: 'actualizacion' });
  });

  it('deriva los estados temporales y conserva cancelado', () => {
    const start = new Date('2026-10-03T13:00:00-05:00');
    const end = new Date('2026-10-03T15:00:00-05:00');
    expect(deriveDashboardStatus('programado', start, end, fixedNow)).toBe('programado');
    expect(
      deriveDashboardStatus('programado', new Date('2026-10-03T11:00:00-05:00'), end, fixedNow),
    ).toBe('en_ejecucion');
    expect(
      deriveDashboardStatus(
        'programado',
        new Date('2026-10-03T09:00:00-05:00'),
        new Date('2026-10-03T11:00:00-05:00'),
        fixedNow,
      ),
    ).toBe('finalizado');
    expect(deriveDashboardStatus('cancelado', start, end, fixedNow)).toBe('cancelado');
    expect(deriveDashboardStatus('registrado', null, null, fixedNow)).toBe('programado');
  });
});
