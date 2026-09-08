import { inject, Injectable } from '@angular/core';
import { httpsCallable } from 'firebase/functions';

import { FIREBASE_FUNCTIONS } from '../../../core/firebase/firebase.tokens';
import type {
  CreateSystemEquipmentInput,
  EquipmentListResult,
  EquipmentMutationResult,
  SelectableEquipmentListResult,
  SetSystemEquipmentStatusInput,
  UpdateSystemEquipmentInput,
} from '../../../shared/models/system-equipment';
import type { EquipmentGateway } from './equipment.gateway';

@Injectable()
export class FirebaseEquipmentGateway implements EquipmentGateway {
  private readonly functions = inject(FIREBASE_FUNCTIONS);

  async list(): Promise<EquipmentListResult> {
    const callable = httpsCallable<Record<string, never>, EquipmentListResult>(
      this.functions,
      'listEquipment',
    );
    return (await callable({})).data;
  }
  async listSelectable(): Promise<SelectableEquipmentListResult> {
    const callable = httpsCallable<Record<string, never>, SelectableEquipmentListResult>(
      this.functions,
      'listSelectableEquipment',
    );
    return (await callable({})).data;
  }
  async create(input: CreateSystemEquipmentInput): Promise<EquipmentMutationResult> {
    const callable = httpsCallable<CreateSystemEquipmentInput, EquipmentMutationResult>(
      this.functions,
      'createEquipment',
    );
    return (await callable(input)).data;
  }
  async update(input: UpdateSystemEquipmentInput): Promise<EquipmentMutationResult> {
    const callable = httpsCallable<UpdateSystemEquipmentInput, EquipmentMutationResult>(
      this.functions,
      'updateEquipment',
    );
    return (await callable(input)).data;
  }
  async setStatus(input: SetSystemEquipmentStatusInput): Promise<EquipmentMutationResult> {
    const callable = httpsCallable<SetSystemEquipmentStatusInput, EquipmentMutationResult>(
      this.functions,
      'setEquipmentStatus',
    );
    return (await callable(input)).data;
  }
  async delete(documentId: string): Promise<EquipmentMutationResult> {
    const callable = httpsCallable<{ readonly documentId: string }, EquipmentMutationResult>(
      this.functions,
      'deleteEquipment',
    );
    return (await callable({ documentId })).data;
  }
}
