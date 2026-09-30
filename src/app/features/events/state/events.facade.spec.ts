import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CAMPUSES_GATEWAY, type CampusesGateway } from '../../campuses/data/campuses.gateway';
import {
  COORDINATIONS_GATEWAY,
  type CoordinationsGateway,
} from '../../coordinations/data/coordinations.gateway';
import { EQUIPMENT_GATEWAY, type EquipmentGateway } from '../../equipment/data/equipment.gateway';
import { EVENTS_GATEWAY, type EventsGateway } from '../data/events.gateway';
import { EventsFacade } from './events.facade';

const summary = {
  eventId: 'event-1',
  name: 'Ceremonia',
  dateStart: '2026-10-06',
  timeStart: '12:00',
  dateEnd: '2026-10-06',
  timeEnd: '14:00',
  start: '2026-10-06T17:00:00.000Z',
  end: '2026-10-06T19:00:00.000Z',
  responsible: 'Omar Sánchez',
  status: 'programado' as const,
  campusId: 'tup',
  campusName: 'Tecnológico Universitario Playacar',
  coordinationNames: ['Sistemas'],
  equipmentCount: 1,
  creatorUid: 'user-uid',
  createdAt: '2026-09-30T17:00:00.000Z',
  protocolUrl: 'https://storage.test/protocol.pdf',
  protocolName: 'protocol.pdf',
  calendarStatus: 'pending' as const,
};

describe('EventsFacade', () => {
  let facade: EventsFacade;
  let eventsGateway: EventsGateway;

  beforeEach(() => {
    eventsGateway = {
      list: vi.fn(async () => ({ items: [summary], nextCursor: 'next', serverNow: '' })),
      listCalendar: vi.fn(async () => ({ items: [summary], serverNow: '' })),
      checkAvailability: vi.fn(async () => ({
        items: [
          {
            equipmentId: 'speaker',
            requested: 1,
            available: 2,
            confirmable: true,
            blockStart: summary.start!,
            blockEnd: summary.end!,
            requiresTransfer: false,
          },
        ],
        confirmable: true,
        checkedAt: '',
      })),
      uploadProtocol: vi.fn(async () => 'https://storage.test/protocol.pdf'),
      create: vi.fn(async () => ({
        eventId: 'event-2',
        status: 'saved' as const,
        calendarStatus: 'pending' as const,
        notificationStatus: 'pending' as const,
      })),
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
      listSelectable: vi.fn(async () => ({
        items: [{ coordinacionId: 'systems', nombre: 'Sistemas' }],
        total: 1,
      })),
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
    TestBed.configureTestingModule({
      providers: [
        EventsFacade,
        { provide: EVENTS_GATEWAY, useValue: eventsGateway },
        { provide: CAMPUSES_GATEWAY, useValue: campusesGateway },
        { provide: COORDINATIONS_GATEWAY, useValue: coordinationsGateway },
        { provide: EQUIPMENT_GATEWAY, useValue: equipmentGateway },
      ],
    });
    facade = TestBed.inject(EventsFacade);
  });

  it('carga página y catálogos sanitizados', async () => {
    await facade.load();
    expect(facade.records()).toEqual([summary]);
    expect(facade.campuses()[0]?.clave).toBe('TUP');
    expect(facade.coordinations()[0]?.nombre).toBe('Sistemas');
    expect(facade.equipment()[0]?.nombre).toBe('Bocina');
    expect(facade.hasNextPage()).toBe(true);
  });

  it('filtra instantáneamente la página visible', async () => {
    await facade.load();
    facade.search('omar');
    expect(facade.filteredRecords()).toHaveLength(1);
    facade.search('sin coincidencia');
    expect(facade.filteredRecords()).toHaveLength(0);
  });

  it('consulta disponibilidad sin convertir la previsualización en confirmación', async () => {
    await expect(
      facade.checkAvailability({
        campusId: 'tup',
        fechaInicio: '2026-10-06',
        horaInicio: '12:00',
        fechaFin: '2026-10-06',
        horaFin: '14:00',
        equiposSolicitados: [{ equipoId: 'speaker', cantidad: 1 }],
      }),
    ).resolves.toBe(true);
    expect(facade.availability()?.items[0]?.available).toBe(2);
  });

  it('carga PDF antes de invocar la creación y refresca la primera página', async () => {
    await facade.load();
    const file = new File(['pdf'], 'protocol.pdf', { type: 'application/pdf' });
    await expect(
      facade.create(
        {
          nombreEvento: 'Ceremonia',
          campusId: 'tup',
          fechaInicio: '2026-10-06',
          horaInicio: '12:00',
          fechaFin: '2026-10-06',
          horaFin: '14:00',
          observaciones: '',
          coordinacionIds: [],
          equiposSolicitados: [],
        },
        file,
      ),
    ).resolves.toBe(true);
    expect(eventsGateway.uploadProtocol).toHaveBeenCalledWith(file, '2026');
    expect(eventsGateway.create).toHaveBeenCalledWith(
      expect.objectContaining({
        protocoloUrl: 'https://storage.test/protocol.pdf',
        protocoloNombre: 'protocol.pdf',
      }),
    );
    expect(facade.notice()).toContain('Evento guardado');
  });

  it('consulta únicamente el intervalo visible del calendario', async () => {
    await facade.loadCalendar('2026-10-01T05:00:00.000Z', '2026-11-01T05:00:00.000Z', 'tup');
    expect(eventsGateway.listCalendar).toHaveBeenCalledWith({
      inicio: '2026-10-01T05:00:00.000Z',
      fin: '2026-11-01T05:00:00.000Z',
      campusId: 'tup',
    });
    expect(facade.calendarItems()).toEqual([summary]);
  });

  it('actualiza el estado temporal al cruzar inicio y fin usando la hora del servidor', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-06T16:59:00.000Z'));
    vi.mocked(eventsGateway.list).mockResolvedValue({
      items: [summary],
      nextCursor: null,
      serverNow: '2026-10-06T16:59:00.000Z',
    });
    try {
      await facade.load();
      expect(facade.records()[0]?.status).toBe('programado');

      await vi.advanceTimersByTimeAsync(60_001);
      expect(facade.records()[0]?.status).toBe('en_ejecucion');

      await vi.advanceTimersByTimeAsync(7_200_000);
      expect(facade.records()[0]?.status).toBe('finalizado');
    } finally {
      facade.ngOnDestroy();
      vi.useRealTimers();
    }
  });
});
