import { InjectionToken } from '@angular/core';

import type {
  CreateSystemEventInput,
  EventAvailabilityInput,
  EventAvailabilityResult,
  EventCalendarResult,
  EventCreationResult,
  EventDetail,
  EventListResult,
  EventMutationResult,
} from '../../../shared/models/system-event';

export interface EventsGateway {
  list(cursor: string | null, search: string | null): Promise<EventListResult>;
  listCalendar(input: {
    readonly inicio: string;
    readonly fin: string;
    readonly campusId: string | null;
  }): Promise<EventCalendarResult>;
  checkAvailability(input: EventAvailabilityInput): Promise<EventAvailabilityResult>;
  uploadProtocol(file: File, year: string): Promise<string>;
  create(input: CreateSystemEventInput): Promise<EventCreationResult>;
  detail(eventId: string): Promise<EventDetail>;
  update(eventId: string, input: CreateSystemEventInput): Promise<EventMutationResult>;
  cancel(eventId: string): Promise<EventMutationResult>;
  reconcile(eventId: string): Promise<{
    readonly calendarStatus: EventDetail['calendarStatus'];
    readonly notificationStatus: EventDetail['notificationStatus'];
  }>;
  confirmCoverage(eventId: string, equipmentId: string): Promise<void>;
  confirmReception(eventId: string, equipmentId: string): Promise<void>;
  reportDelay(eventId: string, equipmentId: string, release: string): Promise<void>;
}

export const EVENTS_GATEWAY = new InjectionToken<EventsGateway>('EVENTS_GATEWAY');
