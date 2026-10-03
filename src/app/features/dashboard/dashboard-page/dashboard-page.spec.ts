import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { AuthFacade } from '../../../core/auth/auth.facade';
import type { DashboardSummary } from '../../../shared/models/dashboard-summary';
import { DASHBOARD_GATEWAY, type DashboardGateway } from '../data/dashboard.gateway';
import { DashboardPage } from './dashboard-page';

const summary: DashboardSummary = {
  serverNow: '2026-10-03T17:00:00.000Z',
  metrics: {
    registeredEvents: 12,
    upcomingEvents: 4,
    activeUsers: 3,
    eventsWithProtocol: 10,
  },
  upcoming: [
    {
      eventId: 'event-1',
      name: 'Ceremonia institucional',
      dateStart: '2026-10-10',
      timeStart: '10:00',
      responsible: 'Omar Sánchez',
      status: 'programado',
    },
  ],
  recentActivity: [
    {
      eventId: 'event-1',
      name: 'Ceremonia institucional',
      action: 'actualizacion',
      occurredAt: '2026-10-02T17:00:00.000Z',
      responsible: 'Omar Sánchez',
      status: 'programado',
    },
  ],
  unavailableSections: [],
};

describe('DashboardPage', () => {
  let fixture: ComponentFixture<DashboardPage>;
  let gateway: DashboardGateway;

  beforeEach(async () => {
    gateway = { getSummary: vi.fn(async () => summary) };
    await TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [
        { provide: DASHBOARD_GATEWAY, useValue: gateway },
        {
          provide: AuthFacade,
          useValue: {
            user: signal({
              uid: 'user-uid',
              nombre: 'Omar Sánchez',
              correo: 'omar.sanchez@tecplayacar.edu.mx',
              rol: 'admin' as const,
              activo: true as const,
            }).asReadonly(),
          },
        },
      ],
    }).compileComponents();
  });

  it('muestra perfil, cuatro KPI y datos reales de eventos', async () => {
    fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(gateway.getSummary).toHaveBeenCalledOnce();
    expect(element.textContent).toContain('Bienvenido, Omar Sánchez');
    expect(element.textContent).toContain('omar.sanchez@tecplayacar.edu.mx');
    expect(element.querySelectorAll('.kpi-card')).toHaveLength(4);
    expect(element.textContent).toContain('Ceremonia institucional');
    expect(element.textContent).toContain('Evento actualizado');
  });

  it('muestra guion y advertencia para un KPI no disponible', async () => {
    vi.mocked(gateway.getSummary).mockResolvedValue({
      ...summary,
      metrics: { ...summary.metrics, activeUsers: null },
      unavailableSections: ['activeUsers'],
    });
    fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Algunos datos no están disponibles');
    expect(element.textContent).toContain('—');
  });
});
