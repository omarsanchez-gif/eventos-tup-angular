import { InjectionToken } from '@angular/core';

import type {
  CreateSystemUserInput,
  SetSystemUserStatusInput,
  UpdateSystemUserInput,
  UserMutationResult,
  UsersListResult,
} from '../../../shared/models/system-user';

export interface UsersGateway {
  list(): Promise<UsersListResult>;
  create(input: CreateSystemUserInput): Promise<UserMutationResult>;
  update(input: UpdateSystemUserInput): Promise<UserMutationResult>;
  setStatus(input: SetSystemUserStatusInput): Promise<UserMutationResult>;
  delete(documentId: string): Promise<UserMutationResult>;
}

export const USERS_GATEWAY = new InjectionToken<UsersGateway>('USERS_GATEWAY');
