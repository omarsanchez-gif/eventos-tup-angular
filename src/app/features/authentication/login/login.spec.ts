import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { AuthFacade } from '../../../core/auth/auth.facade';
import { Login } from './login';

describe('Login', () => {
  let fixture: ComponentFixture<Login>;
  const loading = signal(false);
  const error = signal<string | null>(null);
  const authFacade = {
    loading: loading.asReadonly(),
    error: error.asReadonly(),
    login: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    loading.set(false);
    error.set(null);
    authFacade.login.mockClear();
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [{ provide: AuthFacade, useValue: authFacade }],
    }).compileComponents();
    fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
  });

  it('renders the approved institutional login content', () => {
    const content = fixture.nativeElement.textContent as string;
    expect(content).toContain('Sistema de Eventos TUP');
    expect(content).toContain('Iniciar sesión con Google');
    expect(content).toContain('usuarios autorizados');
  });

  it('disables the button and exposes aria-busy while loading', () => {
    loading.set(true);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;

    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');
  });

  it('announces functional errors before allowing retry', () => {
    error.set('Usuario no autorizado.');
    fixture.detectChanges();
    const alert = fixture.nativeElement.querySelector('[role="alert"]') as HTMLElement;

    expect(alert.textContent).toContain('Usuario no autorizado.');
  });
});
