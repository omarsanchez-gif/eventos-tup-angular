import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';

import { AuthFacade } from '../../core/auth/auth.facade';
import type { AuthorizedUser } from '../../shared/models/authorized-user';
import { AdminShell } from './admin-shell';

describe('AdminShell', () => {
  let fixture: ComponentFixture<AdminShell>;
  const user = signal<AuthorizedUser | null>({
    uid: 'firebase-uid',
    nombre: 'Omar Sanchez',
    correo: 'omar.sanchez@tecplayacar.edu.mx',
    rol: 'admin',
    activo: true,
  });
  const loading = signal(false);
  const authFacade = {
    user: user.asReadonly(),
    loading: loading.asReadonly(),
    logout: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    user.set({
      uid: 'firebase-uid',
      nombre: 'Omar Sanchez',
      correo: 'omar.sanchez@tecplayacar.edu.mx',
      rol: 'admin',
      activo: true,
    });
    loading.set(false);
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1280,
    });

    await TestBed.configureTestingModule({
      imports: [AdminShell],
      providers: [provideRouter([]), { provide: AuthFacade, useValue: authFacade }],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminShell);
    fixture.detectChanges();
  });

  it('renders the private shell with semantic navigation and module links', () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('aside[aria-label="Navegación administrativa"]')).toBeTruthy();
    expect(element.querySelector('header[aria-label="Barra superior"]')).toBeTruthy();
    expect(element.querySelector('main#main-content')).toBeTruthy();
    expect(element.querySelector('router-outlet')).toBeTruthy();
    expect(element.querySelector('a[href="/dashboard"]')?.textContent).toContain('Dashboard');
    expect(element.querySelector('a[href="/usuarios"]')?.textContent).toContain('Usuarios');
    expect(element.querySelector('.skip-link')?.textContent).toContain('Saltar al contenido');
  });

  it('keeps only Eventos disabled for an admin', () => {
    const disabledItems = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>(
        '.nav-item[aria-disabled="true"]',
      ),
    );
    expect(disabledItems).toHaveLength(1);
    expect(disabledItems.every((item) => item.disabled)).toBe(true);
    expect(disabledItems[0]?.textContent).toContain('Eventos');
  });

  it('hides Usuarios for the usuario role', () => {
    user.update((current) => (current ? { ...current, rol: 'usuario' } : current));
    fixture.detectChanges();

    const content = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(content).toContain('Eventos');
    expect(content).not.toContain('Usuarios');
    expect(content).toContain('Usuario');
  });

  it('toggles the sidebar and updates the accessible state', () => {
    const menu = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      '.topbar__menu',
    );
    expect(menu?.getAttribute('aria-expanded')).toBe('true');

    menu?.click();
    fixture.detectChanges();

    expect(menu?.getAttribute('aria-expanded')).toBe('false');
    expect(menu?.getAttribute('aria-label')).toContain('Mostrar');
  });

  it('closes the mobile sidebar with Escape', () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 600,
    });
    window.dispatchEvent(new Event('resize'));
    fixture.detectChanges();

    const menu = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      '.topbar__menu',
    );
    menu?.click();
    fixture.detectChanges();
    expect(menu?.getAttribute('aria-expanded')).toBe('true');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(menu?.getAttribute('aria-expanded')).toBe('false');
  });

  it('delegates logout and exposes the loading state', () => {
    const logout = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      '.logout',
    );
    logout?.click();
    expect(authFacade.logout).toHaveBeenCalledOnce();

    loading.set(true);
    fixture.detectChanges();
    expect(logout?.disabled).toBe(true);
    expect(logout?.getAttribute('aria-busy')).toBe('true');
  });
});
