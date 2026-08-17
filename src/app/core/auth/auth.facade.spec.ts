import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import type { IdTokenResult, Unsubscribe, User } from 'firebase/auth';
import { vi } from 'vitest';

import type { BootstrapAuthorizationResult } from '../../shared/models/authorized-user';
import { AuthFacade } from './auth.facade';
import {
  AUTH_GATEWAY,
  AUTHORIZATION_GATEWAY,
  type AuthGateway,
  type AuthorizationGateway,
} from './gateways';

@Component({ template: '' })
class EmptyRouteComponent {}

const firebaseUser = { uid: 'firebase-uid' } as User;
const profile: BootstrapAuthorizationResult = {
  uid: 'firebase-uid',
  nombre: 'Persona Autorizada',
  correo: 'persona@institucion.test',
  rol: 'usuario',
  activo: true,
  claimsUpdated: true,
};

class AuthGatewayFake implements AuthGateway {
  readonly signOut = vi.fn().mockResolvedValue(undefined);
  readonly signInWithGoogle = vi.fn().mockResolvedValue(firebaseUser);
  readonly refreshClaims = vi.fn().mockResolvedValue({
    claims: { authorized: true, role: 'usuario' },
  } as unknown as IdTokenResult);

  observeSession(
    onSession: (user: User | null) => void,
    onError: (error: unknown) => void,
  ): Unsubscribe {
    void onError;
    queueMicrotask(() => onSession(null));
    return () => undefined;
  }
}

class AuthorizationGatewayFake implements AuthorizationGateway {
  readonly bootstrap = vi.fn().mockResolvedValue(profile);
}

describe('AuthFacade', () => {
  let facade: AuthFacade;
  let authGateway: AuthGatewayFake;

  beforeEach(() => {
    authGateway = new AuthGatewayFake();
    TestBed.configureTestingModule({
      providers: [
        AuthFacade,
        { provide: AUTH_GATEWAY, useValue: authGateway },
        { provide: AUTHORIZATION_GATEWAY, useClass: AuthorizationGatewayFake },
        provideRouter([
          { path: 'login', component: EmptyRouteComponent },
          { path: 'dashboard', component: EmptyRouteComponent },
        ]),
      ],
    });
    facade = TestBed.inject(AuthFacade);
  });

  it('initializes without exposing an anonymous session', async () => {
    await facade.initialize();

    expect(facade.initialized()).toBe(true);
    expect(facade.authorized()).toBe(false);
    expect(facade.user()).toBeNull();
  });

  it('authorizes a valid login after refreshing claims', async () => {
    await facade.login();

    expect(facade.authorized()).toBe(true);
    expect(facade.role()).toBe('usuario');
    expect(facade.user()?.correo).toBe(profile.correo);
    expect(authGateway.refreshClaims).toHaveBeenCalledWith(firebaseUser);
    expect(TestBed.inject(Router).url).toBe('/dashboard');
  });

  it('clears all authorized state during logout', async () => {
    await facade.login();
    await facade.logout();

    expect(facade.authorized()).toBe(false);
    expect(facade.isAuthenticated()).toBe(false);
    expect(authGateway.signOut).toHaveBeenCalled();
    expect(TestBed.inject(Router).url).toBe('/login');
  });

  it('rejects a profile when refreshed claims are not authorized', async () => {
    authGateway.refreshClaims.mockResolvedValue({
      claims: { authorized: false, role: null },
    } as unknown as IdTokenResult);

    await facade.login();

    expect(facade.authorized()).toBe(false);
    expect(facade.error()).toContain('servicio no está disponible');
    expect(authGateway.signOut).toHaveBeenCalled();
  });
});
