import { Routes } from '@angular/router';

import { adminGuard } from './core/guards/admin.guard';
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
    path: '',
    canActivate: [authorizedGuard],
    loadComponent: () =>
      import('./layout/shell/admin-shell').then((component) => component.AdminShell),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard-page/dashboard-page').then(
            (component) => component.DashboardPage,
          ),
        title: 'Dashboard | Sistema de Eventos TUP',
      },
      {
        path: 'eventos',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/events/events-page/events-page').then(
                (component) => component.EventsPage,
              ),
            title: 'Eventos | Sistema de Eventos TUP',
          },
          {
            path: 'calendario',
            loadComponent: () =>
              import('./features/events/events-calendar-page/events-calendar-page').then(
                (component) => component.EventsCalendarPage,
              ),
            title: 'Calendario | Sistema de Eventos TUP',
          },
        ],
      },
      {
        path: 'campus',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/campuses/campuses-page/campuses-page').then(
            (component) => component.CampusesPage,
          ),
        title: 'Campus | Sistema de Eventos TUP',
      },
      {
        path: 'coordinaciones',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/coordinations/coordinations-page/coordinations-page').then(
            (component) => component.CoordinationsPage,
          ),
        title: 'Coordinaciones | Sistema de Eventos TUP',
      },
      {
        path: 'equipos',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/equipment/equipment-page/equipment-page').then(
            (component) => component.EquipmentPage,
          ),
        title: 'Equipos | Sistema de Eventos TUP',
      },
      {
        path: 'usuarios',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/users/users-page/users-page').then((component) => component.UsersPage),
        title: 'Usuarios | Sistema de Eventos TUP',
      },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
