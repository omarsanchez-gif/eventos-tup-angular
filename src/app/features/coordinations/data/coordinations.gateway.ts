import { InjectionToken } from '@angular/core';

import type {
  CoordinationMutationResult,
  CoordinationsListResult,
  CreateSystemCoordinationInput,
  SelectableCoordinationsListResult,
  SetSystemCoordinationStatusInput,
  UpdateSystemCoordinationInput,
} from '../../../shared/models/system-coordination';

export interface CoordinationsGateway {
  list(): Promise<CoordinationsListResult>;
  listSelectable(): Promise<SelectableCoordinationsListResult>;
  create(input: CreateSystemCoordinationInput): Promise<CoordinationMutationResult>;
  update(input: UpdateSystemCoordinationInput): Promise<CoordinationMutationResult>;
  setStatus(input: SetSystemCoordinationStatusInput): Promise<CoordinationMutationResult>;
  delete(documentId: string): Promise<CoordinationMutationResult>;
}

export const COORDINATIONS_GATEWAY = new InjectionToken<CoordinationsGateway>(
  'COORDINATIONS_GATEWAY',
);
