import nodemailer from 'nodemailer';

import {
  MailDeliveryError,
  type CalendarEventState,
  type EventCalendarClient,
  type EventMailMessage,
  type EventMailer,
} from './event-integrations.js';

interface CalendarConfiguration {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly refreshToken: string;
  readonly calendarId: string;
}

interface SmtpConfiguration {
  readonly host: string;
  readonly port: number;
  readonly secure: boolean;
  readonly user: string;
  readonly from: string;
  readonly password: string;
  readonly allowedRecipients: readonly string[];
}

class CalendarApiError extends Error {
  constructor(readonly status: number) {
    super('Google Calendar no aceptó la operación.');
    this.name = 'CalendarApiError';
  }
}

function record(value: unknown): Readonly<Record<string, unknown>> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('invalid-secret');
  return value as Readonly<Record<string, unknown>>;
}

function requiredString(value: Readonly<Record<string, unknown>>, key: string): string {
  const item = value[key];
  if (typeof item !== 'string' || !item.trim()) throw new Error('invalid-secret');
  return item.trim();
}

function parseCalendarConfiguration(secret: string): CalendarConfiguration {
  const value = record(JSON.parse(secret) as unknown);
  return {
    clientId: requiredString(value, 'clientId'),
    clientSecret: requiredString(value, 'clientSecret'),
    refreshToken: requiredString(value, 'refreshToken'),
    calendarId: requiredString(value, 'calendarId'),
  };
}

function parseSmtpConfiguration(secret: string): SmtpConfiguration {
  const value = record(JSON.parse(secret) as unknown);
  const port = value['port'];
  const secure = value['secure'];
  const recipients = value['allowedRecipients'];
  if (!Number.isInteger(port) || secure !== true || !Array.isArray(recipients)) {
    throw new Error('invalid-secret');
  }
  return {
    host: requiredString(value, 'host'),
    port: port as number,
    secure,
    user: requiredString(value, 'user'),
    from: requiredString(value, 'from'),
    password: requiredString(value, 'password'),
    allowedRecipients: recipients.map((recipient) => {
      if (typeof recipient !== 'string' || !recipient.trim()) throw new Error('invalid-secret');
      return recipient.trim().toLowerCase();
    }),
  };
}

function isInstitutionalRecipient(recipient: string, rawDomain: string): boolean {
  const domain = rawDomain.trim().toLowerCase();
  if (!domain || domain.includes('@') || domain.includes(' ')) return false;
  const separator = recipient.lastIndexOf('@');
  return (
    separator > 0 &&
    recipient.indexOf('@') === separator &&
    recipient.slice(separator + 1) === domain
  );
}

function hasCanonicalCoordinationOrigin(message: EventMailMessage, domain: string): boolean {
  return (
    (message.recipientType === 'coordinacion' || message.recipientType === 'sistemas') &&
    typeof message.coordinationId === 'string' &&
    Boolean(message.coordinationId.trim()) &&
    isInstitutionalRecipient(message.to.trim().toLowerCase(), domain)
  );
}

async function accessToken(configuration: CalendarConfiguration): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: configuration.clientId,
      client_secret: configuration.clientSecret,
      refresh_token: configuration.refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  if (!response.ok) throw new CalendarApiError(response.status);
  const data = (await response.json()) as Record<string, unknown>;
  if (typeof data['access_token'] !== 'string') throw new CalendarApiError(502);
  return data['access_token'];
}

function calendarBody(event: CalendarEventState) {
  return {
    summary: event.name,
    description: event.observations
      ? `${event.observations}\n\nResponsable: ${event.responsible}`
      : `Responsable: ${event.responsible}`,
    location: [event.campusName, event.campusAddress].filter(Boolean).join(' · '),
    start: {
      dateTime: `${event.dateStart}T${event.timeStart}:00`,
      timeZone: 'America/Cancun',
    },
    end: {
      dateTime: `${event.dateEnd}T${event.timeEnd}:00`,
      timeZone: 'America/Cancun',
    },
    extendedProperties: { private: { eventosTupId: event.eventId } },
  };
}

async function calendarRequest(
  url: string,
  token: string,
  init: RequestInit,
): Promise<Record<string, unknown>> {
  const response = await fetch(url, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      ...init.headers,
    },
  });
  if (!response.ok) throw new CalendarApiError(response.status);
  if (response.status === 204) return {};
  return (await response.json()) as Record<string, unknown>;
}

export function createGoogleCalendarClient(readSecret: () => string): EventCalendarClient {
  return {
    async upsert(event, existingId) {
      const configuration = parseCalendarConfiguration(readSecret());
      const token = await accessToken(configuration);
      const baseUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(configuration.calendarId)}/events`;
      const body = JSON.stringify(calendarBody(event));
      if (existingId) {
        try {
          await calendarRequest(`${baseUrl}/${encodeURIComponent(existingId)}`, token, {
            method: 'PUT',
            body,
          });
          return existingId;
        } catch (error) {
          if (
            !(error instanceof CalendarApiError) ||
            (error.status !== 404 && error.status !== 410)
          ) {
            throw error;
          }
        }
      }
      const created = await calendarRequest(baseUrl, token, {
        method: 'POST',
        body,
      });
      if (typeof created['id'] !== 'string' || !created['id']) throw new CalendarApiError(502);
      return created['id'];
    },

    async remove(existingId) {
      const configuration = parseCalendarConfiguration(readSecret());
      const token = await accessToken(configuration);
      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(configuration.calendarId)}/events/${encodeURIComponent(existingId)}`;
      try {
        await calendarRequest(url, token, { method: 'DELETE' });
      } catch (error) {
        if (error instanceof CalendarApiError && (error.status === 404 || error.status === 410))
          return;
        throw error;
      }
    },
  };
}

export function createSmtpMailer(
  readSecret: () => string,
  readInstitutionalDomain: () => string,
): EventMailer {
  return {
    async send(message) {
      const configuration = parseSmtpConfiguration(readSecret());
      const recipient = message.to.trim().toLowerCase();
      const fixedRecipient = configuration.allowedRecipients.includes(recipient);
      const coordinationRecipient = hasCanonicalCoordinationOrigin(
        { ...message, to: recipient },
        readInstitutionalDomain(),
      );
      if (!fixedRecipient && !coordinationRecipient) {
        throw new MailDeliveryError('recipient-not-allowed', true);
      }
      const transport = nodemailer.createTransport({
        host: configuration.host,
        port: configuration.port,
        secure: configuration.secure,
        auth: { user: configuration.user, pass: configuration.password },
      });
      try {
        await transport.sendMail({
          from: configuration.from,
          to: recipient,
          subject: message.subject,
          text: message.text,
          html: message.html,
        });
      } catch (error) {
        const responseCode =
          error && typeof error === 'object' && 'responseCode' in error
            ? Number((error as { responseCode?: unknown }).responseCode)
            : Number.NaN;
        const permanent = Number.isFinite(responseCode) && responseCode >= 500;
        throw new MailDeliveryError(permanent ? 'smtp-permanent' : 'smtp-temporary', permanent);
      } finally {
        transport.close();
      }
    },
  };
}
