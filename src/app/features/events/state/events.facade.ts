import { computed, inject, Injectable, type OnDestroy, signal } from '@angular/core';

import type { SelectableCampus } from '../../../shared/models/system-campus';
import type { SelectableCoordination } from '../../../shared/models/system-coordination';
import type { SelectableEquipment } from '../../../shared/models/system-equipment';
import type {
  CreateSystemEventInput,
  EventAvailabilityInput,
  EventAvailabilityResult,
  EventDetail,
  EventSummary,
} from '../../../shared/models/system-event';
import { CAMPUSES_GATEWAY } from '../../campuses/data/campuses.gateway';
import { COORDINATIONS_GATEWAY } from '../../coordinations/data/coordinations.gateway';
import { EQUIPMENT_GATEWAY } from '../../equipment/data/equipment.gateway';
import { mapEventsError } from '../data/events-error.mapper';
import { EVENTS_GATEWAY } from '../data/events.gateway';

@Injectable()
export class EventsFacade implements OnDestroy {
  private readonly gateway = inject(EVENTS_GATEWAY);
  private readonly campusesGateway = inject(CAMPUSES_GATEWAY);
  private readonly coordinationsGateway = inject(COORDINATIONS_GATEWAY);
  private readonly equipmentGateway = inject(EQUIPMENT_GATEWAY);
  private readonly recordsState = signal<readonly EventSummary[]>([]);
  private readonly campusesState = signal<readonly SelectableCampus[]>([]);
  private readonly coordinationsState = signal<readonly SelectableCoordination[]>([]);
  private readonly equipmentState = signal<readonly SelectableEquipment[]>([]);
  private readonly searchState = signal('');
  private readonly cursorStackState = signal<readonly (string | null)[]>([null]);
  private readonly pageState = signal(1);
  private readonly nextCursorState = signal<string | null>(null);
  private readonly loadingState = signal(false);
  private readonly mutatingState = signal(false);
  private readonly availabilityLoadingState = signal(false);
  private readonly availabilityState = signal<EventAvailabilityResult | null>(null);
  private readonly errorState = signal<string | null>(null);
  private readonly noticeState = signal<string | null>(null);
  private readonly calendarItemsState = signal<readonly EventSummary[]>([]);
  private readonly calendarLoadingState = signal(false);
  private readonly detailState = signal<EventDetail | null>(null);
  private readonly detailLoadingState = signal(false);
  private readonly actionLoadingState = signal<string | null>(null);
  private requestVersion = 0;
  private serverClockOffsetMs: number | null = null;
  private temporalTimer: ReturnType<typeof setTimeout> | null = null;
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  readonly records = this.recordsState.asReadonly();
  readonly campuses = this.campusesState.asReadonly();
  readonly coordinations = this.coordinationsState.asReadonly();
  readonly equipment = this.equipmentState.asReadonly();
  readonly searchTerm = this.searchState.asReadonly();
  readonly page = this.pageState.asReadonly();
  readonly hasNextPage = computed(() => this.nextCursorState() !== null);
  readonly hasPreviousPage = computed(() => this.pageState() > 1);
  readonly loading = this.loadingState.asReadonly();
  readonly mutating = this.mutatingState.asReadonly();
  readonly availabilityLoading = this.availabilityLoadingState.asReadonly();
  readonly availability = this.availabilityState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly notice = this.noticeState.asReadonly();
  readonly calendarItems = this.calendarItemsState.asReadonly();
  readonly calendarLoading = this.calendarLoadingState.asReadonly();
  readonly detail = this.detailState.asReadonly();
  readonly detailLoading = this.detailLoadingState.asReadonly();
  readonly actionLoading = this.actionLoadingState.asReadonly();
  readonly filteredRecords = computed(() => this.recordsState());
  readonly searchHint = computed(() =>
    this.searchState().length === 1 ? 'Escriba al menos dos caracteres para buscar.' : null,
  );

  async load(): Promise<void> {
    this.loadingState.set(true);
    this.errorState.set(null);
    try {
      const cursor = this.cursorStackState()[this.pageState() - 1] ?? null;
      const [events, campuses, coordinations, equipment] = await Promise.all([
        this.gateway.list(cursor, this.backendSearch()),
        this.campusesGateway.listSelectable(),
        this.coordinationsGateway.listSelectable(),
        this.equipmentGateway.listSelectable(),
      ]);
      this.synchronizeServerClock(events.serverNow);
      this.recordsState.set(this.withTemporalStatuses(events.items));
      this.scheduleTemporalRefresh();
      this.nextCursorState.set(events.nextCursor);
      this.campusesState.set(campuses.items);
      this.coordinationsState.set(coordinations.items);
      this.equipmentState.set(equipment.items);
    } catch (error) {
      this.errorState.set(mapEventsError(error));
    } finally {
      this.loadingState.set(false);
    }
  }

