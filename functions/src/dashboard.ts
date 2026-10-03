export type DashboardRole = 'admin' | 'usuario';
export type DashboardTemporalStatus = 'programado' | 'en_ejecucion' | 'finalizado' | 'cancelado';
export type DashboardSection =
  | 'registeredEvents'
  | 'upcomingEvents'
  | 'activeUsers'
  | 'eventsWithProtocol'
  | 'upcoming'
  | 'recentActivity';

export interface DashboardRequestIdentity {
  readonly uid: string;
  readonly authorized: boolean;
  readonly role: unknown;
}

export interface DashboardCanonicalRequester {
  readonly active: boolean;
  readonly role: DashboardRole;
}

export interface DashboardEventRecord {
  readonly eventId: string;
  readonly name: string;
  readonly dateStart: string;
  readonly timeStart: string;
  readonly responsible: string;
  readonly persistedStatus: unknown;
  readonly start: Date | null;
  readonly end: Date | null;
  readonly createdAt: Date | null;
  readonly updatedAt: Date | null;
}

export interface DashboardRepository {
  findCanonicalRequester(uid: string): Promise<DashboardCanonicalRequester | null>;
  countRegisteredEvents(): Promise<number>;
  countUpcomingEvents(start: Date, end: Date): Promise<number>;
  countActiveUsers(): Promise<number>;
  countEventsWithProtocol(): Promise<number>;
  listUpcomingEvents(
    start: Date,
    end: Date,
    limit: number,
  ): Promise<readonly DashboardEventRecord[]>;
  listRecentActivity(limit: number): Promise<readonly DashboardEventRecord[]>;
}

export interface DashboardDependencies {
  readonly repository: DashboardRepository;
  readonly clock: { now(): Date };
  readonly logger: {
    warn(message: string, context?: Readonly<Record<string, unknown>>): void;
  };
}

export interface DashboardSummary {
  readonly serverNow: string;
  readonly metrics: {
    readonly registeredEvents: number | null;
    readonly upcomingEvents: number | null;
    readonly activeUsers: number | null;
    readonly eventsWithProtocol: number | null;
  };
  readonly upcoming: readonly {
    readonly eventId: string;
    readonly name: string;
    readonly dateStart: string;
    readonly timeStart: string;
    readonly responsible: string;
    readonly status: DashboardTemporalStatus;
  }[];
  readonly recentActivity: readonly {
    readonly eventId: string;
    readonly name: string;
    readonly action: 'creacion' | 'actualizacion';
    readonly occurredAt: string;
    readonly responsible: string;
    readonly status: DashboardTemporalStatus;
  }[];
  readonly unavailableSections: readonly DashboardSection[];
}

export class DashboardError extends Error {
  constructor(
    readonly functionalCode: 'unauthenticated' | 'permission-denied' | 'invalid-argument',
    readonly functionsCode: 'unauthenticated' | 'permission-denied' | 'invalid-argument',
    message: string,
  ) {
    super(message);
    this.name = 'DashboardError';
  }
}

interface Captured<T> {
  readonly value: T;
  readonly failed: boolean;
}

function isRole(value: unknown): value is DashboardRole {
  return value === 'admin' || value === 'usuario';
}

function requireEmptyObject(data: unknown): void {
  if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).length > 0) {
    throw new DashboardError(
      'invalid-argument',
      'invalid-argument',
      'La solicitud del Dashboard no es válida.',
    );
  }
}

async function capture<T>(
  section: DashboardSection,
  fallback: T,
  operation: () => Promise<T>,
  logger: DashboardDependencies['logger'],
): Promise<Captured<T>> {
  try {
    return { value: await operation(), failed: false };
  } catch (error) {
    logger.warn('Una sección del Dashboard no está disponible.', {
      section,
      cause: error instanceof Error ? error.name : 'unknown',
    });
    return { value: fallback, failed: true };
  }
}

