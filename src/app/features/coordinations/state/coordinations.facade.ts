import { computed, inject, Injectable, signal } from '@angular/core';

import type {
  CreateSystemCoordinationInput,
  SystemCoordination,
  UpdateSystemCoordinationInput,
} from '../../../shared/models/system-coordination';
import { COORDINATIONS_GATEWAY } from '../data/coordinations.gateway';
import { mapCoordinationsError } from '../data/coordinations-error.mapper';

const DEFAULT_PAGE_SIZE = 10;

@Injectable()
export class CoordinationsFacade {
  private readonly gateway = inject(COORDINATIONS_GATEWAY);
  private readonly recordsState = signal<readonly SystemCoordination[]>([]);
  private readonly searchState = signal('');
  private readonly pageState = signal(1);
  private readonly pageSizeState = signal(DEFAULT_PAGE_SIZE);
  private readonly loadingState = signal(false);
  private readonly mutatingState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private readonly noticeState = signal<string | null>(null);
  private loadPromise: Promise<void> | null = null;

  readonly records = this.recordsState.asReadonly();
  readonly searchTerm = this.searchState.asReadonly();
  readonly page = this.pageState.asReadonly();
  readonly pageSize = this.pageSizeState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly mutating = this.mutatingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly notice = this.noticeState.asReadonly();
  readonly filteredRecords = computed(() => {
    const term = this.searchState().trim().toLocaleLowerCase('es-MX');
    if (!term) {
      return this.recordsState();
    }
    return this.recordsState().filter((record) =>
      `${record.nombre} ${record.correos.join(' ')}`.toLocaleLowerCase('es-MX').includes(term),
    );
  });
  readonly resultCount = computed(() => this.filteredRecords().length);
  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.resultCount() / this.pageSizeState())),
  );
  readonly visibleRecords = computed(() => {
    const start = (this.pageState() - 1) * this.pageSizeState();
    return this.filteredRecords().slice(start, start + this.pageSizeState());
  });
  readonly hasRecords = computed(() => this.recordsState().length > 0);
  readonly hasMatches = computed(() => this.filteredRecords().length > 0);

  load(): Promise<void> {
    if (this.loadPromise) {
      return this.loadPromise;
    }
    this.loadingState.set(true);
    this.errorState.set(null);
    this.loadPromise = this.gateway
      .list()
      .then((result) => {
        this.recordsState.set(result.items);
        this.ensureValidPage();
      })
      .catch((error: unknown) => this.errorState.set(mapCoordinationsError(error)))
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

  create(input: CreateSystemCoordinationInput): Promise<boolean> {
    return this.mutate(() => this.gateway.create(input), 'Coordinación creada correctamente.');
  }

  update(input: UpdateSystemCoordinationInput): Promise<boolean> {
    return this.mutate(() => this.gateway.update(input), 'Coordinación actualizada correctamente.');
  }

  setStatus(record: SystemCoordination, activo: boolean): Promise<boolean> {
    return this.mutate(
      () => this.gateway.setStatus({ documentId: record.documentId, activo }),
      activo ? 'Coordinación activada correctamente.' : 'Coordinación suspendida correctamente.',
    );
  }

  delete(record: SystemCoordination): Promise<boolean> {
    return this.mutate(
      () => this.gateway.delete(record.documentId),
      'Coordinación eliminada correctamente.',
    );
  }

  clearNotice(): void {
    this.noticeState.set(null);
  }

  clearError(): void {
    this.errorState.set(null);
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
      this.noticeState.set(successMessage);
      await this.load();
      return true;
    } catch (error) {
      this.errorState.set(mapCoordinationsError(error));
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
