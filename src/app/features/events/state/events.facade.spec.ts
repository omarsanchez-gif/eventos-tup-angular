import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CAMPUSES_GATEWAY, type CampusesGateway } from '../../campuses/data/campuses.gateway';
import {
  COORDINATIONS_GATEWAY,
  type CoordinationsGateway,
} from '../../coordinations/data/coordinations.gateway';
import { EQUIPMENT_GATEWAY, type EquipmentGateway } from '../../equipment/data/equipment.gateway';
import { EVENTS_GATEWAY, type EventsGateway } from '../data/events.gateway';
import { EventsFacade } from './events.facade';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

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
  calendarStatus: 'pendiente' as const,
  notificationStatus: 'pendiente' as const,
  ownedByRequester: true,
};

const detail = {
  ...summary,
  observations: '',
  coordinationIds: ['systems'],
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
        calendarStatus: 'pendiente' as const,
        notificationStatus: 'pendiente' as const,
      })),
      detail: vi.fn(async () => detail),
      update: vi.fn(async () => ({
        eventId: 'event-1',
        status: 'saved' as const,
        calendarStatus: 'sincronizado' as const,
        notificationStatus: 'completas' as const,
      })),
      cancel: vi.fn(async () => ({
        eventId: 'event-1',
        status: 'cancelled' as const,
        calendarStatus: 'retirado' as const,
        notificationStatus: 'completas' as const,
      })),
      reconcile: vi.fn(async () => ({
        calendarStatus: 'sincronizado' as const,
        notificationStatus: 'completas' as const,
      })),
      confirmCoverage: vi.fn(async () => undefined),
      confirmReception: vi.fn(async () => undefined),
      reportDelay: vi.fn(async () => undefined),
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

  it('consulta búsqueda global después del debounce y reinicia la página', async () => {
    vi.useFakeTimers();
    await facade.load();
    facade.search('omar');
    await vi.advanceTimersByTimeAsync(301);
    expect(eventsGateway.list).toHaveBeenLastCalledWith(null, 'omar');
    expect(facade.page()).toBe(1);
    facade.ngOnDestroy();
    vi.useRealTimers();
  });

  it('consulta disponibilidad sin convertir la previsualización en confirmación', async () => {
    await expect(
      facade.checkAvailability({
        eventId: 'event-1',
        campusId: 'tup',
        fechaInicio: '2026-10-06',
        horaInicio: '12:00',
        fechaFin: '2026-10-06',
        horaFin: '14:00',
        equiposSolicitados: [{ equipoId: 'speaker', cantidad: 1 }],
      }),
    ).resolves.toBe(true);
    expect(eventsGateway.checkAvailability).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: 'event-1' }),
    );
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

  afterEach(() => {
    facade.ngOnDestroy();
    vi.useRealTimers();
  });

  it.each(['listado', 'calendario'])(
    'descarta respuesta antigua de %s y conserva el resultado vigente',
    async (scope) => {
      const old = deferred<Awaited<ReturnType<EventsGateway['list']>>>();
      const latest = deferred<Awaited<ReturnType<EventsGateway['list']>>>();
      const gateway = scope === 'listado' ? eventsGateway.list : eventsGateway.listCalendar;
      vi.mocked(gateway).mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise);
      const load = () =>
        scope === 'listado' ? facade.loadRecords() : facade.loadCalendar('a', 'b', null);
      const first = load();
      const second = load();
      latest.resolve({ items: [{ ...summary, name: 'Vigente' }], nextCursor: null, serverNow: '' });
      await second;
      old.resolve({ items: [{ ...summary, name: 'Antiguo' }], nextCursor: 'old', serverNow: '' });
      await first;
      expect((scope === 'listado' ? facade.records() : facade.calendarItems())[0]?.name).toBe(
        'Vigente',
      );
      expect(facade.hasNextPage()).toBe(false);
    },
  );
  it.each(['listado', 'calendario'])(
    'ignora error anterior de %s sin finalizar la consulta vigente',
    async (scope) => {
      const old = deferred<Awaited<ReturnType<EventsGateway['list']>>>();
      const latest = deferred<Awaited<ReturnType<EventsGateway['list']>>>();
      vi.mocked(scope === 'listado' ? eventsGateway.list : eventsGateway.listCalendar)
        .mockReturnValueOnce(old.promise)
        .mockReturnValueOnce(latest.promise);
      const load = () =>
        scope === 'listado' ? facade.loadRecords() : facade.loadCalendar('a', 'b', null);
      const first = load();
      const second = load();
      old.reject(new Error('antiguo'));
      await first;
      expect(facade.error()).toBeNull();
      expect(scope === 'listado' ? facade.loading() : facade.calendarLoading()).toBe(true);
      latest.resolve({ items: [], nextCursor: null, serverNow: '' });
      await second;
    },
  );
  it.each(['a', 'nuevo'])(
    'invalida búsqueda anterior inmediatamente al escribir %s',
    async (term) => {
      vi.useFakeTimers();
      const pending = deferred<Awaited<ReturnType<EventsGateway['list']>>>();
      vi.mocked(eventsGateway.list).mockReturnValueOnce(pending.promise);
      const first = facade.loadRecords();
      facade.search(term);
      pending.resolve({ items: [summary], nextCursor: 'old', serverNow: '' });
      await first;
      expect(facade.records()).toEqual([]);
      expect(facade.hasNextPage()).toBe(false);
      expect(eventsGateway.list).toHaveBeenCalledTimes(1);
    },
  );
  it('descarta detalles anteriores y sus errores', async () => {
    const old = deferred<typeof detail>();
    const latest = deferred<typeof detail>();
    vi.mocked(eventsGateway.detail)
      .mockReturnValueOnce(old.promise)
      .mockReturnValueOnce(latest.promise);
    const first = facade.loadDetail('a');
    const second = facade.loadDetail('b');
    old.reject(new Error('old'));
    await expect(first).resolves.toBeNull();
    expect(facade.error()).toBeNull();
    expect(facade.detailLoading()).toBe(true);
    latest.resolve({ ...detail, eventId: 'b' });
    await second;
    expect(facade.detail()?.eventId).toBe('b');
  });
  it('cerrar detalle invalida su respuesta pendiente', async () => {
    const pending = deferred<typeof detail>();
    vi.mocked(eventsGateway.detail).mockReturnValueOnce(pending.promise);
    const call = facade.loadDetail('a');
    facade.clearDetail();
    pending.resolve(detail);
    await expect(call).resolves.toBeNull();
    expect(facade.detail()).toBeNull();
    expect(facade.detailLoading()).toBe(false);
  });
  it('no aplica respuestas al destruir la vista', async () => {
    const pending = deferred<Awaited<ReturnType<EventsGateway['list']>>>();
    vi.mocked(eventsGateway.list).mockReturnValueOnce(pending.promise);
    const call = facade.loadRecords();
    facade.ngOnDestroy();
    pending.resolve({ items: [summary], nextCursor: null, serverNow: '' });
    await call;
    expect(facade.records()).toEqual([]);
  });
  it('búsqueda, paginación y recarga del listado no vuelven a consultar catálogos', async () => {
    vi.useFakeTimers();
    await facade.load();
    await facade.nextPage();
    await facade.previousPage();
    facade.search('omar');
    await vi.advanceTimersByTimeAsync(301);
    await facade.loadRecords();
    for (const token of [CAMPUSES_GATEWAY, COORDINATIONS_GATEWAY, EQUIPMENT_GATEWAY]) {
      expect(TestBed.inject(token).listSelectable).toHaveBeenCalledTimes(1);
    }
    await facade.loadCatalogs(true);
    for (const token of [CAMPUSES_GATEWAY, COORDINATIONS_GATEWAY, EQUIPMENT_GATEWAY]) {
      expect(TestBed.inject(token).listSelectable).toHaveBeenCalledTimes(2);
    }
  });
  it('comparte una carga de catálogos concurrente', async () => {
    const pending = deferred<Awaited<ReturnType<CampusesGateway['listSelectable']>>>();
    const gateway = TestBed.inject(CAMPUSES_GATEWAY);
    vi.mocked(gateway.listSelectable).mockReturnValueOnce(pending.promise);
    const first = facade.loadCatalogs();
    const second = facade.loadCatalogs(true);
    expect(first).toBe(second);
    expect(gateway.listSelectable).toHaveBeenCalledTimes(1);
    pending.resolve({ items: [], total: 0 });
    await first;
  });
  it('fallo de catálogos conserva listado y permite reintento', async () => {
    const gateway = TestBed.inject(CAMPUSES_GATEWAY);
    vi.mocked(gateway.listSelectable).mockRejectedValueOnce(new Error('unavailable'));
    await facade.load();
    expect(facade.records()).toEqual([summary]);
    expect(facade.error()).not.toBeNull();
    await facade.loadCatalogs();
    expect(gateway.listSelectable).toHaveBeenCalledTimes(2);
    expect(facade.error()).toBeNull();
    expect(facade.campuses()).toHaveLength(1);
  });
});
