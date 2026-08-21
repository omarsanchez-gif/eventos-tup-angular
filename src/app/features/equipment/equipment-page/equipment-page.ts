import { A11yModule } from '@angular/cdk/a11y';
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import type { EquipmentTimestamp, SystemEquipment } from '../../../shared/models/system-equipment';
import { EquipmentFacade } from '../state/equipment.facade';

type DialogMode = 'form' | 'status' | 'delete' | null;

@Component({
  selector: 'app-equipment-page',
  imports: [A11yModule, ReactiveFormsModule],
  providers: [EquipmentFacade],
  templateUrl: './equipment-page.html',
  styleUrl: './equipment-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipmentPage implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  protected readonly equipment = inject(EquipmentFacade);
  protected readonly dialogMode = signal<DialogMode>(null);
  protected readonly selectedEquipment = signal<SystemEquipment | null>(null);
  protected readonly formError = signal<string | null>(null);
  protected readonly searchForm = this.formBuilder.nonNullable.group({ term: '' });
  protected readonly equipmentForm = this.formBuilder.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(120)]],
    campusBaseId: ['', Validators.required],
    cantidadOperativa: [1, [Validators.required, Validators.min(0), Validators.max(999)]],
    clasificacion: this.formBuilder.nonNullable.control<'fijo' | 'transferible'>('fijo'),
    campusDestinoIdsPermitidos: this.formBuilder.nonNullable.control<readonly string[]>([]),
    activo: true,
  });
  private restoreFocusElement: HTMLElement | null = null;

  ngOnInit(): void {
    void this.equipment.load();
  }
  protected applySearch(event: Event): void {
    this.equipment.search((event.target as HTMLInputElement).value);
  }
  protected clearSearch(): void {
    this.searchForm.controls.term.setValue('');
    this.equipment.clearSearch();
  }
  protected openCreate(event: Event): void {
    this.remember(event);
    this.selectedEquipment.set(null);
    this.equipmentForm.reset({
      nombre: '',
      campusBaseId: '',
      cantidadOperativa: 1,
      clasificacion: 'fijo',
      campusDestinoIdsPermitidos: [],
      activo: true,
    });
    this.equipmentForm.controls.campusBaseId.enable();
    this.formError.set(null);
    this.dialogMode.set('form');
  }
  protected openEdit(record: SystemEquipment, event: Event): void {
    this.remember(event);
    this.selectedEquipment.set(record);
    this.equipmentForm.reset({
      nombre: record.nombre,
      campusBaseId: record.campusBaseId,
      cantidadOperativa: record.cantidadOperativa,
      clasificacion: record.clasificacion,
      campusDestinoIdsPermitidos: record.campusDestinoIdsPermitidos,
      activo: record.activo,
    });
    if (record.utilizado) {
      this.equipmentForm.controls.campusBaseId.disable();
    } else {
      this.equipmentForm.controls.campusBaseId.enable();
    }
    this.formError.set(null);
    this.dialogMode.set('form');
  }
  protected openStatus(record: SystemEquipment, event: Event): void {
    this.remember(event);
    this.selectedEquipment.set(record);
    this.dialogMode.set('status');
  }
  protected openDelete(record: SystemEquipment, event: Event): void {
    if (record.utilizado) return;
    this.remember(event);
    this.selectedEquipment.set(record);
    this.dialogMode.set('delete');
  }
  protected classificationChanged(): void {
    if (this.equipmentForm.controls.clasificacion.value === 'fijo') {
      this.equipmentForm.controls.campusDestinoIdsPermitidos.setValue([]);
    }
  }
  protected baseCampusChanged(): void {
    const base = this.equipmentForm.controls.campusBaseId.value;
    this.equipmentForm.controls.campusDestinoIdsPermitidos.setValue(
      this.equipmentForm.controls.campusDestinoIdsPermitidos.value.filter((id) => id !== base),
    );
  }
  protected isDestinationSelected(documentId: string): boolean {
    return this.equipmentForm.controls.campusDestinoIdsPermitidos.value.includes(documentId);
  }
  protected toggleDestination(documentId: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const current = this.equipmentForm.controls.campusDestinoIdsPermitidos.value;
    this.equipmentForm.controls.campusDestinoIdsPermitidos.setValue(
      checked ? [...current, documentId] : current.filter((id) => id !== documentId),
    );
  }
  protected submitForm(): void {
    this.formError.set(null);
    if (this.equipmentForm.invalid || this.equipment.mutating()) {
      this.equipmentForm.markAllAsTouched();
      return;
    }
    const value = this.equipmentForm.getRawValue();
    const quantity = Number(value.cantidadOperativa);
    const active = this.selectedEquipment()?.activo ?? value.activo;
    if (!Number.isInteger(quantity)) {
      this.formError.set('La cantidad operativa debe ser un número entero.');
      return;
    }
    if (active && quantity < 1) {
      this.formError.set('Un equipo activo requiere al menos una unidad operativa.');
      return;
    }
    if (value.clasificacion === 'transferible' && !value.campusDestinoIdsPermitidos.length) {
      this.formError.set('Un equipo transferible requiere al menos un campus destino.');
      return;
    }
    void this.persist({
      nombre: value.nombre.trim().replace(/\s+/gu, ' '),
      campusBaseId: value.campusBaseId,
      cantidadOperativa: quantity,
      clasificacion: value.clasificacion,
      campusDestinoIdsPermitidos:
        value.clasificacion === 'fijo' ? [] : value.campusDestinoIdsPermitidos,
      activo: value.activo,
    });
  }
  protected confirmStatus(): void {
    const record = this.selectedEquipment();
    if (!record) return;
    void this.equipment
      .setStatus(record, !record.activo)
      .then((done) => done && this.closeDialog());
  }
  protected confirmDelete(): void {
    const record = this.selectedEquipment();
    if (!record || record.utilizado) return;
    void this.equipment.delete(record).then((done) => done && this.closeDialog());
  }
  protected closeDialog(): void {
    if (this.equipment.mutating()) return;
    this.dialogMode.set(null);
    this.selectedEquipment.set(null);
    const element = this.restoreFocusElement;
    this.restoreFocusElement = null;
    setTimeout(() => element?.focus());
  }
  protected destinationNames(record: SystemEquipment): string {
    if (record.clasificacion === 'fijo') return 'No aplica';
    return record.campusDestinoIdsPermitidos.map((id) => this.equipment.campusKey(id)).join(', ');
  }
  protected previousPage(): void {
    this.equipment.setPage(this.equipment.page() - 1);
  }
  protected nextPage(): void {
    this.equipment.setPage(this.equipment.page() + 1);
  }
  protected changePageSize(event: Event): void {
    this.equipment.setPageSize(Number((event.target as HTMLSelectElement).value));
  }
  protected formatTimestamp(value: EquipmentTimestamp): string {
    const date = this.toDate(value);
    return date
      ? new Intl.DateTimeFormat('es-MX', {
          dateStyle: 'medium',
          timeStyle: 'short',
          timeZone: 'America/Cancun',
        }).format(date)
      : 'Sin registro';
  }

  @HostListener('document:keydown.escape')
  protected handleEscape(): void {
    if (this.dialogMode()) this.closeDialog();
  }

  private async persist(input: {
    nombre: string;
    campusBaseId: string;
    cantidadOperativa: number;
    clasificacion: 'fijo' | 'transferible';
    campusDestinoIdsPermitidos: readonly string[];
    activo: boolean;
  }): Promise<void> {
    const selected = this.selectedEquipment();
    const done = selected
      ? await this.equipment.update({
          documentId: selected.documentId,
          nombre: input.nombre,
          campusBaseId: input.campusBaseId,
          cantidadOperativa: input.cantidadOperativa,
          clasificacion: input.clasificacion,
          campusDestinoIdsPermitidos: input.campusDestinoIdsPermitidos,
        })
      : await this.equipment.create(input);
    if (done) this.closeDialog();
  }
  private remember(event: Event): void {
    this.restoreFocusElement = event.currentTarget as HTMLElement;
  }
  private toDate(value: EquipmentTimestamp): Date | null {
    if (value === null) return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    if (typeof value === 'string' || typeof value === 'number') {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    }
    if (typeof value.toDate === 'function') return value.toDate();
    const seconds = value.seconds ?? value._seconds;
    return typeof seconds === 'number' ? new Date(seconds * 1000) : null;
  }
}
