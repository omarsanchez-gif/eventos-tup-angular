export const INSTITUTIONAL_TIME_ZONE = 'America/Cancun';

export type WeekdayKey =
  'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo';

export interface OperatingDay {
  readonly operativo: boolean;
  readonly inicio: string | null;
  readonly fin: string | null;
}

export type OperatingSchedule = Readonly<Record<WeekdayKey, OperatingDay>>;

export interface EventWindow {
  readonly start: Date;
  readonly end: Date;
  readonly operationalDateCount: number;
}

export interface EquipmentBlockWindow {
  readonly start: Date;
  readonly end: Date;
  readonly departure: Date | null;
  readonly returnStart: Date | null;
  readonly release: Date;
  readonly requiresTransfer: boolean;
  readonly systemsCoverage: 'no_requerida' | 'pendiente';
}

export class EventTimeError extends Error {
  constructor(
    readonly code:
      | 'invalid-date-range'
      | 'event-advance-required'
      | 'event-duration-exceeded'
      | 'event-on-sunday'
      | 'equipment-cutoff-missed'
      | 'invalid-campus-schedule',
    message: string,
  ) {
    super(message);
    this.name = 'EventTimeError';
  }
}

const weekdayKeys: readonly WeekdayKey[] = [
  'domingo',
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado',
];

const datePattern = /^(\d{4})-(\d{2})-(\d{2})$/u;
const timePattern = /^(\d{2}):(\d{2})$/u;
const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: INSTITUTIONAL_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

interface LocalParts {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
}

function numberPart(parts: readonly Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) {
  const value = parts.find((part) => part.type === type)?.value;
  return value ? Number(value) : Number.NaN;
}

function localParts(value: Date): LocalParts {
  const parts = formatter.formatToParts(value);
  return {
    year: numberPart(parts, 'year'),
    month: numberPart(parts, 'month'),
    day: numberPart(parts, 'day'),
    hour: numberPart(parts, 'hour'),
    minute: numberPart(parts, 'minute'),
    second: numberPart(parts, 'second'),
  };
}

function parseDate(value: string): Pick<LocalParts, 'year' | 'month' | 'day'> {
  const match = datePattern.exec(value);
  if (!match) {
    throw new EventTimeError('invalid-date-range', 'La fecha no es válida.');
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    throw new EventTimeError('invalid-date-range', 'La fecha no es válida.');
  }
  return { year, month, day };
}

function parseTime(value: string): Pick<LocalParts, 'hour' | 'minute'> {
  const match = timePattern.exec(value);
  if (!match) {
    throw new EventTimeError('invalid-date-range', 'La hora no es válida.');
  }
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) {
    throw new EventTimeError('invalid-date-range', 'La hora no es válida.');
  }
  return { hour, minute };
}

export function localDateTime(date: string, time: string): Date {
  const dateParts = parseDate(date);
  const timeParts = parseTime(time);
  const desired: LocalParts = { ...dateParts, ...timeParts, second: 0 };
  const wallClockUtc = Date.UTC(
    desired.year,
    desired.month - 1,
    desired.day,
    desired.hour,
    desired.minute,
  );
  let instant = wallClockUtc;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const represented = localParts(new Date(instant));
    const representedUtc = Date.UTC(
      represented.year,
      represented.month - 1,
      represented.day,
      represented.hour,
      represented.minute,
      represented.second,
    );
    instant += wallClockUtc - representedUtc;
  }
  const result = new Date(instant);
  const verified = localParts(result);
  if (
    verified.year !== desired.year ||
    verified.month !== desired.month ||
    verified.day !== desired.day ||
    verified.hour !== desired.hour ||
    verified.minute !== desired.minute
  ) {
    throw new EventTimeError('invalid-date-range', 'La fecha y hora no existen en la zona local.');
  }
  return result;
}

