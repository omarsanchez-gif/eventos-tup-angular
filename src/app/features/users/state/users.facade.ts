import { computed, inject, Injectable, signal } from '@angular/core';

import type {
  CreateSystemUserInput,
  SystemUser,
  UpdateSystemUserInput,
} from '../../../shared/models/system-user';
import { USERS_GATEWAY } from '../data/users.gateway';
import { mapUsersError, usersFunctionalCode } from '../data/users-error.mapper';

const DEFAULT_PAGE_SIZE = 10;

@Injectable()
export class UsersFacade {
  private readonly gateway = inject(USERS_GATEWAY);
  private readonly usersState = signal<readonly SystemUser[]>([]);
  private readonly searchState = signal('');
  private readonly pageState = signal(1);
  private readonly pageSizeState = signal(DEFAULT_PAGE_SIZE);
  private readonly loadingState = signal(false);
  private readonly mutatingState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private readonly noticeState = signal<string | null>(null);
  private readonly reconciliationState = signal<string | null>(null);
  private loadPromise: Promise<void> | null = null;

  readonly users = this.usersState.asReadonly();
  readonly searchTerm = this.searchState.asReadonly();
  readonly page = this.pageState.asReadonly();
  readonly pageSize = this.pageSizeState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly mutating = this.mutatingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly notice = this.noticeState.asReadonly();
  readonly reconciliation = this.reconciliationState.asReadonly();
  readonly filteredUsers = computed(() => {
    const term = this.searchState().trim().toLocaleLowerCase('es-MX');
    if (!term) {
      return this.usersState();
    }
    return this.usersState().filter((user) =>
      `${user.nombre} ${user.correo}`.toLocaleLowerCase('es-MX').includes(term),
    );
  });
  readonly resultCount = computed(() => this.filteredUsers().length);
  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.resultCount() / this.pageSizeState())),
  );
  readonly visibleUsers = computed(() => {
    const start = (this.pageState() - 1) * this.pageSizeState();
    return this.filteredUsers().slice(start, start + this.pageSizeState());
  });
  readonly hasUsers = computed(() => this.usersState().length > 0);
  readonly hasMatches = computed(() => this.filteredUsers().length > 0);

  load(): Promise<void> {
    if (this.loadPromise) {
      return this.loadPromise;
    }
    this.loadingState.set(true);
    this.errorState.set(null);
    this.loadPromise = this.gateway
      .list()
      .then((result) => {
        this.usersState.set(result.items);
        this.ensureValidPage();
      })
      .catch((error: unknown) => {
        this.errorState.set(mapUsersError(error));
      })
      .finally(() => {
        this.loadingState.set(false);
        this.loadPromise = null;
      });
    return this.loadPromise;
  }

  search(term: string): void {
    this.searchState.set(term.trim());
    this.pageState.set(1);
  }

  clearSearch(): void {
    this.searchState.set('');
    this.pageState.set(1);
  }

  setPage(page: number): void {
    this.pageState.set(Math.min(Math.max(1, page), this.totalPages()));
  }

  setPageSize(pageSize: number): void {
    if (![5, 10, 15, 20].includes(pageSize)) {
      return;
    }
    this.pageSizeState.set(pageSize);
    this.pageState.set(1);
  }

  create(input: CreateSystemUserInput): Promise<boolean> {
    return this.mutate(() => this.gateway.create(input), 'Usuario creado correctamente.');
  }

  update(input: UpdateSystemUserInput): Promise<boolean> {
    return this.mutate(() => this.gateway.update(input), 'Usuario actualizado correctamente.');
  }

  setStatus(user: SystemUser, activo: boolean): Promise<boolean> {
    return this.mutate(
      () => this.gateway.setStatus({ documentId: user.documentId, activo }),
      activo ? 'Usuario activado correctamente.' : 'Usuario desactivado correctamente.',
    );
  }

  delete(user: SystemUser): Promise<boolean> {
    return this.mutate(
      () => this.gateway.delete(user.documentId),
      'Autorización eliminada correctamente.',
    );
  }

  clearNotice(): void {
    this.noticeState.set(null);
  }

  clearReconciliation(): void {
    this.reconciliationState.set(null);
  }

  private async mutate(
    operation: () => Promise<unknown>,
    successMessage: string,
  ): Promise<boolean> {
    if (this.mutatingState()) {
      return false;
    }
    this.mutatingState.set(true);
    this.errorState.set(null);
    this.noticeState.set(null);
    try {
      await operation();
      this.reconciliationState.set(null);
      this.noticeState.set(successMessage);
      await this.load();
      return true;
    } catch (error) {
      const message = mapUsersError(error);
      if (usersFunctionalCode(error) === 'reconciliation-required') {
        this.reconciliationState.set(message);
      } else {
        this.errorState.set(message);
      }
      return false;
    } finally {
      this.mutatingState.set(false);
    }
  }

  private ensureValidPage(): void {
    if (this.pageState() > this.totalPages()) {
      this.pageState.set(this.totalPages());
    }
  }
}
