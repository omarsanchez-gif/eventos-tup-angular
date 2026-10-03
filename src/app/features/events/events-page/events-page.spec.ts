import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthFacade } from '../../../core/auth/auth.facade';
import type { AuthorizedUser } from '../../../shared/models/authorized-user';
import { CAMPUSES_GATEWAY, type CampusesGateway } from '../../campuses/data/campuses.gateway';
import {
  COORDINATIONS_GATEWAY,
  type CoordinationsGateway,
} from '../../coordinations/data/coordinations.gateway';
import { EQUIPMENT_GATEWAY, type EquipmentGateway } from '../../equipment/data/equipment.gateway';
import { EVENTS_GATEWAY, type EventsGateway } from '../data/events.gateway';
import { EventsPage } from './events-page';

const user = signal<AuthorizedUser | null>({
  uid: 'user-uid',
  nombre: 'Omar Sánchez',
  correo: 'omar.sanchez@tecplayacar.edu.mx',
  rol: 'usuario',
  activo: true,
});

const summary = {
  eventId: 'event-1',
  name: 'PRUEBA 1',
  dateStart: '2026-10-06',
  timeStart: '09:37',
  dateEnd: '2026-10-06',
  timeEnd: '10:00',
  start: '2026-10-06T14:37:00.000Z',
  end: '2026-10-06T15:00:00.000Z',
  responsible: 'Omar Sánchez',
  status: 'programado' as const,
  campusId: 'tup',
  campusName: 'Tecnológico Universitario Playacar',
  coordinationNames: [],
  equipmentCount: 1,
  creatorUid: 'user-uid',
  createdAt: '2026-10-01T14:00:00.000Z',
  protocolUrl: 'https://storage.test/protocolo.pdf',
  protocolName: 'protocolo.pdf',
  calendarStatus: 'sincronizado' as const,
  notificationStatus: 'completas' as const,
  ownedByRequester: true,
};

const detail = {
  ...summary,
  observations: '',
  coordinationIds: [],
  requestedEquipment: [
    {
      equipmentId: 'speaker',
      name: 'Bocina',
      quantity: 1,
      baseCampusId: 'tup',
      baseCampusName: 'Tecnológico Universitario Playacar',
      classification: 'fijo' as const,
    },
  ],
  reservations: [],
  canEdit: true,
  canCancel: true,
};

const foreignSummary = {
  ...summary,
  eventId: 'event-2',
  name: 'EVENTO AJENO',
  creatorUid: 'other-uid',
  ownedByRequester: false,
};

