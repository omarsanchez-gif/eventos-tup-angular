import { createHash } from 'node:crypto';

export function calendarEventIdentity(eventId: string, previousId = ''): string {
  return createHash('sha256')
    .update(JSON.stringify(['eventos-tup', eventId, previousId]))
    .digest('hex');
}
