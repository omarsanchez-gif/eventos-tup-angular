import { inject, Injectable } from '@angular/core';
import { httpsCallable } from 'firebase/functions';

import { FIREBASE_FUNCTIONS } from '../../../core/firebase/firebase.tokens';
import type {
  CampusesListResult,
  CampusMutationResult,
  CreateSystemCampusInput,
  SelectableCampusesListResult,
  SetSystemCampusStatusInput,
  UpdateSystemCampusInput,
} from '../../../shared/models/system-campus';
import type { CampusesGateway } from './campuses.gateway';

@Injectable()
export class FirebaseCampusesGateway implements CampusesGateway {
  private readonly functions = inject(FIREBASE_FUNCTIONS);

  async list(): Promise<CampusesListResult> {
    const callable = httpsCallable<Record<string, never>, CampusesListResult>(
      this.functions,
      'listCampuses',
    );
    return (await callable({})).data;
  }
  async listSelectable(): Promise<SelectableCampusesListResult> {
    const callable = httpsCallable<Record<string, never>, SelectableCampusesListResult>(
      this.functions,
      'listSelectableCampuses',
    );
    return (await callable({})).data;
  }
  async create(input: CreateSystemCampusInput): Promise<CampusMutationResult> {
    const callable = httpsCallable<CreateSystemCampusInput, CampusMutationResult>(
      this.functions,
      'createCampus',
    );
    return (await callable(input)).data;
  }
  async update(input: UpdateSystemCampusInput): Promise<CampusMutationResult> {
    const callable = httpsCallable<UpdateSystemCampusInput, CampusMutationResult>(
      this.functions,
      'updateCampus',
    );
    return (await callable(input)).data;
  }
  async setStatus(input: SetSystemCampusStatusInput): Promise<CampusMutationResult> {
    const callable = httpsCallable<SetSystemCampusStatusInput, CampusMutationResult>(
      this.functions,
      'setCampusStatus',
    );
    return (await callable(input)).data;
  }
  async delete(documentId: string): Promise<CampusMutationResult> {
    const callable = httpsCallable<{ readonly documentId: string }, CampusMutationResult>(
      this.functions,
      'deleteCampus',
    );
    return (await callable({ documentId })).data;
  }
}