describe('EventsPage', () => {
  let fixture: ComponentFixture<EventsPage>;
  let eventsGateway: EventsGateway;

  beforeEach(async () => {
    user.set({
      uid: 'user-uid',
      nombre: 'Omar Sánchez',
      correo: 'omar.sanchez@tecplayacar.edu.mx',
      rol: 'usuario',
      activo: true,
    });
    eventsGateway = {
      list: vi.fn(async () => ({
        items: [summary, foreignSummary],
        nextCursor: null,
        serverNow: summary.createdAt,
      })),
      listCalendar: vi.fn(async () => ({
        items: [],
        serverNow: summary.createdAt,
      })),
      checkAvailability: vi.fn(async () => ({
        items: [
          {
            equipmentId: 'speaker',
            requested: 1,
            available: 1,
            confirmable: true,
            blockStart: summary.start,
            blockEnd: summary.end,
            requiresTransfer: false,
          },
        ],
        confirmable: true,
        checkedAt: summary.createdAt,
      })),
      uploadProtocol: vi.fn(),
      create: vi.fn(),
      detail: vi.fn(async () => detail),
      update: vi.fn(),
      cancel: vi.fn(async () => ({
        eventId: summary.eventId,
        status: 'cancelled' as const,
        calendarStatus: 'retirado' as const,
        notificationStatus: 'completas' as const,
      })),
      reconcile: vi.fn(),
      confirmCoverage: vi.fn(),
      confirmReception: vi.fn(),
      reportDelay: vi.fn(),
    };
    const campusesGateway = {
      listSelectable: vi.fn(async () => ({
        items: [
          {
            campusId: 'tup',
            nombre: 'Tecnológico Universitario Playacar',
            clave: 'TUP',
            direccion: null,
            referencia: null,
          },
        ],
        total: 1,
      })),
    } as unknown as CampusesGateway;
    const coordinationsGateway = {
      listSelectable: vi.fn(async () => ({ items: [], total: 0 })),
    } as unknown as CoordinationsGateway;
    const equipmentGateway = {
      listSelectable: vi.fn(async () => ({
        items: [
          {
            equipoId: 'speaker',
            nombre: 'Bocina',
            campusBaseId: 'tup',
            clasificacion: 'fijo',
            campusDestinoIdsPermitidos: [],
          },
        ],
        total: 1,
      })),
    } as unknown as EquipmentGateway;

    await TestBed.configureTestingModule({
      imports: [EventsPage],
      providers: [
        provideRouter([]),
        { provide: EVENTS_GATEWAY, useValue: eventsGateway },
        { provide: CAMPUSES_GATEWAY, useValue: campusesGateway },
        { provide: COORDINATIONS_GATEWAY, useValue: coordinationsGateway },
        { provide: EQUIPMENT_GATEWAY, useValue: equipmentGateway },
        { provide: AuthFacade, useValue: { user: user.asReadonly() } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(EventsPage);
    fixture.detectChanges();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect((fixture.nativeElement as HTMLElement).textContent).toContain('PRUEBA 1');
    });
  });

  it('muestra acciones directas solo para el creador y oculta Integración al usuario', () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('th')?.closest('table')?.textContent).not.toContain('Integración');
    expect(element.textContent).not.toContain('Calendar: Sincronizado');
    expect(element.querySelector('button[aria-label="Editar evento PRUEBA 1"]')).not.toBeNull();
    expect(element.querySelector('button[aria-label="Cancelar evento PRUEBA 1"]')).not.toBeNull();
    expect(element.querySelector('button[aria-label="Editar evento EVENTO AJENO"]')).toBeNull();
    expect(element.querySelector('button[aria-label="Cancelar evento EVENTO AJENO"]')).toBeNull();
  });

  it('muestra la columna Integración solamente al administrador', () => {
    user.update((current) => (current ? { ...current, rol: 'admin' } : current));
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(
      Array.from(element.querySelectorAll('th')).some((cell) => cell.textContent === 'Integración'),
    ).toBe(true);
    expect(element.textContent).toContain('Calendar: Sincronizado');
    expect(element.textContent).toContain('Correo: Completas');
  });

  it('abre la edición directamente desde el listado', async () => {
    const element = fixture.nativeElement as HTMLElement;
    element
      .querySelector<HTMLButtonElement>('button[aria-label="Editar evento PRUEBA 1"]')
      ?.click();

    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(eventsGateway.detail).toHaveBeenCalledWith('event-1');
      expect(element.querySelector('#event-dialog-title')?.textContent?.trim()).toBe(
        'Editar evento',
      );
    });
  });

  it('confirma la cancelación histórica directamente desde el listado', async () => {
    const element = fixture.nativeElement as HTMLElement;
    element
      .querySelector<HTMLButtonElement>('button[aria-label="Cancelar evento PRUEBA 1"]')
      ?.click();
    fixture.detectChanges();

    expect(element.querySelector('#list-cancel-event-title')?.textContent).toContain(
      'Cancelar evento',
    );
    expect(element.textContent).toContain('No se eliminará el registro');

    Array.from(element.querySelectorAll('button'))
      .find((button) => button.textContent?.trim() === 'Confirmar cancelación')
      ?.click();

    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(eventsGateway.cancel).toHaveBeenCalledWith('event-1');
      expect(element.querySelector('#list-cancel-event-title')).toBeNull();
    });
  });

  it('incluye el eventId al previsualizar los equipos existentes de una edición', async () => {
    const element = fixture.nativeElement as HTMLElement;
    element
      .querySelector<HTMLButtonElement>('button[aria-label="Ver detalle de PRUEBA 1"]')
      ?.click();
    fixture.detectChanges();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(
        Array.from(element.querySelectorAll('button')).some(
          (button) => button.textContent?.trim() === 'Editar',
        ),
      ).toBe(true);
    });

    Array.from(element.querySelectorAll('button'))
      .find((button) => button.textContent?.trim() === 'Editar')
      ?.click();
    fixture.detectChanges();

    await vi.waitFor(() => {
      expect(eventsGateway.checkAvailability).toHaveBeenCalledWith(
        expect.objectContaining({
          eventId: 'event-1',
          equiposSolicitados: [{ equipoId: 'speaker', cantidad: 1 }],
        }),
      );
    });
  });

  it('actualiza y anuncia la disponibilidad al recuperar el foco sin cambiar la cantidad', async () => {
    const element = fixture.nativeElement as HTMLElement;
    element
      .querySelector<HTMLButtonElement>('button[aria-label="Ver detalle de PRUEBA 1"]')
      ?.click();
    fixture.detectChanges();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(
        Array.from(element.querySelectorAll('button')).some(
          (button) => button.textContent?.trim() === 'Editar',
        ),
      ).toBe(true);
    });
    Array.from(element.querySelectorAll('button'))
      .find((button) => button.textContent?.trim() === 'Editar')
      ?.click();
    fixture.detectChanges();
    await vi.waitFor(() => expect(eventsGateway.checkAvailability).toHaveBeenCalledTimes(1));

    vi.mocked(eventsGateway.checkAvailability).mockResolvedValueOnce({
      items: [
        {
          equipmentId: 'speaker',
          requested: 1,
          available: 0,
          confirmable: false,
          blockStart: summary.start,
          blockEnd: summary.end,
          requiresTransfer: false,
        },
      ],
      confirmable: false,
      checkedAt: '2026-10-01T15:00:00.000Z',
    });

    window.dispatchEvent(new Event('focus'));
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(eventsGateway.checkAvailability).toHaveBeenCalledTimes(2);
      expect(element.textContent).toContain('Disponibles: 0');
      expect(element.textContent).toContain('La disponibilidad cambió por otra reservación.');
    });
    expect(element.querySelector<HTMLInputElement>('input[type="number"]')?.value).toBe('1');
  });
});
