import { A11yModule } from '@angular/cdk/a11y';
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, type FormGroup } from '@angular/forms';

import type {
  CampusDay,
  CampusSchedule,
  CampusTimestamp,
  SystemCampus,
} from '../../../shared/models/system-campus';
import { CampusesFacade } from '../state/campuses.facade';

type DialogMode = 'form' | 'status' | 'delete' | null;
const EDITABLE_DAYS: readonly {
  key: Exclude<CampusDay, 'domingo'>;
  label: string;
}[] = [
  { key: 'lunes', label: 'Lunes' },
  { key: 'martes', label: 'Martes' },
  { key: 'miercoles', label: 'Miércoles' },
  { key: 'jueves', label: 'Jueves' },
  { key: 'viernes', label: 'Viernes' },
  { key: 'sabado', label: 'Sábado' },
];
const TUP_SCHEDULE: CampusSchedule = {
  lunes: { operativo: true, inicio: '08:00', fin: '20:00' },
  martes: { operativo: true, inicio: '08:00', fin: '20:00' },
  miercoles: { operativo: true, inicio: '08:00', fin: '20:00' },
  jueves: { operativo: true, inicio: '08:00', fin: '20:00' },
  viernes: { operativo: true, inicio: '08:00', fin: '20:00' },
  sabado: { operativo: true, inicio: '08:00', fin: '18:00' },
  domingo: { operativo: false, inicio: null, fin: null },
};

