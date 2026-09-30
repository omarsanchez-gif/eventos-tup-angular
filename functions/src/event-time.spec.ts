import { describe, expect, it } from 'vitest';

import {
  calculateEquipmentBlock,
  EventTimeError,
  localDateTime,
  validateEventWindow,
  type OperatingSchedule,
} from './event-time.js';

function schedule(
  weekdayStart: string,
  weekdayEnd: string,
  saturdayEnd: string,
): OperatingSchedule {
  const weekday = { operativo: true, inicio: weekdayStart, fin: weekdayEnd } as const;
  return {
    lunes: weekday,
    martes: weekday,
    miercoles: weekday,
    jueves: weekday,
    viernes: weekday,
    sabado: { operativo: true, inicio: weekdayStart, fin: saturdayEnd },
    domingo: { operativo: false, inicio: null, fin: null },
  };
}

const tup = schedule('08:00', '20:00', '18:00');
const fcs = schedule('09:00', '18:00', '14:00');
const now = new Date('2026-09-30T12:00:00-05:00');

function code(error: unknown): string | undefined {
  return error instanceof EventTimeError ? error.code : undefined;
}

describe('cálculo temporal de Eventos', () => {
  it('acepta exactamente cinco fechas naturales de anticipación', () => {
    const result = validateEventWindow('2026-10-05', '12:00', '2026-10-05', '14:00', now);
    expect(result.start.toISOString()).toBe('2026-10-05T17:00:00.000Z');
    expect(result.end.toISOString()).toBe('2026-10-05T19:00:00.000Z');
  });

  it('rechaza cuatro fechas naturales de anticipación', () => {
    expect(() =>
      validateEventWindow('2026-10-04', '12:00', '2026-10-04', '14:00', now),
    ).toThrowError(expect.objectContaining({ code: 'event-advance-required' }));
  });

  it('rechaza eventos que tocan domingo y más de seis fechas', () => {
    expect(() =>
      validateEventWindow('2026-10-10', '10:00', '2026-10-11', '12:00', now),
    ).toThrowError(expect.objectContaining({ code: 'event-on-sunday' }));
    try {
      validateEventWindow('2026-10-05', '10:00', '2026-10-11', '12:00', now);
    } catch (error) {
      expect(['event-on-sunday', 'event-duration-exceeded']).toContain(code(error));
    }
  });

  it('bloquea montaje y desmontaje de equipo local', () => {
    const event = validateEventWindow('2026-10-06', '12:00', '2026-10-06', '14:00', now);
    const block = calculateEquipmentBlock({
      event,
      dateStart: '2026-10-06',
      timeStart: '12:00',
      dateEnd: '2026-10-06',
      timeEnd: '14:00',
      now,
      requiresTransfer: false,
      eventCampusSchedule: tup,
      baseCampusSchedule: tup,
      setupMinutes: 60,
      teardownMinutes: 30,
      departureTime: '17:00',
      travelMinutes: 30,
      returnReleaseMinutes: 60,
    });
    expect(block.start).toEqual(localDateTime('2026-10-06', '11:00'));
    expect(block.end).toEqual(localDateTime('2026-10-06', '14:30'));
    expect(block.systemsCoverage).toBe('no_requerida');
  });

  it('reserva traslado desde las 17:00 del día operativo anterior y libera una hora después del regreso', () => {
    const event = validateEventWindow('2026-10-06', '10:00', '2026-10-06', '14:00', now);
    const block = calculateEquipmentBlock({
      event,
      dateStart: '2026-10-06',
      timeStart: '10:00',
      dateEnd: '2026-10-06',
      timeEnd: '14:00',
      now,
      requiresTransfer: true,
      eventCampusSchedule: fcs,
      baseCampusSchedule: tup,
      setupMinutes: 60,
      teardownMinutes: 30,
      departureTime: '17:00',
      travelMinutes: 30,
      returnReleaseMinutes: 60,
    });
    expect(block.departure).toEqual(localDateTime('2026-10-05', '17:00'));
    expect(block.returnStart).toEqual(localDateTime('2026-10-06', '18:00'));
    expect(block.release).toEqual(localDateTime('2026-10-06', '19:00'));
  });

  it('mantiene bloqueado hasta el siguiente día operativo si el evento termina después del cierre', () => {
    const event = validateEventWindow('2026-10-06', '17:00', '2026-10-06', '19:00', now);
    const block = calculateEquipmentBlock({
      event,
      dateStart: '2026-10-06',
      timeStart: '17:00',
      dateEnd: '2026-10-06',
      timeEnd: '19:00',
      now,
      requiresTransfer: true,
      eventCampusSchedule: fcs,
      baseCampusSchedule: tup,
      setupMinutes: 60,
      teardownMinutes: 30,
      departureTime: '17:00',
      travelMinutes: 30,
      returnReleaseMinutes: 60,
    });
    expect(block.returnStart).toEqual(localDateTime('2026-10-07', '18:00'));
    expect(block.release).toEqual(localDateTime('2026-10-07', '19:00'));
    expect(block.systemsCoverage).toBe('pendiente');
  });

  it('rechaza confirmar un traslado cuando ya pasó el corte', () => {
    const event = validateEventWindow('2026-10-06', '10:00', '2026-10-06', '14:00', now);
    expect(() =>
      calculateEquipmentBlock({
        event,
        dateStart: '2026-10-06',
        timeStart: '10:00',
        dateEnd: '2026-10-06',
        timeEnd: '14:00',
        now: new Date('2026-10-05T17:01:00-05:00'),
        requiresTransfer: true,
        eventCampusSchedule: fcs,
        baseCampusSchedule: tup,
        setupMinutes: 60,
        teardownMinutes: 30,
        departureTime: '17:00',
        travelMinutes: 30,
        returnReleaseMinutes: 60,
      }),
    ).toThrowError(expect.objectContaining({ code: 'equipment-cutoff-missed' }));
  });
});
