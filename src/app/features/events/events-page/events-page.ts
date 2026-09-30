import { A11yModule } from '@angular/cdk/a11y';
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthFacade } from '../../../core/auth/auth.facade';
import type { EventSummary, RequestedEventEquipment } from '../../../shared/models/system-event';
import { EventsFacade } from '../state/events.facade';

type DialogMode = 'form' | 'detail' | null;

@Component({
  selector: 'app-events-page',
  imports: [A11yModule, ReactiveFormsModule, RouterLink],
  providers: [EventsFacade],
  templateUrl: './events-page.html',
  styleUrl: './events-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventsPage implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  protected readonly auth = inject(AuthFacade);
  protected readonly events = inject(EventsFacade);
  protected readonly dialogMode = signal<DialogMode>(null);
  protected readonly selectedEvent = signal<EventSummary | null>(null);
  protected readonly selectedCampusId = signal('');
  protected readonly selectedCoordinationIds = signal<readonly string[]>([]);
  protected readonly requestedEquipment = signal<readonly RequestedEventEquipment[]>([]);
  protected readonly selectedFile = signal<File | null>(null);
  protected readonly formError = signal<string | null>(null);
  protected readonly equipmentToAdd = signal('');
  protected readonly minimumDate = this.dateAfterDays(5);
  protected readonly searchForm = this.formBuilder.nonNullable.group({ term: '' });
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

  ngOnInit(): void {
    void this.events.load();
  }

  protected openCreate(): void {
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
    this.formError.set(null);
    this.events.invalidateAvailability();
    this.dialogMode.set('form');
  }

  protected openDetail(event: EventSummary): void {
    this.selectedEvent.set(event);
    this.dialogMode.set('detail');
  }

  protected closeDialog(): void {
    if (this.events.mutating()) return;
    if (this.availabilityTimer) clearTimeout(this.availabilityTimer);
    this.dialogMode.set(null);
    this.selectedEvent.set(null);
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
    if (this.eventForm.invalid || !file) {
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
    void this.events
      .create(
        {
          nombreEvento: value.nombreEvento.trim().replace(/\s+/gu, ' '),
          campusId: value.campusId,
          fechaInicio: value.fechaInicio,
          horaInicio: value.horaInicio,
          fechaFin: value.fechaFin,
          horaFin: value.horaFin,
          observaciones: value.observaciones.trim(),
          coordinacionIds: this.selectedCoordinationIds(),
          equiposSolicitados: this.requestedEquipment(),
        },
        file,
      )
      .then((saved) => saved && this.closeDialog());
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
    if (this.dialogMode()) this.closeDialog();
  }

  private scheduleAvailability(): void {
    this.events.invalidateAvailability();
    if (this.availabilityTimer) clearTimeout(this.availabilityTimer);
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
      return;
    }
    this.availabilityTimer = setTimeout(() => {
      void this.events.checkAvailability({
        campusId: value.campusId,
        fechaInicio: value.fechaInicio,
        horaInicio: value.horaInicio,
        fechaFin: value.fechaFin,
        horaFin: value.horaFin,
        equiposSolicitados: equipment,
      });
    }, 350);
  }

  private dateAfterDays(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
}
