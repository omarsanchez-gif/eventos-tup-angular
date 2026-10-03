import { afterEach, describe, expect, it, vi } from 'vitest';

import { createGoogleCalendarClient, createSmtpMailer } from './event-integration-adapters.js';

const smtp = vi.hoisted(() => {
  const sendMail = vi.fn(async () => undefined);
  const close = vi.fn();
  return {
    sendMail,
    close,
    createTransport: vi.fn(() => ({ sendMail, close })),
  };
});

vi.mock('nodemailer', () => ({
  default: { createTransport: smtp.createTransport },
}));

const event = {
  eventId: 'event-1',
  name: 'Ceremonia institucional',
  dateStart: '2026-10-06',
  timeStart: '12:00',
  dateEnd: '2026-10-06',
  timeEnd: '14:00',
  responsible: 'Omar Sánchez',
  campusName: 'Tecnológico Universitario Playacar',
  campusAddress: 'Av. Universidades',
  observations: 'Prueba',
};

afterEach(() => {
  vi.unstubAllGlobals();
  smtp.sendMail.mockClear();
  smtp.close.mockClear();
  smtp.createTransport.mockClear();
});

function smtpSecret() {
  return JSON.stringify({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    user: 'eventos@tecplayacar.edu.mx',
    from: 'eventos@tecplayacar.edu.mx',
    password: 'not-a-real-secret',
    allowedRecipients: ['omar.sanchez@tecplayacar.edu.mx'],
  });
}

const mailContent = {
  subject: 'Prueba',
  text: 'Prueba',
  html: '<p>Prueba</p>',
};

describe('adaptadores externos de Eventos', () => {
  it('Calendar conserva fecha local, zona institucional y no agrega asistentes', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'token' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 'calendar-id' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
    vi.stubGlobal('fetch', fetchMock);
    const client = createGoogleCalendarClient(() =>
      JSON.stringify({
        clientId: 'client',
        clientSecret: 'secret',
        refreshToken: 'refresh',
        calendarId: 'calendar',
      }),
    );

    await expect(client.upsert(event, null)).resolves.toBe('calendar-id');
    const body = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body)) as Record<string, unknown>;
    expect(body).not.toHaveProperty('attendees');
    expect(body['start']).toEqual({
      dateTime: '2026-10-06T12:00:00',
      timeZone: 'America/Cancun',
    });
  });

  it('recrea Calendar cuando la actualización responde 404', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'token' }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(new Response('', { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'recreated' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const client = createGoogleCalendarClient(() =>
      JSON.stringify({
        clientId: 'client',
        clientSecret: 'secret',
        refreshToken: 'refresh',
        calendarId: 'calendar',
      }),
    );

    await expect(client.upsert(event, 'missing')).resolves.toBe('recreated');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('SMTP bloquea destinatarios fuera de la lista permitida antes del transporte', async () => {
    const mailer = createSmtpMailer(smtpSecret, () => 'tecplayacar.edu.mx');
    await expect(
      mailer.send({
        to: 'persona@tecplayacar.edu.mx',
        recipientType: 'creador',
        coordinationId: null,
        ...mailContent,
      }),
    ).rejects.toMatchObject({ code: 'recipient-not-allowed', permanent: true });
    expect(smtp.createTransport).not.toHaveBeenCalled();
  });

  it('SMTP permite un contacto institucional con procedencia canónica de Coordinación', async () => {
    const mailer = createSmtpMailer(smtpSecret, () => 'tecplayacar.edu.mx');

    await expect(
      mailer.send({
        to: 'academia@tecplayacar.edu.mx',
        recipientType: 'coordinacion',
        coordinationId: 'academia',
        ...mailContent,
      }),
    ).resolves.toBeUndefined();

    expect(smtp.createTransport).toHaveBeenCalledTimes(1);
    expect(smtp.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'academia@tecplayacar.edu.mx' }),
    );
  });

  it.each([
    {
      name: 'correo externo',
      to: 'academia@example.com',
      recipientType: 'coordinacion' as const,
      coordinationId: 'academia',
    },
    {
      name: 'coordinación sin ID canónico',
      to: 'academia@tecplayacar.edu.mx',
      recipientType: 'coordinacion' as const,
      coordinationId: null,
    },
  ])('SMTP bloquea $name antes del transporte', async ({ to, recipientType, coordinationId }) => {
    const mailer = createSmtpMailer(smtpSecret, () => 'tecplayacar.edu.mx');

    await expect(
      mailer.send({ to, recipientType, coordinationId, ...mailContent }),
    ).rejects.toMatchObject({
      code: 'recipient-not-allowed',
      permanent: true,
    });
    expect(smtp.createTransport).not.toHaveBeenCalled();
  });
});
