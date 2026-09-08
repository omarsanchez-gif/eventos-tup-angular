import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { AuthFacade } from '../../../core/auth/auth.facade';
import type { AuthorizedUser } from '../../../shared/models/authorized-user';
import type { SystemUser } from '../../../shared/models/system-user';
import { USERS_GATEWAY, type UsersGateway } from '../data/users.gateway';
import { UsersPage } from './users-page';

const admin = signal<AuthorizedUser | null>({
  uid: 'admin-uid',
  nombre: 'Omar Sanchez',
  correo: 'omar.sanchez@tecplayacar.edu.mx',
  rol: 'admin',
  activo: true,
});
const records: readonly SystemUser[] = [
  {
    documentId: 'admin-document',
    uid: 'admin-uid',
    nombre: 'Omar Sanchez',
    correo: 'omar.sanchez@tecplayacar.edu.mx',
    rol: 'admin',
    activo: true,
    fechaCreacion: null,
    ultimoAcceso: null,
  },
  {
    documentId: 'user-document',
    uid: null,
    nombre: 'Persona Usuaria',
    correo: 'persona@tecplayacar.edu.mx',
    rol: 'usuario',
    activo: true,
    fechaCreacion: null,
    ultimoAcceso: null,
  },
];

describe('UsersPage', () => {
  let fixture: ComponentFixture<UsersPage>;
  let gateway: UsersGateway;

  beforeEach(async () => {
    gateway = {
      list: vi.fn().mockResolvedValue({ items: records, total: 2, maxSupported: 500 }),
      create: vi.fn().mockResolvedValue({ documentId: 'created', status: 'completed' }),
      update: vi.fn().mockResolvedValue({
        documentId: 'user-document',
        status: 'completed',
      }),
      setStatus: vi.fn().mockResolvedValue({
        documentId: 'user-document',
        status: 'completed',
      }),
      delete: vi.fn().mockResolvedValue({
        documentId: 'user-document',
        status: 'completed',
      }),
    };
    await TestBed.configureTestingModule({
      imports: [UsersPage],
      providers: [
        { provide: USERS_GATEWAY, useValue: gateway },
        { provide: AuthFacade, useValue: { user: admin.asReadonly() } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(UsersPage);
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
  });

  it('renders the specified columns, users and self-protection controls', () => {
    const element = fixture.nativeElement as HTMLElement;
    const headings = Array.from(element.querySelectorAll('th')).map((item) =>
      item.textContent?.trim(),
    );
    expect(headings).toEqual(['Nombre', 'Correo', 'Rol', 'Estado', 'Último acceso', 'Acciones']);
    expect(element.textContent).toContain('Omar Sanchez');
    expect(element.textContent).toContain('Persona Usuaria');
    const ownDelete = element.querySelector<HTMLButtonElement>(
      'button[aria-label="Eliminar a Omar Sanchez"]',
    );
    expect(ownDelete?.disabled).toBe(true);
  });

  it('opens the create dialog and validates the institutional email', () => {
    const element = fixture.nativeElement as HTMLElement;
    element.querySelector<HTMLButtonElement>('.page-header .button--primary')?.click();
    fixture.detectChanges();
    const email = element.querySelector<HTMLInputElement>('#user-email');
    email!.value = 'persona@example.com';
    email!.dispatchEvent(new Event('input'));
    element.querySelector<HTMLButtonElement>('.users-dialog button[type="submit"]')?.click();
    fixture.detectChanges();
    const errors = Array.from(element.querySelectorAll('.field-error'))
      .map((error) => error.textContent)
      .join(' ');
    expect(errors).toContain('tecplayacar.edu.mx');
    expect(gateway.create).not.toHaveBeenCalled();
  });

  it('submits search locally without native navigation or an additional remote list', () => {
    const element = fixture.nativeElement as HTMLElement;
    const search = element.querySelector<HTMLInputElement>('#users-search');
    search!.value = 'nadie@tecplayacar.edu.mx';
    search!.dispatchEvent(new Event('input', { bubbles: true }));
    const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
    element.querySelector<HTMLFormElement>('.search-panel')!.dispatchEvent(submitEvent);
    fixture.detectChanges();
    expect(submitEvent.defaultPrevented).toBe(true);
    expect(gateway.list).toHaveBeenCalledOnce();
    expect(element.textContent).toContain('No se encontraron usuarios');
  });

  it('filters and restores users while typing without submitting or reloading remotely', () => {
    const element = fixture.nativeElement as HTMLElement;
    const search = element.querySelector<HTMLInputElement>('#users-search')!;

    search.value = 'persona';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    expect(element.textContent).toContain('1 registro');
    expect(element.textContent).not.toContain('Omar Sanchez');
    expect(gateway.list).toHaveBeenCalledOnce();

    search.value = '';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    expect(element.textContent).toContain('2 registros');
    expect(element.textContent).toContain('Omar Sanchez');
    expect(gateway.list).toHaveBeenCalledOnce();
  });

  it('renders recognizable SVG actions with accessible contextual descriptions', () => {
    const element = fixture.nativeElement as HTMLElement;
    const edit = element.querySelector<HTMLButtonElement>(
      'button[aria-label="Editar a Persona Usuaria"]',
    );
    const status = element.querySelector<HTMLButtonElement>(
      'button[aria-label="Desactivar a Persona Usuaria"]',
    );
    const remove = element.querySelector<HTMLButtonElement>(
      'button[aria-label="Eliminar a Persona Usuaria"]',
    );

    expect(edit?.querySelector('svg[data-icon="edit"]')).toBeTruthy();
    expect(status?.querySelector('svg[data-icon="deactivate"]')).toBeTruthy();
    expect(remove?.querySelector('svg[data-icon="delete"]')).toBeTruthy();
    expect(
      element.querySelector(`#${remove?.getAttribute('aria-describedby')}`)?.textContent?.trim(),
    ).toBe('Eliminar usuario');

    const ownDelete = element.querySelector<HTMLButtonElement>(
      'button[aria-label="Eliminar a Omar Sanchez"]',
    );
    expect(
      element.querySelector(`#${ownDelete?.getAttribute('aria-describedby')}`)?.textContent?.trim(),
    ).toBe('No puede eliminar su propio registro');
  });
});