  search(term: string): void {
    const normalized = term.trim().replace(/\s+/gu, ' ');
    this.searchState.set(normalized);
    this.pageState.set(1);
    this.cursorStackState.set([null]);
    this.nextCursorState.set(null);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    if (normalized.length === 1) return;
    this.searchTimer = setTimeout(() => void this.load(), 300);
  }

  async nextPage(): Promise<void> {
    const cursor = this.nextCursorState();
    if (!cursor || this.loadingState()) return;
    const stack = [...this.cursorStackState()];
    stack[this.pageState()] = cursor;
    this.cursorStackState.set(stack);
    this.pageState.update((page) => page + 1);
    await this.load();
  }

  async previousPage(): Promise<void> {
    if (this.pageState() <= 1 || this.loadingState()) return;
    this.pageState.update((page) => page - 1);
    await this.load();
  }

  async checkAvailability(
    input: EventAvailabilityInput,
    preserveCurrent = false,
  ): Promise<boolean> {
    const version = ++this.requestVersion;
    this.availabilityLoadingState.set(true);
    if (!preserveCurrent) this.availabilityState.set(null);
    try {
      const result = await this.gateway.checkAvailability(input);
      if (version === this.requestVersion) this.availabilityState.set(result);
      return result.confirmable;
    } catch (error) {
      if (version === this.requestVersion) this.errorState.set(mapEventsError(error));
      return false;
    } finally {
      if (version === this.requestVersion) this.availabilityLoadingState.set(false);
    }
  }

  invalidateAvailability(): void {
    this.requestVersion += 1;
    this.availabilityState.set(null);
    this.availabilityLoadingState.set(false);
  }

  async create(
    input: Omit<CreateSystemEventInput, 'protocoloUrl' | 'protocoloNombre'>,
    file: File,
  ) {
    if (this.mutatingState()) return false;
    this.mutatingState.set(true);
    this.errorState.set(null);
    this.noticeState.set(null);
    try {
      const protocolUrl = await this.gateway.uploadProtocol(file, input.fechaInicio.slice(0, 4));
      const result = await this.gateway.create({
        ...input,
        protocoloUrl: protocolUrl,
        protocoloNombre: file.name,
      });
      this.noticeState.set(this.integrationNotice('Evento guardado.', result));
      this.pageState.set(1);
      this.cursorStackState.set([null]);
      await this.load();
      return true;
    } catch (error) {
      this.errorState.set(mapEventsError(error));
      return false;
    } finally {
      this.mutatingState.set(false);
    }
  }

  async loadDetail(eventId: string): Promise<EventDetail | null> {
    this.detailLoadingState.set(true);
    this.errorState.set(null);
    try {
      const detail = await this.gateway.detail(eventId);
      this.detailState.set(detail);
      return detail;
    } catch (error) {
      this.errorState.set(mapEventsError(error));
      this.detailState.set(null);
      return null;
    } finally {
      this.detailLoadingState.set(false);
    }
  }

  clearDetail(): void {
    this.detailState.set(null);
  }

  async update(
    eventId: string,
    input: Omit<CreateSystemEventInput, 'protocoloUrl' | 'protocoloNombre'>,
    currentProtocol: { readonly url: string; readonly name: string },
    replacement: File | null,
  ): Promise<boolean> {
    if (this.mutatingState()) return false;
    this.mutatingState.set(true);
    this.errorState.set(null);
    try {
      const protocolUrl = replacement
        ? await this.gateway.uploadProtocol(replacement, input.fechaInicio.slice(0, 4))
        : currentProtocol.url;
      const result = await this.gateway.update(eventId, {
        ...input,
        protocoloUrl: protocolUrl,
        protocoloNombre: replacement?.name ?? currentProtocol.name,
      });
      this.noticeState.set(this.integrationNotice('Evento actualizado.', result));
      await Promise.all([this.load(), this.loadDetail(eventId)]);
      return true;
    } catch (error) {
      this.errorState.set(mapEventsError(error));
      return false;
    } finally {
      this.mutatingState.set(false);
    }
  }

  async cancel(eventId: string): Promise<boolean> {
    if (this.mutatingState()) return false;
    this.mutatingState.set(true);
    this.errorState.set(null);
    try {
      const result = await this.gateway.cancel(eventId);
      this.noticeState.set(this.integrationNotice('Evento cancelado.', result));
      await this.load();
      this.detailState.set(await this.gateway.detail(eventId));
      return true;
    } catch (error) {
      this.errorState.set(mapEventsError(error));
      return false;
    } finally {
      this.mutatingState.set(false);
    }
  }

  async reconcile(eventId: string): Promise<void> {
    await this.runAction(`reconcile:${eventId}`, async () => {
      const result = await this.gateway.reconcile(eventId);
      this.noticeState.set(this.integrationNotice('Reconciliación ejecutada.', result));
      await Promise.all([this.load(), this.loadDetail(eventId)]);
    });
  }

