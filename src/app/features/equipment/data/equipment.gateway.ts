import { InjectionToken } from '@angular/core';

import type {
  CreateSystemEquipmentInput,
  EquipmentListResult,
  EquipmentMutationResult,
  SelectableEquipmentListResult,
  SetSystemEquipmentStatusInput,
  UpdateSystemEquipmentInput,
} from '../../../shared/models/system-equipment';

export interface EquipmentGateway {
  list(): Promise<EquipmentListResult>;
  listSelectable(): Promise<SelectableEquipmentListResult>;
  create(input: CreateSystemEquipmentInput): Promise<EquipmentMutationResult>;
  update(input: UpdateSystemEquipmentInput): Promise<EquipmentMutationResult>;
  setStatus(input: SetSystemEquipmentStatusInput): Promise<EquipmentMutationResult>;
  delete(documentId: string): Promise<EquipmentMutationResult>;
}
export const EQUIPMENT_GATEWAY = new InjectionToken<EquipmentGateway>('EQUIPMENT_GATEWAY');
