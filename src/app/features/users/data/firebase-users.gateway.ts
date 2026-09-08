import { inject, Injectable } from '@angular/core';
import { httpsCallable } from 'firebase/functions';

import { FIREBASE_FUNCTIONS } from '../../../core/firebase/firebase.tokens';
import type {
  CreateSystemUserInput,
  SetSystemUserStatusInput,
  UpdateSystemUserInput,
  UserMutationResult,
  UsersListResult,
} from '../../../shared/models/system-user';
import type { UsersGateway } from './users.gateway';

@Injectable()
export class FirebaseUsersGateway implements UsersGateway {
  private readonly functions = inject(FIREBASE_FUNCTIONS);

  async list(): Promise<UsersListResult> {
    const callable = httpsCallable<Record<string, never>, UsersListResult>(
      this.functions,
      'listAuthorizedUsers',
    );
    return (await callable({})).data;
  }

  async create(input: CreateSystemUserInput): Promise<UserMutationResult> {
    const callable = httpsCallable<CreateSystemUserInput, UserMutationResult>(
      this.functions,
      'createAuthorizedUser',
    );
    return (await callable(input)).data;
  }

  async update(input: UpdateSystemUserInput): Promise<UserMutationResult> {
    const callable = httpsCallable<UpdateSystemUserInput, UserMutationResult>(
      this.functions,
      'updateAuthorizedUser',
    );
    return (await callable(input)).data;
  }

  async setStatus(input: SetSystemUserStatusInput): Promise<UserMutationResult> {
    const callable = httpsCallable<SetSystemUserStatusInput, UserMutationResult>(
      this.functions,
      'setAuthorizedUserStatus',
    );
    return (await callable(input)).data;
  }

  async delete(documentId: string): Promise<UserMutationResult> {
    const callable = httpsCallable<{ readonly documentId: string }, UserMutationResult>(
      this.functions,
      'deleteAuthorizedUser',
    );
    return (await callable({ documentId })).data;
  }
}
