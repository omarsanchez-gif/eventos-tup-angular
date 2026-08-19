import { A11yModule } from '@angular/cdk/a11y';
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  Validators,
  type ValidationErrors,
} from '@angular/forms';

import { environment } from '../../../../environments/environment';
import type {
  CoordinationTimestamp,
  SystemCoordination,
} from '../../../shared/models/system-coordination';
import { CoordinationsFacade } from '../state/coordinations.facade';

type DialogMode = 'form' | 'status' | 'delete' | null;
const MAX_EMAILS = 10;

function institutionalEmail(control: AbstractControl<string>): ValidationErrors | null {
  const email = control.value.trim().toLowerCase();
  return !email || email.endsWith(`@${environment.institutionalDomain}`)
    ? null
    : { institutionalDomain: true };
}

@Component({
  selector: 'app-coordinations-page',
  imports: [A11yModule, ReactiveFormsModule],
  providers: [CoordinationsFacade],
  templateUrl: './coordinations-page.html',
  styleUrl: './coordinations-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoordinationsPage implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  protected readonly coordinations = inject(CoordinationsFacade);
  protected readonly institutionalDomain = environment.institutionalDomain;
  protected readonly maxEmails = MAX_EMAILS;
  protected readonly emailListAnnouncement = signal('');
  protected readonly dialogMode = signal<DialogMode>(null);
  protected readonly selectedCoordination = signal<SystemCoordination | null>(null);
  protected readonly searchForm = this.formBuilder.nonNullable.group({
    term: '',
  });
  protected readonly coordinationForm = this.formBuilder.nonNullable.group({
    nombre: ['', Validators.required],
    correos: this.formBuilder.array<FormControl<string>>([]),
    activo: true,
  });
  private restoreFocusElement: HTMLElement | null = null;

  ngOnInit(): void {
    void this.coordinations.load();
  }

  protected get emailControls(): readonly FormControl<string>[] {
    return this.coordinationForm.controls.correos.controls;
  }

  protected applySearch(): void {
    this.coordinations.search(this.searchForm.controls.term.value);
  }

  protected applyLiveSearch(event: Event): void {
    this.coordinations.search((event.target as HTMLInputElement).value);
  }

  protected clearSearch(): void {
    this.searchForm.controls.term.setValue('');
    this.coordinations.clearSearch();
  }

  protected openCreate(event: Event): void {
    this.rememberTrigger(event);
    this.selectedCoordination.set(null);
    this.coordinationForm.reset({ nombre: '', activo: true });
    this.coordinationForm.controls.correos.clear();
    this.addEmail();
    this.dialogMode.set('form');
  }

  protected openEdit(coordination: SystemCoordination, event: Event): void {
    this.rememberTrigger(event);
    this.selectedCoordination.set(coordination);
    this.coordinationForm.reset({
      nombre: coordination.nombre,
      activo: coordination.activo,
    });
    this.coordinationForm.controls.correos.clear();
    coordination.correos.forEach((email) =>
      this.coordinationForm.controls.correos.push(this.createEmailControl(email)),
    );
    this.dialogMode.set('form');
  }

  protected addEmail(): void {
    const emails = this.coordinationForm.controls.correos;
    if (emails.length >= MAX_EMAILS) {
      return;
    }
    emails.push(this.createEmailControl());
    this.coordinationForm.setErrors(null);
    this.emailListAnnouncement.set(`Correo ${emails.length} agregado.`);
    const index = emails.length - 1;
    setTimeout(() => document.getElementById(`coordination-email-${index}`)?.focus());
  }

  protected removeEmail(index: number): void {
    this.coordinationForm.controls.correos.removeAt(index);
    this.coordinationForm.setErrors(null);
    this.emailListAnnouncement.set(`Correo ${index + 1} retirado.`);
    setTimeout(() => document.querySelector<HTMLElement>('.add-email')?.focus());
  }

  protected openStatus(coordination: SystemCoordination, event: Event): void {
    this.rememberTrigger(event);
    this.selectedCoordination.set(coordination);
    this.dialogMode.set('status');
  }

  protected openDelete(coordination: SystemCoordination, event: Event): void {
    if (coordination.utilizada) {
      return;
    }
    this.rememberTrigger(event);
    this.selectedCoordination.set(coordination);
    this.dialogMode.set('delete');
  }

  protected submitForm(): void {
    const emails = this.coordinationForm.controls.correos;
    const active =
      this.selectedCoordination()?.activo ?? this.coordinationForm.controls.activo.value;
    const normalizedEmails = emails.controls.map((control) =>
      control.value.trim().toLocaleLowerCase('es-MX'),
    );
    const formErrors: ValidationErrors = {};
    if (active && emails.length === 0) {
      formErrors['activeRequiresEmail'] = true;
    }
    if (new Set(normalizedEmails).size !== normalizedEmails.length) {
      formErrors['duplicateEmails'] = true;
    }
    this.coordinationForm.setErrors(Object.keys(formErrors).length > 0 ? formErrors : null);
    if (this.coordinationForm.invalid || this.coordinations.mutating()) {
      this.coordinationForm.markAllAsTouched();
      this.focusFirstInvalidField();
      return;
    }
    void this.persistForm();
  }

  protected confirmStatus(): void {
    const selected = this.selectedCoordination();
    if (!selected) {
      return;
    }
    void this.coordinations.setStatus(selected, !selected.activo).then((completed) => {
      if (completed) {
        this.closeDialog();
      }
    });
  }

  protected confirmDelete(): void {
    const selected = this.selectedCoordination();
    if (!selected || selected.utilizada) {
      return;
    }
    void this.coordinations.delete(selected).then((completed) => {
      if (completed) {
        this.closeDialog();
      }
    });
  }

  protected closeDialog(): void {
    if (this.coordinations.mutating()) {
      return;
    }
    this.dialogMode.set(null);
    this.selectedCoordination.set(null);
    const element = this.restoreFocusElement;
    this.restoreFocusElement = null;
    setTimeout(() => element?.focus());
  }

  protected previousPage(): void {
    this.coordinations.setPage(this.coordinations.page() - 1);
  }

  protected nextPage(): void {
    this.coordinations.setPage(this.coordinations.page() + 1);
  }

  protected changePageSize(event: Event): void {
    this.coordinations.setPageSize(Number((event.target as HTMLSelectElement).value));
  }

  protected formatTimestamp(value: CoordinationTimestamp): string {
    const date = this.toDate(value);
    if (!date) {
      return 'Sin registro';
    }
    return new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'America/Cancun',
    }).format(date);
  }

  @HostListener('document:keydown.escape')
  protected handleEscape(): void {
    if (this.dialogMode()) {
      this.closeDialog();
    }
  }

  private createEmailControl(value = ''): FormControl<string> {
    return this.formBuilder.nonNullable.control(value, [
      Validators.required,
      Validators.email,
      institutionalEmail,
    ]);
  }

  private async persistForm(): Promise<void> {
    const selected = this.selectedCoordination();
    const value = this.coordinationForm.getRawValue();
    const input = {
      nombre: value.nombre.trim().replace(/\s+/gu, ' '),
      correos: value.correos.map((email) => email.trim().toLocaleLowerCase('es-MX')),
    } as const;
    const completed = selected
      ? await this.coordinations.update({
          documentId: selected.documentId,
          ...input,
        })
      : await this.coordinations.create({ ...input, activo: value.activo });
    if (completed) {
      this.closeDialog();
    }
  }

  private rememberTrigger(event: Event): void {
    this.restoreFocusElement = event.currentTarget as HTMLElement;
  }

  private focusFirstInvalidField(): void {
    setTimeout(() => {
      document
        .querySelector<HTMLElement>(
          '.coordination-dialog input.ng-invalid, .coordination-dialog input[id^="coordination-email-"], .coordination-dialog .add-email',
        )
        ?.focus();
    });
  }

  private toDate(value: CoordinationTimestamp): Date | null {
    if (value === null) {
      return null;
    }
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }
    if (typeof value === 'string' || typeof value === 'number') {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    }
    if (typeof value.toDate === 'function') {
      return value.toDate();
    }
    const seconds = value.seconds ?? value._seconds;
    return typeof seconds === 'number' ? new Date(seconds * 1000) : null;
  }
}
