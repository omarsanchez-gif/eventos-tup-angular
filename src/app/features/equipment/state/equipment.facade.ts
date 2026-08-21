import { computed, inject, Injectable, signal } from '@angular/core';

import type { SystemCampus } from '../../../shared/models/system-campus';
import type {
  CreateSystemEquipmentInput,
  SystemEquipment,
  UpdateSystemEquipmentInput,
} from '../../../shared/models/system-equipment';
import { CAMPUSES_GATEWAY } from '../../campuses/data/campuses.gateway';
import { mapEquipmentError } from '../data/equipment-error.mapper';
import { EQUIPMENT_GATEWAY } from '../data/equipment.gateway';

@Injectable()
export class EquipmentFacade {
  private readonly gateway = inject(EQUIPMENT_GATEWAY);
  private readonly campusesGateway = inject(CAMPUSES_GATEWAY);
  private readonly recordsState = signal<readonly SystemEquipment[]>([]);
  private readonly campusesState = signal<readonly SystemCampus[]>([]);
  private readonly searchState = signal('');
  private readonly pageState = signal(1);
  private readonly pageSizeState = signal(10);
  private readonly loadingState = signal(false);
  private readonly mutatingState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private readonly noticeState = signal<string | null>(null);
  private loadPromise: Promise<void> | null = null;

  readonly records = this.recordsState.asReadonly();
  readonly campuses = this.campusesState.asReadonly();
  readonly activeCampuses = computed(() => this.campusesState().filter((campus) => campus.activo));
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
          `${record.nombre} ${this.campusName(record.campusBaseId)} ${record.clasificacion}`
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
    this.loadPromise = Promise.all([this.gateway.list(), this.campusesGateway.list()])
      .then(([equipment, campuses]) => {
        this.recordsState.set(equipment.items);
        this.campusesState.set(campuses.items);
        this.ensureValidPage();
      })
      .catch((error: unknown) => this.errorState.set(mapEquipmentError(error)))
      .finally(() => {
        this.loadingState.set(false);
        this.loadPromise = null;
      });
    return this.loadPromise;
  }
  campusName(documentId: string): string {
    return (
      this.campusesState().find((campus) => campus.documentId === documentId)?.nombre ??
      'Campus no disponible'
    );
  }
  campusKey(documentId: string): string {
    return this.campusesState().find((campus) => campus.documentId === documentId)?.clave ?? '—';
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
  create(input: CreateSystemEquipmentInput): Promise<boolean> {
    return this.mutate(() => this.gateway.create(input), 'Equipo creado correctamente.');
  }
  update(input: UpdateSystemEquipmentInput): Promise<boolean> {
    return this.mutate(() => this.gateway.update(input), 'Equipo actualizado correctamente.');
  }
  setStatus(record: SystemEquipment, activo: boolean): Promise<boolean> {
    return this.mutate(
      () => this.gateway.setStatus({ documentId: record.documentId, activo }),
      activo ? 'Equipo activado correctamente.' : 'Equipo suspendido correctamente.',
    );
  }
  delete(record: SystemEquipment): Promise<boolean> {
    return this.mutate(
      () => this.gateway.delete(record.documentId),
      'Equipo eliminado correctamente.',
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
      this.errorState.set(mapEquipmentError(error));
      return false;
    } finally {
      this.mutatingState.set(false);
    }
  }
  private ensureValidPage(): void {
    if (this.pageState() > this.totalPages()) this.pageState.set(this.totalPages());
  }
}
