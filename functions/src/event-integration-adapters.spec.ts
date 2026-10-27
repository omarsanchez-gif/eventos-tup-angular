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
      .mockImplementationOnce(
        async (_url: string, init: RequestInit) =>
          new Response(JSON.stringify({ id: JSON.parse(String(init.body)).id }), { status: 200 }),
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

    await expect(client.upsert(event, null)).resolves.toMatch(/^[a-f0-9]{64}$/);
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
      .mockImplementationOnce(
        async (_url: string, init: RequestInit) =>
          new Response(JSON.stringify({ id: JSON.parse(String(init.body)).id }), { status: 200 }),
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

    await expect(client.upsert(event, 'missing')).resolves.toMatch(/^[a-f0-9]{64}$/);
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

  function calendarFixture(
    options: { loseFirstResponse?: boolean; foreignConflict?: boolean } = {},
  ) {
    const resources = new Map<string, Record<string, unknown>>();
    let lose = options.loseFirstResponse === true;
    const requests: { method: string; id: string }[] = [];
    const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
      if (url === 'https://oauth2.googleapis.com/token')
        return Response.json({ access_token: 'mock-token' });
      const body = init.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};
      const id = init.method === 'POST' ? String(body['id']) : url.split('/').at(-1)!;
      requests.push({ method: init.method!, id });
      if (init.method === 'POST') {
        if (options.foreignConflict)
          resources.set(id, {
            id,
            extendedProperties: { private: { eventosTupId: 'someone-else' } },
          });
        if (resources.has(id)) return new Response('', { status: 409 });
        resources.set(id, { ...body, status: 'confirmed' });
        if (lose) {
          lose = false;
          throw new Error('simulated-response-lost');
        }
        return Response.json({ id });
      }
      if (!resources.has(id)) return new Response('', { status: 404 });
      if (init.method === 'PUT') resources.set(id, { ...body, id, status: 'confirmed' });
      return Response.json(resources.get(id));
    });
    vi.stubGlobal('fetch', fetchMock);
    const client = createGoogleCalendarClient(() =>
      JSON.stringify({
        clientId: 'mock',
        clientSecret: 'mock',
        refreshToken: 'mock',
        calendarId: 'mock',
      }),
    );
    return { client, resources, requests };
  }

  it('dos creaciones simultáneas convergen al mismo recurso de Calendar', async () => {
    const { client, resources, requests } = calendarFixture();
    const ids = await Promise.all([client.upsert(event, null), client.upsert(event, null)]);
    expect(new Set(ids).size).toBe(1);
    expect(resources.size).toBe(1);
    expect(requests.some((request) => request.method === 'GET')).toBe(true);
  });

  it('recupera la misma entrada tras perder la respuesta de creación', async () => {
    const { client, resources } = calendarFixture({ loseFirstResponse: true });
    await expect(client.upsert(event, null)).rejects.toThrow('simulated-response-lost');
    const id = await client.upsert(event, null);
    expect([...resources.keys()]).toEqual([id]);
  });

  it('no sobrescribe un recurso ajeno ante 409', async () => {
    const { client, requests } = calendarFixture({ foreignConflict: true });
    await expect(client.upsert(event, null)).rejects.toThrow();
    expect(requests.some((request) => request.method === 'PUT')).toBe(false);
  });

  it('conserva el ID histórico y recrea de forma determinista si desaparece', async () => {
    const { client, resources } = calendarFixture();
    resources.set('legacy-id', { id: 'legacy-id' });
    expect(await client.upsert(event, 'legacy-id')).toBe('legacy-id');
    resources.delete('legacy-id');
    const ids = await Promise.all([
      client.upsert(event, 'legacy-id'),
      client.upsert(event, 'legacy-id'),
    ]);
    expect(new Set(ids).size).toBe(1);
    expect(resources.size).toBe(1);
  });

  it('reintenta un sucesor estable cuando la entrada anterior quedó cancelada', async () => {
    const { client, resources } = calendarFixture();
    const first = await client.upsert(event, null);
    resources.set(first, { id: first, status: 'cancelled' });
    const ids = await Promise.all([client.upsert(event, null), client.upsert(event, null)]);
    expect(ids[0]).not.toBe(first);
    expect(ids[0]).toBe(ids[1]);
    expect([...resources.values()].filter((item) => item['status'] !== 'cancelled')).toHaveLength(
      1,
    );
  });
});
