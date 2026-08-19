import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { AuthFacade } from './core/auth/auth.facade';
import { provideFirebase } from './core/firebase/firebase.providers';
import { COORDINATIONS_GATEWAY } from './features/coordinations/data/coordinations.gateway';
import { FirebaseCoordinationsGateway } from './features/coordinations/data/firebase-coordinations.gateway';
import { FirebaseUsersGateway } from './features/users/data/firebase-users.gateway';
import { USERS_GATEWAY } from './features/users/data/users.gateway';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideFirebase(),
    FirebaseCoordinationsGateway,
    {
      provide: COORDINATIONS_GATEWAY,
      useExisting: FirebaseCoordinationsGateway,
    },
    FirebaseUsersGateway,
    { provide: USERS_GATEWAY, useExisting: FirebaseUsersGateway },
    provideAppInitializer(() => inject(AuthFacade).initialize()),
  ],
};