export function localDate(value: Date): string {
  const parts = localParts(value);
  return `${String(parts.year).padStart(4, '0')}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

function dateOrdinal(value: string): number {
  const parts = parseDate(value);
  return Math.trunc(Date.UTC(parts.year, parts.month - 1, parts.day) / 86_400_000);
}

function addCalendarDays(value: string, amount: number): string {
  const parts = parseDate(value);
  const result = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + amount));
  return `${String(result.getUTCFullYear()).padStart(4, '0')}-${String(result.getUTCMonth() + 1).padStart(2, '0')}-${String(result.getUTCDate()).padStart(2, '0')}`;
}

function weekday(value: string): WeekdayKey {
  const parts = parseDate(value);
  const index = new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
  return weekdayKeys[index] ?? 'domingo';
}

function eachDate(start: string, end: string): readonly string[] {
  const count = dateOrdinal(end) - dateOrdinal(start);
  if (count < 0 || count > 31) {
    throw new EventTimeError('invalid-date-range', 'El intervalo del evento no es válido.');
  }
  return Array.from({ length: count + 1 }, (_, index) => addCalendarDays(start, index));
}

export function validateEventWindow(
  dateStart: string,
  timeStart: string,
  dateEnd: string,
  timeEnd: string,
  now: Date,
): EventWindow {
  const start = localDateTime(dateStart, timeStart);
  const end = localDateTime(dateEnd, timeEnd);
  if (end.getTime() <= start.getTime()) {
    throw new EventTimeError('invalid-date-range', 'El fin debe ser posterior al inicio.');
  }
  if (dateOrdinal(dateStart) - dateOrdinal(localDate(now)) < 5) {
    throw new EventTimeError(
      'event-advance-required',
      'El evento debe registrarse con cinco fechas naturales de anticipación.',
    );
  }
  const dates = eachDate(dateStart, dateEnd);
  if (dates.some((date) => weekday(date) === 'domingo')) {
    throw new EventTimeError('event-on-sunday', 'Los eventos no pueden transcurrir en domingo.');
  }
  if (dates.length > 6) {
    throw new EventTimeError(
      'event-duration-exceeded',
      'El evento admite como máximo seis fechas operativas.',
    );
  }
  return { start, end, operationalDateCount: dates.length };
}

function minutes(value: string): number {
  const parts = parseTime(value);
  return parts.hour * 60 + parts.minute;
}

function addMinutes(value: Date, amount: number): Date {
  return new Date(value.getTime() + amount * 60_000);
}

function daySchedule(schedule: OperatingSchedule, date: string): OperatingDay {
  return schedule[weekday(date)];
}

function requiresCoverage(
  schedule: OperatingSchedule,
  startDate: string,
  startTime: string,
  endDate: string,
  endTime: string,
): boolean {
  const dates = eachDate(startDate, endDate);
  return dates.some((date, index) => {
    const day = daySchedule(schedule, date);
    if (!day.operativo || !day.inicio || !day.fin) return true;
    const firstTime = index === 0 ? startTime : day.inicio;
    const lastTime = index === dates.length - 1 ? endTime : day.fin;
    return minutes(firstTime) < minutes(day.inicio) || minutes(lastTime) > minutes(day.fin);
  });
}

function findDeparture(
  startDate: string,
  origin: OperatingSchedule,
  destination: OperatingSchedule,
  departureTime: string,
  travelMinutes: number,
): Date {
  for (let offset = 1; offset <= 14; offset += 1) {
    const date = addCalendarDays(startDate, -offset);
    const originDay = daySchedule(origin, date);
    const destinationDay = daySchedule(destination, date);
    if (
      !originDay.operativo ||
      !originDay.inicio ||
      !originDay.fin ||
      !destinationDay.operativo ||
      !destinationDay.inicio ||
      !destinationDay.fin
    ) {
      continue;
    }
    const departureMinute = minutes(departureTime);
    if (
      departureMinute >= minutes(originDay.inicio) &&
      departureMinute <= minutes(originDay.fin) &&
      departureMinute + travelMinutes <= minutes(destinationDay.fin)
    ) {
      return localDateTime(date, departureTime);
    }
  }
  throw new EventTimeError(
    'invalid-campus-schedule',
    'No existe una ventana operativa para trasladar el equipo.',
  );
}

function findReturnStart(
  endDate: string,
  readyAt: Date,
  origin: OperatingSchedule,
  destination: OperatingSchedule,
  travelMinutes: number,
): Date {
  for (let offset = 0; offset <= 14; offset += 1) {
    const date = addCalendarDays(endDate, offset);
    const originDay = daySchedule(origin, date);
    const destinationDay = daySchedule(destination, date);
    if (
      !originDay.operativo ||
      !originDay.inicio ||
      !originDay.fin ||
      !destinationDay.operativo ||
      !destinationDay.fin
    ) {
      continue;
    }
    const candidate = localDateTime(date, destinationDay.fin);
    const arrivalMinute = minutes(destinationDay.fin) + travelMinutes;
    if (candidate.getTime() >= readyAt.getTime() && arrivalMinute <= minutes(originDay.fin)) {
      return candidate;
    }
  }
  throw new EventTimeError(
    'invalid-campus-schedule',
    'No existe una ventana operativa para regresar el equipo.',
  );
}

export function calculateEquipmentBlock(input: {
  readonly event: EventWindow;
  readonly dateStart: string;
  readonly timeStart: string;
  readonly dateEnd: string;
  readonly timeEnd: string;
  readonly now: Date;
  readonly requiresTransfer: boolean;
  readonly eventCampusSchedule: OperatingSchedule;
  readonly baseCampusSchedule: OperatingSchedule;
  readonly setupMinutes: number;
  readonly teardownMinutes: number;
  readonly departureTime: string;
  readonly travelMinutes: number;
  readonly returnReleaseMinutes: number;
}): EquipmentBlockWindow {
  const coverage = requiresCoverage(
    input.eventCampusSchedule,
    input.dateStart,
    input.timeStart,
    input.dateEnd,
    input.timeEnd,
  )
    ? 'pendiente'
    : 'no_requerida';
  if (!input.requiresTransfer) {
    const start = addMinutes(input.event.start, -input.setupMinutes);
    const release = addMinutes(input.event.end, input.teardownMinutes);
    return {
      start,
      end: release,
      departure: null,
      returnStart: null,
      release,
      requiresTransfer: false,
      systemsCoverage: coverage,
    };
  }
  const departure = findDeparture(
    input.dateStart,
    input.baseCampusSchedule,
    input.eventCampusSchedule,
    input.departureTime,
    input.travelMinutes,
  );
  if (input.now.getTime() > departure.getTime()) {
    throw new EventTimeError(
      'equipment-cutoff-missed',
      'Ya pasó el corte para trasladar este equipo.',
    );
  }
  const readyAt = addMinutes(input.event.end, input.teardownMinutes);
  const returnStart = findReturnStart(
    input.dateEnd,
    readyAt,
    input.baseCampusSchedule,
    input.eventCampusSchedule,
    input.travelMinutes,
  );
  const release = addMinutes(returnStart, input.returnReleaseMinutes);
  return {
    start: departure,
    end: release,
    departure,
    returnStart,
    release,
    requiresTransfer: true,
    systemsCoverage: coverage,
  };
}

export function scheduleFromUnknown(value: unknown): OperatingSchedule {
  const source = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const result = {} as Record<WeekdayKey, OperatingDay>;
  for (const key of weekdayKeys) {
    const item =
      source[key] && typeof source[key] === 'object'
        ? (source[key] as Record<string, unknown>)
        : {};
    result[key] = {
      operativo: item['operativo'] === true,
      inicio: typeof item['inicio'] === 'string' ? item['inicio'] : null,
      fin: typeof item['fin'] === 'string' ? item['fin'] : null,
    };
  }
  return result;
}
