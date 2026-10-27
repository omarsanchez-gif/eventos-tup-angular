import { describe, expect, it } from 'vitest';
import { peakOccupancy } from './reservation-capacity.js';

describe('ocupación simultánea de reservaciones', () => {
  it.each([
    {
      name: 'sucesivas',
      intervals: [
        [0, 3, 1],
        [5, 9, 1],
      ],
      peak: 1,
    },
    {
      name: 'coincidentes',
      intervals: [
        [0, 5, 1],
        [2, 9, 2],
      ],
      peak: 3,
    },
    {
      name: 'adyacentes',
      intervals: [
        [0, 5, 2],
        [5, 9, 1],
      ],
      peak: 2,
    },
    {
      name: 'anidadas',
      intervals: [
        [0, 10, 1],
        [2, 4, 2],
        [6, 8, 3],
      ],
      peak: 4,
    },
    {
      name: 'exteriores y extremos exclusivos',
      intervals: [
        [-5, 0, 9],
        [10, 12, 9],
      ],
      peak: 0,
    },
  ])('$name', ({ intervals, peak }) => {
    expect(
      peakOccupancy(
        intervals.map(([start, end, quantity]) => ({
          start: start!,
          end: end!,
          quantity: quantity!,
        })),
        0,
        10,
      ),
    ).toBe(peak);
  });

  it('coincide con un oráculo por franjas para múltiples distribuciones', () => {
    for (let seed = 1; seed <= 100; seed += 1) {
      const intervals = Array.from({ length: 8 }, (_, index) => {
        const start = ((seed * (index + 3)) % 17) - 4;
        return { start, end: start + 1 + ((seed + index) % 8), quantity: 1 + (index % 3) };
      });
      const expected = Math.max(
        ...Array.from({ length: 10 }, (_, instant) =>
          intervals
            .filter((interval) => interval.start <= instant && interval.end > instant)
            .reduce((sum, interval) => sum + interval.quantity, 0),
        ),
      );
      expect(peakOccupancy(intervals, 0, 10)).toBe(expected);
    }
  });
});
