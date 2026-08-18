import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree } from '@angular/router';
import { signal } from '@angular/core';

import { AuthFacade } from '../auth/auth.facade';
import { adminGuard } from './admin.guard';

describe('adminGuard', () => {
  const authorized = signal(true);
  const role = signal<'admin' | 'usuario' | null>('admin');
  const auth = {
    authorized: authorized.asReadonly(),
    role: role.asReadonly(),
    initialize: () => Promise.resolve(),
  };

  beforeEach(() => {
    authorized.set(true);
    role.set('admin');
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthFacade, useValue: auth }],
    });
  });

  it('allows only an authorized admin', async () => {
    const result = await TestBed.runInInjectionContext(() => adminGuard({} as never, {} as never));
    expect(result).toBe(true);
  });

  it('redirects a regular user to dashboard', async () => {
    role.set('usuario');
    const result = await TestBed.runInInjectionContext(() => adminGuard({} as never, {} as never));
    expect(result).toBeInstanceOf(UrlTree);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/dashboard');
  });

  it('redirects a session without authorization to login', async () => {
    authorized.set(false);
    const result = await TestBed.runInInjectionContext(() => adminGuard({} as never, {} as never));
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/login');
  });
});
