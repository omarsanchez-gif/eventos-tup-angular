import { InjectionToken } from '@angular/core';

import type {
  CampusesListResult,
  CampusMutationResult,
  CreateSystemCampusInput,
  SelectableCampusesListResult,
  SetSystemCampusStatusInput,
  UpdateSystemCampusInput,
} from '../../../shared/models/system-campus';

export interface CampusesGateway {
  list(): Promise<CampusesListResult>;
  listSelectable(): Promise<SelectableCampusesListResult>;
  create(input: CreateSystemCampusInput): Promise<CampusMutationResult>;
  update(input: UpdateSystemCampusInput): Promise<CampusMutationResult>;
  setStatus(input: SetSystemCampusStatusInput): Promise<CampusMutationResult>;
  delete(documentId: string): Promise<CampusMutationResult>;
}
export const CAMPUSES_GATEWAY = new InjectionToken<CampusesGateway>('CAMPUSES_GATEWAY');
