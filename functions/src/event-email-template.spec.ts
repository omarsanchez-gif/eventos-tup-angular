import { describe, expect, it } from 'vitest';

import {
  buildEventEmail,
  describeEventChanges,
  type NotificationEventSnapshot,
} from './event-email-template.js';

const event: NotificationEventSnapshot = {
  nombreEvento: 'Ceremonia <Institucional>',
  fechaInicio: '2026-10-12',
  horaInicio: '10:51',
  fechaFin: '2026-10-12',
  horaFin: '12:51',
  responsable: 'Omar Sánchez',
  campusNombre: 'Tecnológico Universitario Playacar',
  campusDireccion: 'Av. Universidades & Av. Tecnológico',
  coordinacionesNombres: ['Sistemas', 'Marketing'],
  equipos: [
    { nombre: 'Bocina', cantidad: 1 },
    { nombre: 'Kit de micrófonos', cantidad: 2 },
  ],
  observaciones: '<script>alert("x")</script>\nMontaje temprano',
  cambios: ['Fecha u horario', 'Equipamiento'],
  equipoNombre: null,
};

describe('plantilla institucional de correo de Eventos', () => {
  it('genera HTML responsive y texto equivalente con contenido canónico escapado', () => {
    const message = buildEventEmail({
      type: 'actualizacion',
      logisticsReason: null,
      event,
    });

    expect(message.subject).toBe('[Eventos TUP] Evento actualizado: Ceremonia <Institucional>');
    expect(message.html).toContain('Sistema de Eventos TUP');
    expect(message.html).toContain('Lunes, 12 de octubre de 2026');
    expect(message.html).toContain('Tecnológico Universitario Playacar');
    expect(message.html).toContain('Bocina × 1');
    expect(message.html).toContain('Fecha u horario');
    expect(message.html).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
    expect(message.html).not.toContain('<script>alert');
    expect(message.html).not.toMatch(/https?:\/\//);
    expect(message.text).toContain('Coordinaciones involucradas:\n- Sistemas\n- Marketing');
    expect(message.text).toContain('Horario local de Cancún');
  });

  it('presenta la cancelación como estado textual y semántico', () => {
    const message = buildEventEmail({
      type: 'cancelacion',
      logisticsReason: null,
      event,
    });

    expect(message.subject).toContain('[Eventos TUP] Evento cancelado:');
    expect(message.html).toContain('Evento cancelado');
    expect(message.html).toContain('#b3261e');
    expect(message.text).toContain('El evento fue cancelado');
  });

  it('identifica el equipo y la causa en un aviso logístico', () => {
    const message = buildEventEmail({
      type: 'logistica',
      logisticsReason: 'demora',
      event: { ...event, equipoNombre: 'Bocina móvil' },
    });

    expect(message.subject).toContain('[Eventos TUP] Aviso logístico:');
    expect(message.html).toContain('Demora de equipo');
    expect(message.html).toContain('Bocina móvil');
    expect(message.text).toContain('Equipo relacionado:\n- Bocina móvil');
  });

  it('detecta cambios disponibles sin inventarlos en fotografías históricas', () => {
    expect(
      describeEventChanges(
        {
          nombreEvento: event.nombreEvento,
          fechaInicio: event.fechaInicio,
          horaInicio: '09:00',
          fechaFin: event.fechaFin,
          horaFin: event.horaFin,
        },
        event,
      ),
    ).toEqual(['Fecha u horario']);
    expect(
      describeEventChanges(
        {
          nombreEvento: event.nombreEvento,
          fechaInicio: event.fechaInicio,
          horaInicio: event.horaInicio,
          fechaFin: event.fechaFin,
          horaFin: event.horaFin,
          responsable: event.responsable,
          equipoNombre: null,
        },
        event,
      ),
    ).toEqual([]);
  });
});
