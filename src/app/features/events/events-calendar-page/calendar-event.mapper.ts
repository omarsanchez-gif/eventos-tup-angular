import type { EventInput } from 'fullcalendar';

import type { EventSummary } from '../../../shared/models/system-event';

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/u;

function followingDate(value: string): string {
  const match = ISO_DATE.exec(value);
  if (!match) return value;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

export function toCalendarEvent(item: EventSummary, statusLabel: string): EventInput {
  const spansMultipleDates =
    Boolean(item.dateStart) && Boolean(item.dateEnd) && item.dateStart !== item.dateEnd;
  const statusClass = `calendar-event--${item.status}`;

  return {
    id: item.eventId,
    title: `${item.name} · ${statusLabel}`,
    start: spansMultipleDates ? item.dateStart : (item.start ?? undefined),
    end: spansMultipleDates ? followingDate(item.dateEnd) : (item.end ?? undefined),
    allDay: spansMultipleDates,
    display: 'block',
    color: `var(--calendar-event-${item.status}-background)`,
    contrastColor: `var(--calendar-event-${item.status}-foreground)`,
    className: [
      'calendar-event',
      statusClass,
      ...(spansMultipleDates ? ['calendar-event--multiday'] : []),
    ].join(' '),
    extendedProps: {
      campus: item.campusName,
      status: item.status,
      canonicalStart: item.start,
      canonicalEnd: item.end,
    },
  };
}
