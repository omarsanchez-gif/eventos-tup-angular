import { Routes } from '@angular/router';

import { authorizedGuard } from './core/guards/authorized.guard';
import { guestGuard } from './core/guards/guest.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/authentication/login/login').then((component) => component.Login),
    title: 'Acceso | Sistema de Eventos TUP',
  },
  {
    path: 'dashboard',
    canActivate: [authorizedGuard],
    loadComponent: () =>
      import('./layout/shell/admin-shell').then((component) => component.AdminShell),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/dashboard/temporary-dashboard/temporary-dashboard').then(
            (component) => component.TemporaryDashboard,
          ),
        title: 'Bienvenida | Sistema de Eventos TUP',
      },
    ],
  },
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: '**', redirectTo: 'dashboard' },
];
