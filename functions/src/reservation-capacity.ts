import { Timestamp, type DocumentData } from 'firebase-admin/firestore';

export interface CapacityInterval {
  readonly start: number;
  readonly end: number;
  readonly quantity: number;
}

export function reservationInterval(data: DocumentData): CapacityInterval {
  const start = data['bloqueoInicio'];
  const end = data['bloqueoFin'];
  const quantity = data['cantidad'];
  if (
    !(start instanceof Timestamp) ||
    !(end instanceof Timestamp) ||
    end.toMillis() <= start.toMillis() ||
    !Number.isInteger(quantity) ||
    quantity <= 0
  ) {
    throw new Error('invalid-reservation-capacity');
  }
  return { start: start.toMillis(), end: end.toMillis(), quantity: quantity as number };
}

/** Half-open intervals: departures and arrivals at the same instant are aggregated. */
export function peakOccupancy(
  intervals: readonly CapacityInterval[],
  start: number,
  end: number,
): number {
  const changes = new Map<number, number>();
  for (const interval of intervals) {
    const from = Math.max(start, interval.start);
    const until = Math.min(end, interval.end);
    if (from >= until) continue;
    changes.set(from, (changes.get(from) ?? 0) + interval.quantity);
    changes.set(until, (changes.get(until) ?? 0) - interval.quantity);
  }
  let occupied = 0;
  let peak = 0;
  for (const [, change] of [...changes].sort(([a], [b]) => a - b)) {
    occupied += change;
    peak = Math.max(peak, occupied);
  }
  return peak;
}
