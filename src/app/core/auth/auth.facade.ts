import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import type { User } from 'firebase/auth';

import type {
  AuthorizedUser,
  BootstrapAuthorizationResult,
  UserRole,
} from '../../shared/models/authorized-user';
import { mapAuthError } from './auth-error.mapper';
import { AUTH_GATEWAY, AUTHORIZATION_GATEWAY } from './gateways';

interface FunctionalError {
  readonly details: { readonly functionalCode: string };
}

@Injectable({ providedIn: 'root' })
export class AuthFacade {
  private readonly authGateway = inject(AUTH_GATEWAY);
  private readonly authorizationGateway = inject(AUTHORIZATION_GATEWAY);
  private readonly router = inject(Router);

  private readonly userState = signal<AuthorizedUser | null>(null);
  private readonly loadingState = signal(true);
  private readonly initializedState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private readonly firebaseAuthenticatedState = signal(false);

  private initializationPromise: Promise<void> | null = null;
  private authorizationPromise: Promise<BootstrapAuthorizationResult> | null = null;
  private authorizationUid: string | null = null;

  readonly user = this.userState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly initialized = this.initializedState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly authorized = computed(() => this.userState() !== null);
  readonly role = computed<UserRole | null>(() => this.userState()?.rol ?? null);
  readonly isAuthenticated = computed(() => this.firebaseAuthenticatedState());

  initialize(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.loadingState.set(true);
    this.initializationPromise = new Promise<void>((resolve) => {
      let initialEventHandled = false;
      const finishInitialEvent = (): void => {
        if (!initialEventHandled) {
          initialEventHandled = true;
          this.initializedState.set(true);
          this.loadingState.set(false);
          resolve();
        }
      };

      this.authGateway.observeSession(
        (firebaseUser) => {
          this.firebaseAuthenticatedState.set(firebaseUser !== null);
          void this.handleSession(firebaseUser).finally(finishInitialEvent);
        },
        (error) => {
          this.clearAuthorizedState();
          this.errorState.set(mapAuthError(error));
          finishInitialEvent();
        },
      );
    });

    return this.initializationPromise;
  }

  async login(): Promise<void> {
    await this.initialize();
    this.loadingState.set(true);
    this.errorState.set(null);

    try {
      const firebaseUser = await this.authGateway.signInWithGoogle();
      this.firebaseAuthenticatedState.set(true);
      await this.authorize(firebaseUser);
      await this.router.navigateByUrl('/dashboard', { replaceUrl: true });
    } catch (error) {
      this.clearAuthorizedState();
      this.errorState.set(mapAuthError(error));
      await this.safeSignOut();
    } finally {
      this.loadingState.set(false);
    }
  }

  async logout(): Promise<void> {
    this.loadingState.set(true);
    this.errorState.set(null);
    this.clearAuthorizedState();

    try {
      await this.authGateway.signOut();
    } finally {
      this.loadingState.set(false);
      await this.router.navigateByUrl('/login', { replaceUrl: true });
    }
  }

  clearError(): void {
    this.errorState.set(null);
  }

  private async handleSession(firebaseUser: User | null): Promise<void> {
    if (!firebaseUser) {
      this.clearAuthorizedState();
      return;
    }

    this.loadingState.set(true);
    try {
      await this.authorize(firebaseUser);
    } catch (error) {
      this.clearAuthorizedState();
      this.errorState.set(mapAuthError(error));
      await this.safeSignOut();
    } finally {
      this.loadingState.set(false);
    }
  }

  private authorize(firebaseUser: User): Promise<BootstrapAuthorizationResult> {
    if (this.authorizationPromise && this.authorizationUid === firebaseUser.uid) {
      return this.authorizationPromise;
    }

    this.authorizationUid = firebaseUser.uid;
    this.authorizationPromise = this.performAuthorization(firebaseUser).finally(() => {
      this.authorizationPromise = null;
      this.authorizationUid = null;
    });
    return this.authorizationPromise;
  }

  private async performAuthorization(firebaseUser: User): Promise<BootstrapAuthorizationResult> {
    const profile = await this.authorizationGateway.bootstrap();
    const token = await this.authGateway.refreshClaims(firebaseUser);

    if (token.claims['authorized'] !== true || token.claims['role'] !== profile.rol) {
      throw {
        details: { functionalCode: 'service-unavailable' },
      } satisfies FunctionalError;
    }

    this.userState.set({
      uid: profile.uid,
      nombre: profile.nombre,
      correo: profile.correo,
      rol: profile.rol,
      activo: true,
    });
    this.errorState.set(null);
    return profile;
  }

  private clearAuthorizedState(): void {
    this.userState.set(null);
    this.firebaseAuthenticatedState.set(false);
    this.authorizationPromise = null;
    this.authorizationUid = null;
  }

  private async safeSignOut(): Promise<void> {
    try {
      await this.authGateway.signOut();
    } catch {
      // El estado local ya fue limpiado; el error funcional original tiene prioridad.
    }
  }
}
