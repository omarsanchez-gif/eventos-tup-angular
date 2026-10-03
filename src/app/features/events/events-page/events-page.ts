import { A11yModule } from '@angular/cdk/a11y';
import { DOCUMENT, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { AuthFacade } from '../../../core/auth/auth.facade';
import type {
  EventAvailabilityInput,
  EventAvailabilityResult,
  EventDetail,
  EventSummary,
  RequestedEventEquipment,
} from '../../../shared/models/system-event';
import { EventsFacade } from '../state/events.facade';

type DialogMode = 'form' | 'detail' | null;

@Component({
  selector: 'app-events-page',
  imports: [A11yModule, DatePipe, ReactiveFormsModule, RouterLink],
  providers: [EventsFacade],
  templateUrl: './events-page.html',
  styleUrl: './events-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventsPage implements OnInit, OnDestroy {
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly document = inject(DOCUMENT);
  protected readonly auth = inject(AuthFacade);
  protected readonly events = inject(EventsFacade);
  protected readonly dialogMode = signal<DialogMode>(null);
  protected readonly selectedEvent = signal<EventSummary | null>(null);
  protected readonly editingEventId = signal<string | null>(null);
  protected readonly listEditingEventId = signal<string | null>(null);
  protected readonly listCancellationTarget = signal<EventSummary | null>(null);
  protected readonly confirmingCancellation = signal(false);
  protected readonly logisticsConfirmation = signal<{
    readonly action: 'coverage' | 'reception' | 'delay';
    readonly equipmentId: string;
  } | null>(null);
  protected readonly delayRelease = signal('');
  protected readonly isAdmin = computed(() => this.auth.user()?.rol === 'admin');
  protected readonly selectedCampusId = signal('');
  protected readonly selectedCoordinationIds = signal<readonly string[]>([]);
  protected readonly requestedEquipment = signal<readonly RequestedEventEquipment[]>([]);
  protected readonly selectedFile = signal<File | null>(null);
  protected readonly formError = signal<string | null>(null);
  protected readonly availabilityChangeNotice = signal<string | null>(null);
  protected readonly equipmentToAdd = signal('');
  protected readonly minimumDate = this.dateAfterDays(5);
  protected readonly searchForm = this.formBuilder.nonNullable.group({
    term: '',
  });
  protected readonly eventForm = this.formBuilder.nonNullable.group({
    nombreEvento: ['', [Validators.required, Validators.maxLength(160)]],
    campusId: ['', Validators.required],
    fechaInicio: ['', Validators.required],
    horaInicio: ['', Validators.required],
    fechaFin: ['', Validators.required],
    horaFin: ['', Validators.required],
    observaciones: ['', Validators.maxLength(2000)],
  });
  protected readonly eligibleEquipment = computed(() => {
    const campusId = this.selectedCampusId();
    return campusId
      ? this.events
          .equipment()
          .filter(
            (item) =>
              item.campusBaseId === campusId ||
              (item.clasificacion === 'transferible' &&
                item.campusDestinoIdsPermitidos.includes(campusId)),
          )
      : [];
  });
  protected readonly equipmentChoices = computed(() => {
    const selected = new Set(this.requestedEquipment().map((item) => item.equipoId));
    return this.eligibleEquipment().filter((item) => !selected.has(item.equipoId));
  });
  private availabilityTimer: ReturnType<typeof setTimeout> | null = null;
  private availabilityMonitor: ReturnType<typeof setInterval> | null = null;
  private readonly availabilityRefreshMilliseconds = 30_000;

  ngOnInit(): void {
    void this.loadInitialState();
  }

  private async loadInitialState(): Promise<void> {
    await this.events.load();
    const eventId = this.route.snapshot.queryParamMap.get('eventId');
    if (!eventId) return;
    const detail = await this.events.loadDetail(eventId);
    if (!detail) return;
    this.selectedEvent.set(detail);
    this.dialogMode.set('detail');
  }

  protected openCreate(): void {
    this.listCancellationTarget.set(null);
    this.eventForm.reset({
      nombreEvento: '',
      campusId: '',
      fechaInicio: '',
      horaInicio: '',
      fechaFin: '',
      horaFin: '',
      observaciones: '',
    });
    this.selectedCampusId.set('');
    this.selectedCoordinationIds.set([]);
    this.requestedEquipment.set([]);
    this.selectedFile.set(null);
    this.editingEventId.set(null);
    this.formError.set(null);
    this.availabilityChangeNotice.set(null);
    this.events.invalidateAvailability();
    this.dialogMode.set('form');
    this.startAvailabilityMonitoring();
  }

  protected openDetail(event: EventSummary): void {
    this.listCancellationTarget.set(null);
    this.selectedEvent.set(event);
    this.events.clearDetail();
    this.dialogMode.set('detail');
    void this.events.loadDetail(event.eventId);
  }

  protected canManageFromList(event: EventSummary): boolean {
    return event.ownedByRequester && event.status !== 'cancelado';
  }

  protected async openEditFromList(event: EventSummary): Promise<void> {
    if (!this.canManageFromList(event) || this.listEditingEventId()) return;
    this.listEditingEventId.set(event.eventId);
    this.events.clearDetail();
    try {
      const detail = await this.events.loadDetail(event.eventId);
      if (detail?.canEdit) {
        this.selectedEvent.set(detail);
        this.openEdit(detail);
      }
    } finally {
      this.listEditingEventId.set(null);
    }
  }

  protected requestListCancellation(event: EventSummary): void {
    if (!this.canManageFromList(event)) return;
    this.listCancellationTarget.set(event);
  }

  protected closeListCancellation(): void {
    if (this.events.mutating()) return;
    this.listCancellationTarget.set(null);
  }

  protected confirmListCancellation(eventId: string): void {
    void this.events.cancel(eventId).then((cancelled) => {
      if (cancelled) this.listCancellationTarget.set(null);
    });
  }

  protected openEdit(detail: EventDetail): void {
    if (!detail.canEdit) return;
    this.eventForm.reset({
      nombreEvento: detail.name,
      campusId: detail.campusId ?? '',
      fechaInicio: detail.dateStart,
      horaInicio: detail.timeStart,
      fechaFin: detail.dateEnd,
      horaFin: detail.timeEnd,
      observaciones: detail.observations,
    });
    this.selectedCampusId.set(detail.campusId ?? '');
    this.selectedCoordinationIds.set(detail.coordinationIds);
    this.requestedEquipment.set(
      detail.requestedEquipment.map((item) => ({
        equipoId: item.equipmentId,
        cantidad: item.quantity,
      })),
    );
    this.selectedFile.set(null);
    this.editingEventId.set(detail.eventId);
    this.formError.set(null);
    this.availabilityChangeNotice.set(null);
    this.events.invalidateAvailability();
    this.dialogMode.set('form');
    this.startAvailabilityMonitoring();
    this.scheduleAvailability();
  }

  protected closeDialog(): void {
    if (this.events.mutating()) return;
    if (this.availabilityTimer) clearTimeout(this.availabilityTimer);
    this.availabilityTimer = null;
    this.stopAvailabilityMonitoring();
    this.dialogMode.set(null);
    this.selectedEvent.set(null);
    this.events.clearDetail();
    this.confirmingCancellation.set(false);
    this.logisticsConfirmation.set(null);
    this.availabilityChangeNotice.set(null);
  }

  ngOnDestroy(): void {
    if (this.availabilityTimer) clearTimeout(this.availabilityTimer);
    this.stopAvailabilityMonitoring();
  }

  protected applySearch(event: Event): void {
    this.events.search((event.target as HTMLInputElement).value);
  }

  protected clearSearch(): void {
    this.searchForm.controls.term.setValue('');
    this.events.search('');
  }

  protected campusChanged(event: Event): void {
    const campusId = (event.target as HTMLSelectElement).value;
    this.selectedCampusId.set(campusId);
    const eligible = new Set(
      this.events
        .equipment()
        .filter(
          (item) =>
            item.campusBaseId === campusId ||
            (item.clasificacion === 'transferible' &&
              item.campusDestinoIdsPermitidos.includes(campusId)),
        )
        .map((item) => item.equipoId),
    );
    this.requestedEquipment.update((items) => items.filter((item) => eligible.has(item.equipoId)));
    this.scheduleAvailability();
  }

  protected formContextChanged(): void {
    this.scheduleAvailability();
  }

  protected toggleCoordination(id: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectedCoordinationIds.update((ids) =>
      checked ? [...ids, id] : ids.filter((current) => current !== id),
    );
  }

  protected coordinationSelected(id: string): boolean {
    return this.selectedCoordinationIds().includes(id);
  }

  protected selectEquipment(event: Event): void {
    this.equipmentToAdd.set((event.target as HTMLSelectElement).value);
  }

  protected addEquipment(): void {
    const id = this.equipmentToAdd();
    if (!id || this.requestedEquipment().length >= 20) return;
    if (this.requestedEquipment().some((item) => item.equipoId === id)) return;
    this.requestedEquipment.update((items) => [...items, { equipoId: id, cantidad: 1 }]);
    this.equipmentToAdd.set('');
    this.scheduleAvailability();
  }

  protected updateQuantity(id: string, event: Event): void {
    const quantity = Number((event.target as HTMLInputElement).value);
    this.requestedEquipment.update((items) =>
      items.map((item) =>
        item.equipoId === id
          ? { ...item, cantidad: Number.isInteger(quantity) ? quantity : 0 }
          : item,
      ),
    );
    this.scheduleAvailability();
  }

  protected removeEquipment(id: string): void {
    this.requestedEquipment.update((items) => items.filter((item) => item.equipoId !== id));
    this.scheduleAvailability();
  }

  protected equipmentName(id: string): string {
    return this.events.equipment().find((item) => item.equipoId === id)?.nombre ?? 'Equipo';
  }

  protected equipmentCampus(id: string): string {
    const equipment = this.events.equipment().find((item) => item.equipoId === id);
    const campus = this.events.campuses().find((item) => item.campusId === equipment?.campusBaseId);
    return campus ? `${campus.clave} · ${campus.nombre}` : 'Campus no disponible';
  }

  protected availabilityFor(id: string) {
    return this.events.availability()?.items.find((item) => item.equipmentId === id) ?? null;
  }

  protected fileChanged(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.formError.set(null);
    if (!file) {
      this.selectedFile.set(null);
      return;
    }
    if (file.type !== 'application/pdf' || file.size <= 0 || file.size >= 10 * 1024 * 1024) {
      this.selectedFile.set(null);
      this.formError.set('El protocolo debe ser un PDF menor a 10 MiB.');
      (event.target as HTMLInputElement).value = '';
      return;
    }
    this.selectedFile.set(file);
  }

  protected submit(): void {
    this.formError.set(null);
    const file = this.selectedFile();
    const availability = this.events.availability();
    if (this.eventForm.invalid || (!file && !this.editingEventId())) {
      this.eventForm.markAllAsTouched();
      this.formError.set('Complete los campos obligatorios y seleccione el protocolo PDF.');
      return;
    }
    if (
      this.requestedEquipment().some(
        (item) => !Number.isInteger(item.cantidad) || item.cantidad < 1,
      )
    ) {
      this.formError.set('Cada cantidad de equipo debe ser un entero positivo.');
      return;
    }
    if (!availability || !availability.confirmable) {
      this.formError.set('Espere la verificación de disponibilidad antes de guardar.');
      this.scheduleAvailability();
      return;
    }
    const value = this.eventForm.getRawValue();
    const input = {
      nombreEvento: value.nombreEvento.trim().replace(/\s+/gu, ' '),
      campusId: value.campusId,
      fechaInicio: value.fechaInicio,
      horaInicio: value.horaInicio,
      fechaFin: value.fechaFin,
      horaFin: value.horaFin,
      observaciones: value.observaciones.trim(),
      coordinacionIds: this.selectedCoordinationIds(),
      equiposSolicitados: this.requestedEquipment(),
    };
    const editingId = this.editingEventId();
    if (editingId) {
      const detail = this.events.detail();
      if (!detail?.protocolUrl || !detail.protocolName) {
        this.formError.set('No fue posible recuperar el protocolo vigente.');
        return;
      }
      void this.events
        .update(editingId, input, { url: detail.protocolUrl, name: detail.protocolName }, file)
        .then((saved) => saved && this.closeDialog());
      return;
    }
    if (file) void this.events.create(input, file).then((saved) => saved && this.closeDialog());
  }

  protected requestCancellation(): void {
    this.confirmingCancellation.set(true);
  }

  protected cancelCancellation(): void {
    this.confirmingCancellation.set(false);
  }

  protected confirmCancellation(eventId: string): void {
    void this.events.cancel(eventId).then((cancelled) => {
      if (cancelled) this.confirmingCancellation.set(false);
    });
  }

  protected requestLogisticsAction(
    action: 'coverage' | 'reception' | 'delay',
    equipmentId: string,
  ): void {
    this.logisticsConfirmation.set({ action, equipmentId });
    this.delayRelease.set('');
  }

  protected cancelLogisticsAction(): void {
    this.logisticsConfirmation.set(null);
  }

  protected delayChanged(event: Event): void {
    this.delayRelease.set((event.target as HTMLInputElement).value);
  }

  protected confirmLogisticsAction(eventId: string): void {
    const confirmation = this.logisticsConfirmation();
    if (!confirmation) return;
    const finish = () => this.logisticsConfirmation.set(null);
    if (confirmation.action === 'coverage') {
      void this.events.confirmCoverage(eventId, confirmation.equipmentId).then(finish);
    } else if (confirmation.action === 'reception') {
      void this.events.confirmReception(eventId, confirmation.equipmentId).then(finish);
    } else {
      const release = this.delayRelease();
      if (!release) return;
      void this.events
        .reportDelay(eventId, confirmation.equipmentId, new Date(release).toISOString())
        .then(finish);
    }
  }

  protected integrationLabel(
    value: EventSummary['calendarStatus'] | EventSummary['notificationStatus'],
  ): string {
    return {
      pendiente: 'Pendiente',
      sincronizado: 'Sincronizado',
      error: 'Requiere revisión',
      retirado: 'Retirado',
      completas: 'Completas',
      parciales: 'Parciales',
      no_aplica: 'No aplica',
    }[value];
  }

  protected reservationStateLabel(state: EventDetail['reservations'][number]['state']): string {
    return {
      confirmada: 'Confirmada',
      requiere_revision: 'Requiere revisión',
      finalizada: 'Finalizada',
      cancelada: 'Cancelada',
    }[state];
  }

  protected statusLabel(status: EventSummary['status']): string {
    return {
      programado: 'Programado',
      en_ejecucion: 'En ejecución',
      finalizado: 'Finalizado',
      cancelado: 'Cancelado',
    }[status];
  }

  protected formatInterval(event: EventSummary): string {
    if (event.dateStart === event.dateEnd) {
      return `${event.dateStart} · ${event.timeStart}–${event.timeEnd}`;
    }
    return `${event.dateStart} ${event.timeStart} – ${event.dateEnd} ${event.timeEnd}`;
  }

  @HostListener('document:keydown.escape')
  protected escape(): void {
    if (this.listCancellationTarget()) {
      this.closeListCancellation();
    } else if (this.dialogMode()) {
      this.closeDialog();
    }
  }

  @HostListener('window:focus')
  protected windowFocused(): void {
    void this.refreshAvailability();
  }

  @HostListener('document:visibilitychange')
  protected visibilityChanged(): void {
    if (this.document.visibilityState === 'visible') void this.refreshAvailability();
  }

  private scheduleAvailability(): void {
    this.availabilityChangeNotice.set(null);
    this.events.invalidateAvailability();
    if (this.availabilityTimer) clearTimeout(this.availabilityTimer);
    const input = this.availabilityInput();
    if (!input) return;
    this.availabilityTimer = setTimeout(() => {
      this.availabilityTimer = null;
      if (!this.events.availabilityLoading()) void this.events.checkAvailability(input);
    }, 350);
  }

  private availabilityInput(): EventAvailabilityInput | null {
    if (this.dialogMode() !== 'form') return null;
    const value = this.eventForm.getRawValue();
    const equipment = this.requestedEquipment();
    if (
      !value.campusId ||
      !value.fechaInicio ||
      !value.horaInicio ||
      !value.fechaFin ||
      !value.horaFin ||
      equipment.some((item) => !Number.isInteger(item.cantidad) || item.cantidad < 1)
    ) {
      return null;
    }
    const eventId = this.editingEventId();
    return {
      ...(eventId ? { eventId } : {}),
      campusId: value.campusId,
      fechaInicio: value.fechaInicio,
      horaInicio: value.horaInicio,
      fechaFin: value.fechaFin,
      horaFin: value.horaFin,
      equiposSolicitados: equipment,
    };
  }

  private startAvailabilityMonitoring(): void {
    this.stopAvailabilityMonitoring();
    this.availabilityMonitor = setInterval(() => {
      if (this.document.visibilityState === 'visible') void this.refreshAvailability();
    }, this.availabilityRefreshMilliseconds);
  }

  private stopAvailabilityMonitoring(): void {
    if (this.availabilityMonitor) clearInterval(this.availabilityMonitor);
    this.availabilityMonitor = null;
  }

  private async refreshAvailability(): Promise<void> {
    if (
      this.dialogMode() !== 'form' ||
      this.document.visibilityState !== 'visible' ||
      this.events.availabilityLoading() ||
      this.events.mutating()
    ) {
      return;
    }
    const input = this.availabilityInput();
    if (!input) return;
    const previous = this.events.availability();
    await this.events.checkAvailability(input, true);
    const current = this.events.availability();
    if (
      previous &&
      current &&
      this.availabilitySignature(previous) !== this.availabilitySignature(current)
    ) {
      this.availabilityChangeNotice.set(
        'La disponibilidad cambió por otra reservación. Revise las cantidades antes de guardar.',
      );
    }
  }

  private availabilitySignature(result: EventAvailabilityResult): string {
    return JSON.stringify({
      confirmable: result.confirmable,
      items: [...result.items]
        .sort((left, right) => left.equipmentId.localeCompare(right.equipmentId))
        .map((item) => ({
          equipmentId: item.equipmentId,
          requested: item.requested,
          available: item.available,
          confirmable: item.confirmable,
          blockStart: item.blockStart,
          blockEnd: item.blockEnd,
          requiresTransfer: item.requiresTransfer,
        })),
    });
  }

  private dateAfterDays(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
}
