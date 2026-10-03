import { inject, Injectable } from '@angular/core';
import { httpsCallable } from 'firebase/functions';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { FIREBASE_FUNCTIONS, FIREBASE_STORAGE } from '../../../core/firebase/firebase.tokens';
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
import type { EventsGateway } from './events.gateway';

@Injectable()
export class FirebaseEventsGateway implements EventsGateway {
  private readonly functions = inject(FIREBASE_FUNCTIONS);
  private readonly storage = inject(FIREBASE_STORAGE);

  async list(cursor: string | null, search: string | null): Promise<EventListResult> {
    const callable = httpsCallable<
      { readonly cursor: string | null; readonly busqueda: string | null },
      EventListResult
    >(this.functions, 'listEvents');
    return (await callable({ cursor, busqueda: search })).data;
  }

  async listCalendar(input: {
    readonly inicio: string;
    readonly fin: string;
    readonly campusId: string | null;
  }): Promise<EventCalendarResult> {
    const callable = httpsCallable<typeof input, EventCalendarResult>(
      this.functions,
      'listCalendarEvents',
    );
    return (await callable(input)).data;
  }

  async checkAvailability(input: EventAvailabilityInput): Promise<EventAvailabilityResult> {
    const callable = httpsCallable<EventAvailabilityInput, EventAvailabilityResult>(
      this.functions,
      'checkEventAvailability',
    );
    return (await callable(input)).data;
  }

  async uploadProtocol(file: File, year: string): Promise<string> {
    if (!/^\d{4}$/u.test(year)) throw new Error('invalid-year');
    const identifier = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
    const protocol = ref(this.storage, `eventos/${year}/${identifier}.pdf`);
    const result = await uploadBytes(protocol, file, { contentType: 'application/pdf' });
    return getDownloadURL(result.ref);
  }

  async create(input: CreateSystemEventInput): Promise<EventCreationResult> {
    const callable = httpsCallable<CreateSystemEventInput, EventCreationResult>(
      this.functions,
      'createEvent',
    );
    return (await callable(input)).data;
  }

  async detail(eventId: string): Promise<EventDetail> {
    const callable = httpsCallable<{ readonly eventId: string }, EventDetail>(
      this.functions,
      'getEventDetail',
    );
    return (await callable({ eventId })).data;
  }

  async update(eventId: string, input: CreateSystemEventInput): Promise<EventMutationResult> {
    const callable = httpsCallable<
      CreateSystemEventInput & { readonly eventId: string },
      EventMutationResult
    >(this.functions, 'updateEvent');
    return (await callable({ eventId, ...input })).data;
  }

  async cancel(eventId: string): Promise<EventMutationResult> {
    const callable = httpsCallable<{ readonly eventId: string }, EventMutationResult>(
      this.functions,
      'cancelEvent',
    );
    return (await callable({ eventId })).data;
  }

  async reconcile(eventId: string) {
    const callable = httpsCallable<
      { readonly eventId: string },
      {
        readonly calendarStatus: EventDetail['calendarStatus'];
        readonly notificationStatus: EventDetail['notificationStatus'];
      }
    >(this.functions, 'reconcileEventIntegrations');
    return (await callable({ eventId })).data;
  }

  async confirmCoverage(eventId: string, equipmentId: string): Promise<void> {
    const callable = httpsCallable(this.functions, 'confirmReservationCoverage');
    await callable({ eventId, equipmentId });
  }

  async confirmReception(eventId: string, equipmentId: string): Promise<void> {
    const callable = httpsCallable(this.functions, 'confirmEquipmentReception');
    await callable({ eventId, equipmentId });
  }

  async reportDelay(eventId: string, equipmentId: string, release: string): Promise<void> {
    const callable = httpsCallable(this.functions, 'reportEquipmentDelay');
    await callable({ eventId, equipmentId, nuevaLiberacion: release });
  }
}
