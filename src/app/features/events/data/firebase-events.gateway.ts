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
  EventListResult,
} from '../../../shared/models/system-event';
import type { EventsGateway } from './events.gateway';

@Injectable()
export class FirebaseEventsGateway implements EventsGateway {
  private readonly functions = inject(FIREBASE_FUNCTIONS);
  private readonly storage = inject(FIREBASE_STORAGE);

  async list(cursor: string | null): Promise<EventListResult> {
    const callable = httpsCallable<{ readonly cursor: string | null }, EventListResult>(
      this.functions,
      'listEvents',
    );
    return (await callable({ cursor })).data;
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
}
