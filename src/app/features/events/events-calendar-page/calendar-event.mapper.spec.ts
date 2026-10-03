import type { EventSummary } from '../../../shared/models/system-event';
import { toCalendarEvent } from './calendar-event.mapper';

const baseEvent: EventSummary = {
  eventId: 'event-1',
  name: 'Varios días',
  dateStart: '2026-10-12',
  timeStart: '10:00',
  dateEnd: '2026-10-15',
  timeEnd: '14:00',
  start: '2026-10-12T15:00:00.000Z',
  end: '2026-10-15T19:00:00.000Z',
  responsible: 'Omar Sánchez',
  status: 'programado',
  campusId: 'tup',
  campusName: 'Tecnológico Universitario Playacar',
  coordinationNames: [],
  equipmentCount: 0,
  creatorUid: 'user-uid',
  createdAt: '2026-10-01T14:00:00.000Z',
  protocolUrl: null,
  protocolName: null,
  calendarStatus: 'sincronizado',
  notificationStatus: 'completas',
  ownedByRequester: true,
};

describe('toCalendarEvent', () => {
  it('cubre cada fecha de un evento multidiario con final exclusivo al día siguiente', () => {
    const result = toCalendarEvent(baseEvent, 'Programado');

    expect(result).toEqual(
      expect.objectContaining({
        start: '2026-10-12',
        end: '2026-10-16',
        allDay: true,
        display: 'block',
      }),
    );
    expect(result.className).toContain('calendar-event--multiday');
    expect(result.className).toContain('calendar-event--programado');
    expect(result.color).toBe('var(--calendar-event-programado-background)');
    expect(result.contrastColor).toBe('var(--calendar-event-programado-foreground)');
    expect(result.extendedProps).toEqual(
      expect.objectContaining({
        canonicalStart: baseEvent.start,
        canonicalEnd: baseEvent.end,
      }),
    );
  });

  it('conserva los instantes exactos para un evento de una sola fecha', () => {
    const singleDay = {
      ...baseEvent,
      dateEnd: baseEvent.dateStart,
      end: '2026-10-12T19:00:00.000Z',
    };
    const result = toCalendarEvent(singleDay, 'Programado');

    expect(result).toEqual(
      expect.objectContaining({
        start: singleDay.start,
        end: singleDay.end,
        allDay: false,
        display: 'block',
      }),
    );
    expect(result.className).not.toContain('calendar-event--multiday');
  });

  it('calcula correctamente el final exclusivo al cruzar de mes', () => {
    const result = toCalendarEvent(
      { ...baseEvent, dateStart: '2026-10-30', dateEnd: '2026-10-31' },
      'Programado',
    );

    expect(result.end).toBe('2026-11-01');
  });
});
