import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';
import { connectStorageEmulator, getStorage } from 'firebase/storage';

import { environment } from '../../../environments/environment';
import { FirebaseAuthGateway } from '../auth/firebase-auth.gateway';
import { FirebaseAuthorizationGateway } from '../auth/firebase-authorization.gateway';
import { AUTH_GATEWAY, AUTHORIZATION_GATEWAY } from '../auth/gateways';
import {
  FIREBASE_APP,
  FIREBASE_AUTH,
  FIREBASE_FUNCTIONS,
  FIREBASE_STORAGE,
} from './firebase.tokens';

export function provideFirebase(): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: FIREBASE_APP,
      useFactory: () => (getApps().length > 0 ? getApp() : initializeApp(environment.firebase)),
    },
    {
      provide: FIREBASE_AUTH,
      deps: [FIREBASE_APP],
      useFactory: () => {
        const auth = getAuth();

        if (environment.useEmulators) {
          connectAuthEmulator(
            auth,
            `http://${environment.emulators.auth.host}:${environment.emulators.auth.port}`,
            { disableWarnings: true },
          );
        }

        return auth;
      },
    },
    {
      provide: FIREBASE_FUNCTIONS,
      deps: [FIREBASE_APP],
      useFactory: () => {
        const functions = getFunctions();

        if (environment.useEmulators) {
          connectFunctionsEmulator(
            functions,
            environment.emulators.functions.host,
            environment.emulators.functions.port,
          );
        }

        return functions;
      },
    },
    {
      provide: FIREBASE_STORAGE,
      deps: [FIREBASE_APP],
      useFactory: () => {
        const storage = getStorage();
        if (environment.useEmulators) {
          connectStorageEmulator(
            storage,
            environment.emulators.storage.host,
            environment.emulators.storage.port,
          );
        }
        return storage;
      },
    },
    FirebaseAuthGateway,
    FirebaseAuthorizationGateway,
    { provide: AUTH_GATEWAY, useExisting: FirebaseAuthGateway },
    {
      provide: AUTHORIZATION_GATEWAY,
      useExisting: FirebaseAuthorizationGateway,
    },
  ]);
}