export function deriveDashboardStatus(
  persisted: unknown,
  start: Date | null,
  end: Date | null,
  now: Date,
): DashboardTemporalStatus {
  if (persisted === 'cancelado') return 'cancelado';
  if (start && end) {
    if (now.getTime() < start.getTime()) return 'programado';
    if (now.getTime() < end.getTime()) return 'en_ejecucion';
    return 'finalizado';
  }
  if (persisted === 'finalizado') return 'finalizado';
  if (persisted === 'en_proceso' || persisted === 'en_ejecucion') return 'en_ejecucion';
  return 'programado';
}

export async function getDashboardSummary(
  identity: DashboardRequestIdentity | null,
  data: unknown,
  dependencies: DashboardDependencies,
): Promise<DashboardSummary> {
  requireEmptyObject(data);
  if (!identity) {
    throw new DashboardError('unauthenticated', 'unauthenticated', 'Debe iniciar sesión.');
  }
  if (!identity.authorized || !isRole(identity.role)) {
    throw new DashboardError('permission-denied', 'permission-denied', 'No tiene permisos.');
  }
  const requester = await dependencies.repository.findCanonicalRequester(identity.uid);
  if (!requester?.active || !isRole(requester.role)) {
    throw new DashboardError('permission-denied', 'permission-denied', 'No tiene permisos.');
  }

  const now = dependencies.clock.now();
  const end = new Date(now.getTime() + 30 * 86_400_000);
  const [registered, upcomingCount, activeUsers, protocols, upcoming, recent] = await Promise.all([
    capture(
      'registeredEvents',
      null,
      () => dependencies.repository.countRegisteredEvents(),
      dependencies.logger,
    ),
    capture(
      'upcomingEvents',
      null,
      () => dependencies.repository.countUpcomingEvents(now, end),
      dependencies.logger,
    ),
    capture(
      'activeUsers',
      null,
      () => dependencies.repository.countActiveUsers(),
      dependencies.logger,
    ),
    capture(
      'eventsWithProtocol',
      null,
      () => dependencies.repository.countEventsWithProtocol(),
      dependencies.logger,
    ),
    capture(
      'upcoming',
      [] as readonly DashboardEventRecord[],
      () => dependencies.repository.listUpcomingEvents(now, end, 5),
      dependencies.logger,
    ),
    capture(
      'recentActivity',
      [] as readonly DashboardEventRecord[],
      () => dependencies.repository.listRecentActivity(5),
      dependencies.logger,
    ),
  ]);

  const unavailableSections: DashboardSection[] = [];
  const captures: readonly [DashboardSection, Captured<unknown>][] = [
    ['registeredEvents', registered],
    ['upcomingEvents', upcomingCount],
    ['activeUsers', activeUsers],
    ['eventsWithProtocol', protocols],
    ['upcoming', upcoming],
    ['recentActivity', recent],
  ];
  captures.forEach(([section, result]) => {
    if (result.failed) unavailableSections.push(section);
  });

  return {
    serverNow: now.toISOString(),
    metrics: {
      registeredEvents: registered.value,
      upcomingEvents: upcomingCount.value,
      activeUsers: activeUsers.value,
      eventsWithProtocol: protocols.value,
    },
    upcoming: upcoming.value.map((event) => ({
      eventId: event.eventId,
      name: event.name,
      dateStart: event.dateStart,
      timeStart: event.timeStart,
      responsible: event.responsible,
      status: deriveDashboardStatus(event.persistedStatus, event.start, event.end, now),
    })),
    recentActivity: recent.value.flatMap((event) => {
      const occurredAt = event.updatedAt ?? event.createdAt;
      if (!occurredAt) return [];
      return [
        {
          eventId: event.eventId,
          name: event.name,
          action:
            event.createdAt && event.createdAt.getTime() === occurredAt.getTime()
              ? ('creacion' as const)
              : ('actualizacion' as const),
          occurredAt: occurredAt.toISOString(),
          responsible: event.responsible,
          status: deriveDashboardStatus(event.persistedStatus, event.start, event.end, now),
        },
      ];
    }),
    unavailableSections,
  };
}
