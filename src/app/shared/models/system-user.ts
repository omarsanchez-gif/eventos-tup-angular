import type { UserRole } from './authorized-user';

export type UserTimestamp =
  | Date
  | string
  | number
  | Readonly<{
      toDate?: () => Date;
      seconds?: number;
      _seconds?: number;
    }>
  | null;

export interface SystemUser {
  readonly documentId: string;
  readonly uid: string | null;
  readonly nombre: string;
  readonly correo: string;
  readonly rol: UserRole;
  readonly activo: boolean;
  readonly fechaCreacion: UserTimestamp;
  readonly ultimoAcceso: UserTimestamp;
}

export interface CreateSystemUserInput {
  readonly nombre: string;
  readonly correo: string;
  readonly rol: UserRole;
  readonly activo: boolean;
}

export interface UpdateSystemUserInput {
  readonly documentId: string;
  readonly nombre: string;
  readonly correo: string;
  readonly rol: UserRole;
}

export interface SetSystemUserStatusInput {
  readonly documentId: string;
  readonly activo: boolean;
}

export interface UsersListResult {
  readonly items: readonly SystemUser[];
  readonly total: number;
  readonly maxSupported: 500;
}

export interface UserMutationResult {
  readonly documentId: string;
  readonly status: 'completed' | 'reconciliation_required';
}