  async confirmCoverage(eventId: string, equipmentId: string): Promise<void> {
    await this.runAction(`coverage:${equipmentId}`, async () => {
      await this.gateway.confirmCoverage(eventId, equipmentId);
      this.noticeState.set('Cobertura de Sistemas confirmada.');
      await this.loadDetail(eventId);
    });
  }

  async confirmReception(eventId: string, equipmentId: string): Promise<void> {
    await this.runAction(`reception:${equipmentId}`, async () => {
      await this.gateway.confirmReception(eventId, equipmentId);
      this.noticeState.set('Recepción confirmada y equipo liberado.');
      await this.loadDetail(eventId);
    });
  }

  async reportDelay(eventId: string, equipmentId: string, release: string): Promise<void> {
    await this.runAction(`delay:${equipmentId}`, async () => {
      await this.gateway.reportDelay(eventId, equipmentId, release);
      this.noticeState.set('Demora registrada; la disponibilidad fue extendida.');
      await this.loadDetail(eventId);
    });
  }

  async loadCalendar(start: string, end: string, campusId: string | null): Promise<void> {
    this.calendarLoadingState.set(true);
    this.errorState.set(null);
    try {
      const result = await this.gateway.listCalendar({ inicio: start, fin: end, campusId });
      this.synchronizeServerClock(result.serverNow);
      this.calendarItemsState.set(this.withTemporalStatuses(result.items));
      this.scheduleTemporalRefresh();
    } catch (error) {
      this.errorState.set(mapEventsError(error));
      this.calendarItemsState.set([]);
    } finally {
      this.calendarLoadingState.set(false);
    }
  }

  clearError(): void {
    this.errorState.set(null);
  }

  clearNotice(): void {
    this.noticeState.set(null);
  }

  ngOnDestroy(): void {
    if (this.temporalTimer) clearTimeout(this.temporalTimer);
    if (this.searchTimer) clearTimeout(this.searchTimer);
  }

  private synchronizeServerClock(serverNow: string): void {
    const serverTime = Date.parse(serverNow);
    if (Number.isNaN(serverTime)) return;
    this.serverClockOffsetMs = serverTime - Date.now();
    this.scheduleTemporalRefresh();
  }

  private backendSearch(): string | null {
    const term = this.searchState();
    return term.length >= 2 ? term : null;
  }

  private integrationNotice(
    prefix: string,
    result: {
      readonly calendarStatus: EventSummary['calendarStatus'];
      readonly notificationStatus: EventSummary['notificationStatus'];
    },
  ): string {
    if (
      (result.calendarStatus === 'sincronizado' || result.calendarStatus === 'retirado') &&
      (result.notificationStatus === 'completas' || result.notificationStatus === 'no_aplica')
    ) {
      return `${prefix} Integraciones completas.`;
    }
    return `${prefix} Una o más integraciones permanecen pendientes o requieren revisión.`;
  }

  private async runAction(key: string, action: () => Promise<void>): Promise<void> {
    if (this.actionLoadingState()) return;
    this.actionLoadingState.set(key);
    this.errorState.set(null);
    try {
      await action();
    } catch (error) {
      this.errorState.set(mapEventsError(error));
    } finally {
      this.actionLoadingState.set(null);
    }
  }

  private currentServerTime(): number | null {
    return this.serverClockOffsetMs === null ? null : Date.now() + this.serverClockOffsetMs;
  }

  private withTemporalStatuses(items: readonly EventSummary[]): readonly EventSummary[] {
    const now = this.currentServerTime();
    if (now === null) return items;
    return items.map((item) => {
      if (item.status === 'cancelado') return item;
      const start = item.start ? Date.parse(item.start) : Number.NaN;
      const end = item.end ? Date.parse(item.end) : Number.NaN;
      if (Number.isNaN(start) || Number.isNaN(end)) return item;
      const status = now < start ? 'programado' : now < end ? 'en_ejecucion' : 'finalizado';
      return status === item.status ? item : { ...item, status };
    });
  }

  private scheduleTemporalRefresh(): void {
    if (this.temporalTimer) clearTimeout(this.temporalTimer);
    this.temporalTimer = null;
    const now = this.currentServerTime();
    if (now === null) return;
    const boundaries = [...this.recordsState(), ...this.calendarItemsState()]
      .filter((item) => item.status !== 'cancelado')
      .flatMap((item) => [item.start, item.end])
      .map((value) => (value ? Date.parse(value) : Number.NaN))
      .filter((value) => !Number.isNaN(value) && value > now);
    const nextBoundary = boundaries.length ? Math.min(...boundaries) : null;
    if (nextBoundary === null) return;
    const maximumDelay = 2_147_483_647;
    this.temporalTimer = setTimeout(
      () => this.refreshTemporalStatuses(),
      Math.min(maximumDelay, Math.max(1, nextBoundary - now + 1)),
    );
  }

  private refreshTemporalStatuses(): void {
    this.recordsState.update((items) => this.withTemporalStatuses(items));
    this.calendarItemsState.update((items) => this.withTemporalStatuses(items));
    this.scheduleTemporalRefresh();
  }
}
