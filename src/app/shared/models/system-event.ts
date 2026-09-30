export type EventTemporalStatus = 'programado' | 'en_ejecucion' | 'finalizado' | 'cancelado';

export interface RequestedEventEquipment {
  readonly equipoId: string;
  readonly cantidad: number;
}

export interface EventAvailabilityInput {
  readonly campusId: string;
  readonly fechaInicio: string;
  readonly horaInicio: string;
  readonly fechaFin: string;
  readonly horaFin: string;
  readonly equiposSolicitados: readonly RequestedEventEquipment[];
}

export interface EventAvailabilityItem {
  readonly equipmentId: string;
  readonly requested: number;
  readonly available: number;
  readonly confirmable: boolean;
  readonly blockStart: string;
  readonly blockEnd: string;
  readonly requiresTransfer: boolean;
}

export interface EventAvailabilityResult {
  readonly items: readonly EventAvailabilityItem[];
  readonly confirmable: boolean;
  readonly checkedAt: string;
}

export interface CreateSystemEventInput extends EventAvailabilityInput {
  readonly nombreEvento: string;
  readonly observaciones: string;
  readonly coordinacionIds: readonly string[];
  readonly protocoloUrl: string;
  readonly protocoloNombre: string;
}

export interface EventSummary {
  readonly eventId: string;
  readonly name: string;
  readonly dateStart: string;
  readonly timeStart: string;
  readonly dateEnd: string;
  readonly timeEnd: string;
  readonly start: string | null;
  readonly end: string | null;
  readonly responsible: string;
  readonly status: EventTemporalStatus;
  readonly campusId: string | null;
  readonly campusName: string;
  readonly coordinationNames: readonly string[];
  readonly equipmentCount: number;
  readonly creatorUid: string;
  readonly createdAt: string | null;
  readonly protocolUrl: string | null;
  readonly protocolName: string | null;
  readonly calendarStatus: 'synced' | 'pending';
}

export interface EventListResult {
  readonly items: readonly EventSummary[];
  readonly nextCursor: string | null;
  readonly serverNow: string;
}

export interface EventCalendarResult {
  readonly items: readonly EventSummary[];
  readonly serverNow: string;
}

export interface EventCreationResult {
  readonly eventId: string;
  readonly status: 'saved';
  readonly calendarStatus: 'pending';
  readonly notificationStatus: 'pending';
}
