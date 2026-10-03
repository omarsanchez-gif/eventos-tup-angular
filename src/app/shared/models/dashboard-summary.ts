import type { EventTemporalStatus } from './system-event';

export type DashboardSection =
  | 'registeredEvents'
  | 'upcomingEvents'
  | 'activeUsers'
  | 'eventsWithProtocol'
  | 'upcoming'
  | 'recentActivity';

export interface DashboardEventSummary {
  readonly eventId: string;
  readonly name: string;
  readonly dateStart: string;
  readonly timeStart: string;
  readonly responsible: string;
  readonly status: EventTemporalStatus;
}

export interface DashboardActivity {
  readonly eventId: string;
  readonly name: string;
  readonly action: 'creacion' | 'actualizacion';
  readonly occurredAt: string;
  readonly responsible: string;
  readonly status: EventTemporalStatus;
}

export interface DashboardSummary {
  readonly serverNow: string;
  readonly metrics: {
    readonly registeredEvents: number | null;
    readonly upcomingEvents: number | null;
    readonly activeUsers: number | null;
    readonly eventsWithProtocol: number | null;
  };
  readonly upcoming: readonly DashboardEventSummary[];
  readonly recentActivity: readonly DashboardActivity[];
  readonly unavailableSections: readonly DashboardSection[];
}
