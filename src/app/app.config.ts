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
import { CAMPUSES_GATEWAY } from './features/campuses/data/campuses.gateway';
import { FirebaseCampusesGateway } from './features/campuses/data/firebase-campuses.gateway';
import { COORDINATIONS_GATEWAY } from './features/coordinations/data/coordinations.gateway';
import { FirebaseCoordinationsGateway } from './features/coordinations/data/firebase-coordinations.gateway';
import { EQUIPMENT_GATEWAY } from './features/equipment/data/equipment.gateway';
import { FirebaseEquipmentGateway } from './features/equipment/data/firebase-equipment.gateway';
import { EVENTS_GATEWAY } from './features/events/data/events.gateway';
import { FirebaseEventsGateway } from './features/events/data/firebase-events.gateway';
import { FirebaseUsersGateway } from './features/users/data/firebase-users.gateway';
import { USERS_GATEWAY } from './features/users/data/users.gateway';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideFirebase(),
    FirebaseCampusesGateway,
    { provide: CAMPUSES_GATEWAY, useExisting: FirebaseCampusesGateway },
    FirebaseCoordinationsGateway,
    {
      provide: COORDINATIONS_GATEWAY,
      useExisting: FirebaseCoordinationsGateway,
    },
    FirebaseEquipmentGateway,
    { provide: EQUIPMENT_GATEWAY, useExisting: FirebaseEquipmentGateway },
    FirebaseEventsGateway,
    { provide: EVENTS_GATEWAY, useExisting: FirebaseEventsGateway },
    FirebaseUsersGateway,
    { provide: USERS_GATEWAY, useExisting: FirebaseUsersGateway },
    provideAppInitializer(() => inject(AuthFacade).initialize()),
  ],
};
