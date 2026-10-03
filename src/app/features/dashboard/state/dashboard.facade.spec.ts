import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import type { DashboardSummary } from '../../../shared/models/dashboard-summary';
import { DASHBOARD_GATEWAY, type DashboardGateway } from '../data/dashboard.gateway';
import { DashboardFacade } from './dashboard.facade';

const summary: DashboardSummary = {
  serverNow: '2026-10-03T17:00:00.000Z',
  metrics: {
    registeredEvents: 12,
    upcomingEvents: 4,
    activeUsers: 3,
    eventsWithProtocol: 10,
  },
  upcoming: [],
  recentActivity: [],
  unavailableSections: [],
};

describe('DashboardFacade', () => {
  let facade: DashboardFacade;
  let gateway: DashboardGateway;

  beforeEach(() => {
    gateway = { getSummary: vi.fn(async () => summary) };
    TestBed.configureTestingModule({
      providers: [DashboardFacade, { provide: DASHBOARD_GATEWAY, useValue: gateway }],
    });
    facade = TestBed.inject(DashboardFacade);
  });

  it('carga el resumen real y evita solicitudes solapadas', async () => {
    await Promise.all([facade.load(), facade.load()]);
    expect(gateway.getSummary).toHaveBeenCalledOnce();
    expect(facade.summary()).toEqual(summary);
    expect(facade.error()).toBeNull();
  });

  it('expone advertencia cuando una sección no está disponible', async () => {
    vi.mocked(gateway.getSummary).mockResolvedValue({
      ...summary,
      metrics: { ...summary.metrics, activeUsers: null },
      unavailableSections: ['activeUsers'],
    });
    await facade.load();
    expect(facade.hasPartialData()).toBe(true);
    expect(facade.summary()?.metrics.activeUsers).toBeNull();
  });

  it('convierte un error técnico y permite reintentar', async () => {
    vi.mocked(gateway.getSummary).mockRejectedValueOnce({
      details: { functionalCode: 'service-unavailable' },
    });
    await facade.load();
    expect(facade.summary()).toBeNull();
    expect(facade.error()).toContain('no está disponible');
    await facade.load();
    expect(facade.summary()).toEqual(summary);
    expect(gateway.getSummary).toHaveBeenCalledTimes(2);
  });
});
