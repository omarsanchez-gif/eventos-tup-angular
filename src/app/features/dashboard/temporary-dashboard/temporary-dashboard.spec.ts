import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { AuthFacade } from '../../../core/auth/auth.facade';
import { TemporaryDashboard } from './temporary-dashboard';

describe('TemporaryDashboard', () => {
  let fixture: ComponentFixture<TemporaryDashboard>;
  const authFacade = {
    user: signal({
      uid: 'firebase-uid',
      nombre: 'Persona Autorizada',
      correo: 'persona@institucion.test',
      rol: 'usuario' as const,
      activo: true as const,
    }).asReadonly(),
    loading: signal(false).asReadonly(),
    logout: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TemporaryDashboard],
      providers: [{ provide: AuthFacade, useValue: authFacade }],
    }).compileComponents();
    fixture = TestBed.createComponent(TemporaryDashboard);
    fixture.detectChanges();
  });

  it('shows only the temporary authenticated route content', () => {
    const content = fixture.nativeElement.textContent as string;
    expect(content).toContain('Bienvenido, Persona Autorizada');
    expect(content).toContain('Persona Autorizada');
    expect(content).toContain('persona@institucion.test');
    expect(content).toContain('Usuario');
    expect(content).toContain('Sesión activa');
    expect(content).not.toMatch(/KPI|actividad|próximos eventos|cerrar sesión|usuarios|sidebar/i);
  });
});
