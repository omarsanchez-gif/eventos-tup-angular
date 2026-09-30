import { InjectionToken } from '@angular/core';

import type {
  CreateSystemEventInput,
  EventAvailabilityInput,
  EventAvailabilityResult,
  EventCalendarResult,
  EventCreationResult,
  EventListResult,
} from '../../../shared/models/system-event';

export interface EventsGateway {
  list(cursor: string | null): Promise<EventListResult>;
  listCalendar(input: {
    readonly inicio: string;
    readonly fin: string;
    readonly campusId: string | null;
  }): Promise<EventCalendarResult>;
  checkAvailability(input: EventAvailabilityInput): Promise<EventAvailabilityResult>;
  uploadProtocol(file: File, year: string): Promise<string>;
  create(input: CreateSystemEventInput): Promise<EventCreationResult>;
}

export const EVENTS_GATEWAY = new InjectionToken<EventsGateway>('EVENTS_GATEWAY');
