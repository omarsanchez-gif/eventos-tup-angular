import { inject, Injectable } from '@angular/core';
import { httpsCallable } from 'firebase/functions';

import { FIREBASE_FUNCTIONS } from '../../../core/firebase/firebase.tokens';
import type {
  CoordinationMutationResult,
  CoordinationsListResult,
  CreateSystemCoordinationInput,
  SelectableCoordinationsListResult,
  SetSystemCoordinationStatusInput,
  UpdateSystemCoordinationInput,
} from '../../../shared/models/system-coordination';
import type { CoordinationsGateway } from './coordinations.gateway';

@Injectable()
export class FirebaseCoordinationsGateway implements CoordinationsGateway {
  private readonly functions = inject(FIREBASE_FUNCTIONS);

  async list(): Promise<CoordinationsListResult> {
    const callable = httpsCallable<Record<string, never>, CoordinationsListResult>(
      this.functions,
      'listCoordinations',
    );
    return (await callable({})).data;
  }

  async listSelectable(): Promise<SelectableCoordinationsListResult> {
    const callable = httpsCallable<Record<string, never>, SelectableCoordinationsListResult>(
      this.functions,
      'listSelectableCoordinations',
    );
    return (await callable({})).data;
  }

  async create(input: CreateSystemCoordinationInput): Promise<CoordinationMutationResult> {
    const callable = httpsCallable<CreateSystemCoordinationInput, CoordinationMutationResult>(
      this.functions,
      'createCoordination',
    );
    return (await callable(input)).data;
  }

  async update(input: UpdateSystemCoordinationInput): Promise<CoordinationMutationResult> {
    const callable = httpsCallable<UpdateSystemCoordinationInput, CoordinationMutationResult>(
      this.functions,
      'updateCoordination',
    );
    return (await callable(input)).data;
  }

  async setStatus(input: SetSystemCoordinationStatusInput): Promise<CoordinationMutationResult> {
    const callable = httpsCallable<SetSystemCoordinationStatusInput, CoordinationMutationResult>(
      this.functions,
      'setCoordinationStatus',
    );
    return (await callable(input)).data;
  }

  async delete(documentId: string): Promise<CoordinationMutationResult> {
    const callable = httpsCallable<{ readonly documentId: string }, CoordinationMutationResult>(
      this.functions,
      'deleteCoordination',
    );
    return (await callable({ documentId })).data;
  }
}
