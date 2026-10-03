import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';

import { AuthFacade } from '../../../core/auth/auth.facade';
import type { EventTemporalStatus } from '../../../shared/models/system-event';
import { DashboardFacade } from '../state/dashboard.facade';

interface DashboardKpi {
  readonly key: 'events' | 'upcoming' | 'users' | 'protocols';
  readonly label: string;
  readonly description: string;
  readonly value: number | null;
}

const activityFormatter = new Intl.DateTimeFormat('es-MX', {
  timeZone: 'America/Cancun',
  dateStyle: 'medium',
  timeStyle: 'short',
});

const eventDateFormatter = new Intl.DateTimeFormat('es-MX', {
  timeZone: 'America/Cancun',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

@Component({
  selector: 'app-dashboard-page',
  providers: [DashboardFacade],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage implements OnInit {
  protected readonly auth = inject(AuthFacade);
  protected readonly dashboard = inject(DashboardFacade);
  protected readonly kpis = computed<readonly DashboardKpi[]>(() => {
    const metrics = this.dashboard.summary()?.metrics;
    return [
      {
        key: 'events',
        label: 'Eventos registrados',
        description: 'Histórico completo',
        value: metrics?.registeredEvents ?? null,
      },
      {
        key: 'upcoming',
        label: 'Próximos eventos',
        description: 'Siguientes 30 días',
        value: metrics?.upcomingEvents ?? null,
      },
      {
        key: 'users',
        label: 'Usuarios activos',
        description: 'Acceso habilitado',
        value: metrics?.activeUsers ?? null,
      },
      {
        key: 'protocols',
        label: 'Con protocolo',
        description: 'PDF vigente',
        value: metrics?.eventsWithProtocol ?? null,
      },
    ];
  });

  ngOnInit(): void {
    void this.dashboard.load();
  }

  protected retry(): void {
    void this.dashboard.load();
  }

  protected statusLabel(status: EventTemporalStatus): string {
    return {
      programado: 'Programado',
      en_ejecucion: 'En ejecución',
      finalizado: 'Finalizado',
      cancelado: 'Cancelado',
    }[status];
  }

  protected eventDate(value: string): string {
    const instant = new Date(`${value}T12:00:00-05:00`);
    return Number.isNaN(instant.getTime()) ? value : eventDateFormatter.format(instant);
  }

  protected activityDate(value: string): string {
    const instant = new Date(value);
    return Number.isNaN(instant.getTime()) ? value : activityFormatter.format(instant);
  }
}
