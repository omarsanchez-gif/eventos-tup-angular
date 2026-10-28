import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EventClickInfo } from 'fullcalendar';
import type { EventDetail, EventSummary } from '../../../shared/models/system-event';
import { EventsFacade } from '../state/events.facade';
import { EventsCalendarPage } from './events-calendar-page';

describe('EventsCalendarPage: respuestas del detalle', () => {
  let page: EventsCalendarPage;
  let responses: ((detail: EventDetail) => void)[];
  let facade: {
    calendarItems: ReturnType<typeof signal<readonly EventSummary[]>>;
    loadDetail: ReturnType<typeof vi.fn>;
    clearDetail: ReturnType<typeof vi.fn>;
    loadCatalogs: ReturnType<typeof vi.fn>;
  };
  const event = (id: string) =>
    ({
      eventId: id,
      name: id,
      status: 'programado',
      dateStart: '2026-10-06',
      dateEnd: '2026-10-06',
      timeStart: '12:00',
      timeEnd: '14:00',
      campusName: 'TUP',
    }) as EventSummary;
  const detail = (id: string, name = id) => ({ ...event(id), name }) as EventDetail;
  function click(id: string) {
    page['eventClicked']({ event: { id } } as EventClickInfo);
  }

  beforeEach(() => {
    responses = [];
    facade = {
      calendarItems: signal([event('a'), event('b')]),
      loadDetail: vi.fn(() => new Promise<EventDetail>((resolve) => responses.push(resolve))),
      clearDetail: vi.fn(),
      loadCatalogs: vi.fn(),
    };
    TestBed.configureTestingModule({ providers: [{ provide: EventsFacade, useValue: facade }] });
    page = TestBed.runInInjectionContext(() => new EventsCalendarPage());
  });
  it.each(['cerrar', 'destruir'])('no reabre después de %s', async (action) => {
    click('a');
    if (action === 'cerrar') page['closeDetail']();
    else page.ngOnDestroy();
    responses[0](detail('a'));
    await Promise.resolve();
    expect(page['selectedEvent']()).toBeNull();
  });
  it('una respuesta antigua no sustituye otro evento seleccionado', async () => {
    click('a');
    click('b');
    responses[1](detail('b'));
    await Promise.resolve();
    responses[0](detail('a'));
    await Promise.resolve();
    expect(page['selectedEvent']()?.eventId).toBe('b');
  });
  it('reabrir el mismo evento conserva la petición nueva', async () => {
    click('a');
    page['closeDetail']();
    click('a');
    responses[1](detail('a', 'nuevo'));
    await Promise.resolve();
    responses[0](detail('a', 'antiguo'));
    await Promise.resolve();
    expect(page['selectedEvent']()?.name).toBe('nuevo');
  });
  it('teclado usa la misma invalidación al cerrar', async () => {
    const el = document.createElement('div');
    page['decorateEvent']({ event: { id: 'a' }, el });
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(facade.loadDetail).toHaveBeenCalledWith('a');
    page['closeDetail']();
    responses[0](detail('a'));
    await Promise.resolve();
    expect(page['selectedEvent']()).toBeNull();
  });
  it('inicializar calendario carga catálogos sin consultar listado', () => {
    page.ngOnInit();
    expect(facade.loadCatalogs).toHaveBeenCalledOnce();
  });
});
