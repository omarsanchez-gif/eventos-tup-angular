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
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  type ValidationErrors,
} from '@angular/forms';

import { environment } from '../../../../environments/environment';
import { AuthFacade } from '../../../core/auth/auth.facade';
import type { UserRole } from '../../../shared/models/authorized-user';
import type { SystemUser, UserTimestamp } from '../../../shared/models/system-user';
import { UsersFacade } from '../state/users.facade';

type DialogMode = 'form' | 'demote' | 'status' | 'delete' | null;

function institutionalEmail(control: AbstractControl<string>): ValidationErrors | null {
  const email = control.value.trim().toLowerCase();
  return !email || email.endsWith(`@${environment.institutionalDomain}`)
    ? null
    : { institutionalDomain: true };
}

@Component({
  selector: 'app-users-page',
  imports: [A11yModule, ReactiveFormsModule],
  providers: [UsersFacade],
  templateUrl: './users-page.html',
  styleUrl: './users-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersPage implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  protected readonly auth = inject(AuthFacade);
  protected readonly users = inject(UsersFacade);
  protected readonly institutionalDomain = environment.institutionalDomain;
  protected readonly dialogMode = signal<DialogMode>(null);
  protected readonly selectedUser = signal<SystemUser | null>(null);
  protected readonly editing = computed(() => this.selectedUser() !== null);
  protected readonly isSelf = computed(() => this.selectedUser()?.uid === this.auth.user()?.uid);
  protected readonly searchForm = this.formBuilder.nonNullable.group({
    term: '',
  });
  protected readonly userForm = this.formBuilder.nonNullable.group({
    nombre: ['', Validators.required],
    correo: ['', [Validators.required, Validators.email, institutionalEmail]],
    rol: this.formBuilder.nonNullable.control<UserRole>('usuario', Validators.required),
    activo: true,
  });
  private restoreFocusElement: HTMLElement | null = null;

  ngOnInit(): void {
    void this.users.load();
  }

  protected applySearch(): void {
    this.users.search(this.searchForm.controls.term.value);
  }

  protected applyLiveSearch(event: Event): void {
    this.users.search((event.target as HTMLInputElement).value);
  }

  protected clearSearch(): void {
    this.searchForm.controls.term.setValue('');
    this.users.clearSearch();
  }

  protected openCreate(event: Event): void {
    this.rememberTrigger(event);
    this.selectedUser.set(null);
    this.userForm.reset({
      nombre: '',
      correo: '',
      rol: 'usuario',
      activo: true,
    });
    this.userForm.controls.correo.enable();
    this.userForm.controls.rol.enable();
    this.dialogMode.set('form');
  }

  protected openEdit(user: SystemUser, event: Event): void {
    this.rememberTrigger(event);
    this.selectedUser.set(user);
    this.userForm.reset({
      nombre: user.nombre,
      correo: user.correo,
      rol: user.rol,
      activo: user.activo,
    });
    if (user.uid) {
      this.userForm.controls.correo.disable();
    } else {
      this.userForm.controls.correo.enable();
    }
    if (user.uid === this.auth.user()?.uid) {
      this.userForm.controls.rol.disable();
    } else {
      this.userForm.controls.rol.enable();
    }
    this.dialogMode.set('form');
  }

  protected openStatus(user: SystemUser, event: Event): void {
    this.rememberTrigger(event);
    this.selectedUser.set(user);
    this.dialogMode.set('status');
  }

  protected openDelete(user: SystemUser, event: Event): void {
    this.rememberTrigger(event);
    this.selectedUser.set(user);
    this.dialogMode.set('delete');
  }

  protected submitForm(): void {
    if (this.userForm.invalid || this.users.mutating()) {
      this.userForm.markAllAsTouched();
      this.focusFirstInvalidField();
      return;
    }

    const selected = this.selectedUser();
    const value = this.userForm.getRawValue();
    if (selected?.rol === 'admin' && value.rol === 'usuario') {
      this.dialogMode.set('demote');
      return;
    }
    void this.persistForm();
  }

  protected confirmDemotion(): void {
    void this.persistForm();
  }

  protected returnToForm(): void {
    this.dialogMode.set('form');
  }

  protected confirmStatus(): void {
    const selected = this.selectedUser();
    if (!selected) {
      return;
    }
    void this.users.setStatus(selected, !selected.activo).then((completed) => {
      if (completed) {
        this.closeDialog();
      }
    });
  }

  protected confirmDelete(): void {
    const selected = this.selectedUser();
    if (!selected) {
      return;
    }
    void this.users.delete(selected).then((completed) => {
      if (completed) {
        this.closeDialog();
      }
    });
  }

  protected closeDialog(): void {
    if (this.users.mutating()) {
      return;
    }
    this.dialogMode.set(null);
    this.selectedUser.set(null);
    const element = this.restoreFocusElement;
    this.restoreFocusElement = null;
    setTimeout(() => element?.focus());
  }

  protected isCurrentUser(user: SystemUser): boolean {
    return user.uid !== null && user.uid === this.auth.user()?.uid;
  }

  protected formatLastAccess(value: UserTimestamp): string {
    const date = this.toDate(value);
    if (!date) {
      return 'Sin acceso';
    }
    return new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'America/Cancun',
    }).format(date);
  }

  protected previousPage(): void {
    this.users.setPage(this.users.page() - 1);
  }

  protected nextPage(): void {
    this.users.setPage(this.users.page() + 1);
  }

  protected changePageSize(event: Event): void {
    this.users.setPageSize(Number((event.target as HTMLSelectElement).value));
  }

  @HostListener('document:keydown.escape')
  protected handleEscape(): void {
    if (this.dialogMode()) {
      this.closeDialog();
    }
  }

  private async persistForm(): Promise<void> {
    const selected = this.selectedUser();
    const value = this.userForm.getRawValue();
    const input = {
      nombre: value.nombre.trim(),
      correo: value.correo.trim().toLocaleLowerCase('es-MX'),
      rol: value.rol,
    } as const;
    const completed = selected
      ? await this.users.update({ documentId: selected.documentId, ...input })
      : await this.users.create({ ...input, activo: value.activo });
    if (completed) {
      this.closeDialog();
    } else if (this.dialogMode() === 'demote') {
      this.dialogMode.set('form');
    }
  }

  private rememberTrigger(event: Event): void {
    this.restoreFocusElement = event.currentTarget as HTMLElement;
  }

  private focusFirstInvalidField(): void {
    setTimeout(() => {
      document
        .querySelector<HTMLElement>(
          '.users-dialog input.ng-invalid, .users-dialog select.ng-invalid',
        )
        ?.focus();
    });
  }

  private toDate(value: UserTimestamp): Date | null {
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
