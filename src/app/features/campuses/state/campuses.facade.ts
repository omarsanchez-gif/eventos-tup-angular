import { computed, inject, Injectable, signal } from '@angular/core';

import type {
  CreateSystemCampusInput,
  SystemCampus,
  UpdateSystemCampusInput,
} from '../../../shared/models/system-campus';
import { mapCampusesError } from '../data/campuses-error.mapper';
import { CAMPUSES_GATEWAY } from '../data/campuses.gateway';

@Injectable()
export class CampusesFacade {
  private readonly gateway = inject(CAMPUSES_GATEWAY);
  private readonly recordsState = signal<readonly SystemCampus[]>([]);
  private readonly searchState = signal('');
  private readonly pageState = signal(1);
  private readonly pageSizeState = signal(10);
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
    return term
      ? this.recordsState().filter((record) =>
          `${record.nombre} ${record.clave} ${record.direccion ?? ''} ${record.referencia ?? ''}`
            .toLocaleLowerCase('es-MX')
            .includes(term),
        )
      : this.recordsState();
  });
  readonly resultCount = computed(() => this.filteredRecords().length);
  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.resultCount() / this.pageSizeState())),
  );
  readonly visibleRecords = computed(() => {
    const start = (this.pageState() - 1) * this.pageSizeState();
    return this.filteredRecords().slice(start, start + this.pageSizeState());
  });

  load(): Promise<void> {
    if (this.loadPromise) return this.loadPromise;
    this.loadingState.set(true);
    this.errorState.set(null);
    this.loadPromise = this.gateway
      .list()
      .then((result) => {
        this.recordsState.set(result.items);
        this.ensureValidPage();
      })
      .catch((error: unknown) => this.errorState.set(mapCampusesError(error)))
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
    this.search('');
  }
  setPage(page: number): void {
    this.pageState.set(Math.min(Math.max(1, page), this.totalPages()));
  }
  setPageSize(size: number): void {
    if (![5, 10, 15, 20].includes(size)) return;
    this.pageSizeState.set(size);
    this.pageState.set(1);
  }
  create(input: CreateSystemCampusInput): Promise<boolean> {
    return this.mutate(() => this.gateway.create(input), 'Campus creado correctamente.');
  }
  update(input: UpdateSystemCampusInput): Promise<boolean> {
    return this.mutate(() => this.gateway.update(input), 'Campus actualizado correctamente.');
  }
  setStatus(record: SystemCampus, activo: boolean): Promise<boolean> {
    return this.mutate(
      () => this.gateway.setStatus({ documentId: record.documentId, activo }),
      activo ? 'Campus activado correctamente.' : 'Campus suspendido correctamente.',
    );
  }
  delete(record: SystemCampus): Promise<boolean> {
    return this.mutate(
      () => this.gateway.delete(record.documentId),
      'Campus eliminado correctamente.',
    );
  }
  clearError(): void {
    this.errorState.set(null);
  }
  clearNotice(): void {
    this.noticeState.set(null);
  }

  private async mutate(operation: () => Promise<unknown>, notice: string): Promise<boolean> {
    if (this.mutatingState()) return false;
    this.mutatingState.set(true);
    this.errorState.set(null);
    this.noticeState.set(null);
    try {
      await operation();
      this.noticeState.set(notice);
      await this.load();
      return true;
    } catch (error) {
      this.errorState.set(mapCampusesError(error));
      return false;
    } finally {
      this.mutatingState.set(false);
    }
  }
  private ensureValidPage(): void {
    if (this.pageState() > this.totalPages()) this.pageState.set(this.totalPages());
  }
}