@Component({
  selector: 'app-campuses-page',
  imports: [A11yModule, ReactiveFormsModule],
  providers: [CampusesFacade],
  templateUrl: './campuses-page.html',
  styleUrl: './campuses-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampusesPage implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  protected readonly campuses = inject(CampusesFacade);
  protected readonly days = EDITABLE_DAYS;
  protected readonly dialogMode = signal<DialogMode>(null);
  protected readonly selectedCampus = signal<SystemCampus | null>(null);
  protected readonly formError = signal<string | null>(null);
  protected readonly searchForm = this.formBuilder.nonNullable.group({
    term: '',
  });
  protected readonly campusForm = this.formBuilder.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(120)]],
    clave: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9-]{2,10}$/u)]],
    direccion: ['', Validators.maxLength(240)],
    referencia: ['', Validators.maxLength(240)],
    activo: true,
    horariosSistemas: this.formBuilder.nonNullable.group(
      Object.fromEntries(
        EDITABLE_DAYS.map(({ key }) => [
          key,
          this.formBuilder.nonNullable.group({
            operativo: true,
            inicio: '08:00',
            fin: '20:00',
          }),
        ]),
      ),
    ),
  });
  private restoreFocusElement: HTMLElement | null = null;

  ngOnInit(): void {
    void this.campuses.load();
  }

  protected scheduleGroup(day: Exclude<CampusDay, 'domingo'>): FormGroup {
    return this.campusForm.controls.horariosSistemas.controls[day] as FormGroup;
  }
  protected applySearch(event: Event): void {
    this.campuses.search((event.target as HTMLInputElement).value);
  }
  protected clearSearch(): void {
    this.searchForm.controls.term.setValue('');
    this.campuses.clearSearch();
  }
  protected openCreate(event: Event): void {
    this.remember(event);
    this.selectedCampus.set(null);
    this.campusForm.controls.clave.enable();
    this.patchForm({
      nombre: '',
      clave: '',
      direccion: null,
      referencia: null,
      activo: true,
      horariosSistemas: TUP_SCHEDULE,
    });
    this.formError.set(null);
    this.dialogMode.set('form');
  }
  protected openEdit(campus: SystemCampus, event: Event): void {
    this.remember(event);
    this.selectedCampus.set(campus);
    this.patchForm(campus);
    if (campus.utilizado) {
      this.campusForm.controls.clave.disable();
    } else {
      this.campusForm.controls.clave.enable();
    }
    this.formError.set(null);
    this.dialogMode.set('form');
  }
  protected openStatus(campus: SystemCampus, event: Event): void {
    this.remember(event);
    this.selectedCampus.set(campus);
    this.dialogMode.set('status');
  }
  protected openDelete(campus: SystemCampus, event: Event): void {
    if (campus.utilizado) return;
    this.remember(event);
    this.selectedCampus.set(campus);
    this.dialogMode.set('delete');
  }
  protected submitForm(): void {
    this.formError.set(null);
    if (this.campusForm.invalid || this.campuses.mutating()) {
      this.campusForm.markAllAsTouched();
      return;
    }
    const input = this.formInput();
    const active = this.selectedCampus()?.activo ?? input.activo;
    const operative = Object.values(input.horariosSistemas).some((day) => day.operativo);
    const invalidTime = Object.values(input.horariosSistemas).some(
      (day) => day.operativo && (!day.inicio || !day.fin || day.fin <= day.inicio),
    );
    if (invalidTime) {
      this.formError.set('Cada día operativo requiere una hora final posterior a la inicial.');
      return;
    }
    if (active && !operative) {
      this.formError.set('Un campus activo requiere al menos un día operativo.');
      return;
    }
    void this.persist(input);
  }
  protected confirmStatus(): void {
    const campus = this.selectedCampus();
    if (!campus) return;
    void this.campuses.setStatus(campus, !campus.activo).then((done) => done && this.closeDialog());
  }
  protected confirmDelete(): void {
    const campus = this.selectedCampus();
    if (!campus || campus.utilizado) return;
    void this.campuses.delete(campus).then((done) => done && this.closeDialog());
  }
  protected closeDialog(): void {
    if (this.campuses.mutating()) return;
    this.dialogMode.set(null);
    this.selectedCampus.set(null);
    const element = this.restoreFocusElement;
    this.restoreFocusElement = null;
    setTimeout(() => element?.focus());
  }
  protected formatSchedule(campus: SystemCampus): string {
    const working = EDITABLE_DAYS.filter(({ key }) => campus.horariosSistemas[key].operativo);
    if (!working.length) return 'Sin horario operativo';
    const first = working[0]?.key;
    const saturday = campus.horariosSistemas.sabado;
    const weekday = first ? campus.horariosSistemas[first] : null;
    return `L–V ${weekday?.inicio ?? '—'}–${weekday?.fin ?? '—'} · Sáb ${
      saturday.operativo ? `${saturday.inicio}–${saturday.fin}` : 'inactivo'
    }`;
  }
  protected previousPage(): void {
    this.campuses.setPage(this.campuses.page() - 1);
  }
  protected nextPage(): void {
    this.campuses.setPage(this.campuses.page() + 1);
  }
  protected changePageSize(event: Event): void {
    this.campuses.setPageSize(Number((event.target as HTMLSelectElement).value));
  }
  protected formatTimestamp(value: CampusTimestamp): string {
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

  private patchForm(value: {
    nombre: string;
    clave: string;
    direccion: string | null;
    referencia: string | null;
    activo: boolean;
    horariosSistemas: CampusSchedule;
  }): void {
    this.campusForm.patchValue({
      nombre: value.nombre,
      clave: value.clave,
      direccion: value.direccion ?? '',
      referencia: value.referencia ?? '',
      activo: value.activo,
    });
    EDITABLE_DAYS.forEach(({ key }) => {
      const day = value.horariosSistemas[key];
      this.scheduleGroup(key).patchValue({
        operativo: day.operativo,
        inicio: day.inicio ?? '',
        fin: day.fin ?? '',
      });
    });
  }
  private formInput() {
    const value = this.campusForm.getRawValue();
    const schedule = Object.fromEntries(
      EDITABLE_DAYS.map(({ key }) => {
        const day = value.horariosSistemas[key] as {
          operativo: boolean;
          inicio: string;
          fin: string;
        };
        return [
          key,
          day.operativo
            ? { operativo: true, inicio: day.inicio, fin: day.fin }
            : { operativo: false, inicio: null, fin: null },
        ];
      }),
    ) as unknown as Omit<CampusSchedule, 'domingo'>;
    return {
      nombre: value.nombre.trim().replace(/\s+/gu, ' '),
      clave: value.clave.trim().toUpperCase(),
      direccion: value.direccion.trim() || null,
      referencia: value.referencia.trim() || null,
      activo: value.activo,
      horariosSistemas: {
        ...schedule,
        domingo: { operativo: false, inicio: null, fin: null },
      } as CampusSchedule,
    };
  }
  private async persist(input: ReturnType<CampusesPage['formInput']>): Promise<void> {
    const selected = this.selectedCampus();
    const done = selected
      ? await this.campuses.update({
          documentId: selected.documentId,
          nombre: input.nombre,
          clave: input.clave,
          direccion: input.direccion,
          referencia: input.referencia,
          horariosSistemas: input.horariosSistemas,
        })
      : await this.campuses.create(input);
    if (done) this.closeDialog();
  }
  private remember(event: Event): void {
    this.restoreFocusElement = event.currentTarget as HTMLElement;
  }
  private toDate(value: CampusTimestamp): Date | null {
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
