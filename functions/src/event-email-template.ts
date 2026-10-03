export type EventNotificationType =
  'creacion' | 'actualizacion' | 'retiro_coordinacion' | 'cancelacion' | 'logistica';

export type LogisticsReason =
  | 'cobertura_sistemas'
  | 'inventario_reducido'
  | 'cambio_incompatible'
  | 'demora'
  | 'cancelacion_post_salida';

export interface NotificationEquipment {
  readonly nombre: string;
  readonly cantidad: number;
}

export interface NotificationEventSnapshot {
  readonly nombreEvento: string;
  readonly fechaInicio: string;
  readonly horaInicio: string;
  readonly fechaFin: string;
  readonly horaFin: string;
  readonly responsable: string;
  readonly campusNombre: string;
  readonly campusDireccion: string | null;
  readonly coordinacionesNombres: readonly string[];
  readonly equipos: readonly NotificationEquipment[];
  readonly observaciones: string;
  readonly cambios: readonly string[];
  readonly equipoNombre: string | null;
}

interface EventEmailInput {
  readonly type: EventNotificationType;
  readonly logisticsReason: LogisticsReason | null;
  readonly event: Readonly<Record<string, unknown>>;
}

interface EventEmailContent {
  readonly subject: string;
  readonly text: string;
  readonly html: string;
}

const logisticsLabels: Readonly<Record<LogisticsReason, string>> = {
  cobertura_sistemas: 'Cobertura de Sistemas pendiente',
  inventario_reducido: 'Inventario reducido',
  cambio_incompatible: 'Cambio posterior al traslado',
  demora: 'Demora de equipo',
  cancelacion_post_salida: 'Cancelación posterior a la salida',
};

function record(value: unknown): Readonly<Record<string, unknown>> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Readonly<Record<string, unknown>>)
    : {};
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function nullableString(value: unknown): string | null {
  const normalized = stringValue(value);
  return normalized || null;
}

function stringList(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}

function equipmentList(value: unknown): readonly NotificationEquipment[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const equipment = record(item);
    const name = stringValue(equipment['nombre']);
    const quantity = equipment['cantidad'];
    return name && Number.isInteger(quantity) && (quantity as number) > 0
      ? [{ nombre: name, cantidad: quantity as number }]
      : [];
  });
}

function snapshot(value: Readonly<Record<string, unknown>>): NotificationEventSnapshot {
  return {
    nombreEvento: stringValue(value['nombreEvento']) || 'Evento',
    fechaInicio: stringValue(value['fechaInicio']),
    horaInicio: stringValue(value['horaInicio']),
    fechaFin: stringValue(value['fechaFin']),
    horaFin: stringValue(value['horaFin']),
    responsable: stringValue(value['responsable']),
    campusNombre: stringValue(value['campusNombre']),
    campusDireccion: nullableString(value['campusDireccion']),
    coordinacionesNombres: stringList(value['coordinacionesNombres']),
    equipos: equipmentList(value['equipos']),
    observaciones: stringValue(value['observaciones']),
    cambios: stringList(value['cambios']),
    equipoNombre: nullableString(value['equipoNombre']),
  };
}

function normalizeComparable(value: unknown): string {
  if (Array.isArray(value)) {
    return JSON.stringify(
      value.map((item) => (typeof item === 'object' && item ? record(item) : item)),
    );
  }
  return JSON.stringify(value ?? null);
}

export function describeEventChanges(
  previousValue: unknown,
  current: NotificationEventSnapshot,
): readonly string[] {
  const previous = record(previousValue);
  if (Object.keys(previous).length === 0) return [];
  const changes: string[] = [];
  const changed = (keys: readonly string[], currentValue: unknown) => {
    if (!keys.some((key) => Object.prototype.hasOwnProperty.call(previous, key))) return false;
    const previousValueForKeys = keys.map((key) => previous[key]);
    return normalizeComparable(previousValueForKeys) !== normalizeComparable(currentValue);
  };

  if (changed(['nombreEvento'], [current.nombreEvento])) changes.push('Nombre del evento');
  if (
    changed(
      ['fechaInicio', 'horaInicio', 'fechaFin', 'horaFin'],
      [current.fechaInicio, current.horaInicio, current.fechaFin, current.horaFin],
    )
  ) {
    changes.push('Fecha u horario');
  }
  if (
    changed(['campusNombre', 'campusDireccion'], [current.campusNombre, current.campusDireccion])
  ) {
    changes.push('Campus');
  }
  if (
    Object.prototype.hasOwnProperty.call(previous, 'coordinacionesNombres') &&
    normalizeComparable(
      [...stringList(previous['coordinacionesNombres'])].sort((a, b) => a.localeCompare(b, 'es')),
    ) !==
      normalizeComparable(
        [...current.coordinacionesNombres].sort((a, b) => a.localeCompare(b, 'es')),
      )
  ) {
    changes.push('Coordinaciones involucradas');
  }
  if (
    Object.prototype.hasOwnProperty.call(previous, 'equipos') &&
    normalizeComparable(
      [...equipmentList(previous['equipos'])].sort((a, b) =>
        a.nombre.localeCompare(b.nombre, 'es'),
      ),
    ) !==
      normalizeComparable(
        [...current.equipos]
          .map((item) => ({ nombre: item.nombre, cantidad: item.cantidad }))
          .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
      )
  ) {
    changes.push('Equipamiento');
  }
  if (changed(['observaciones'], [current.observaciones])) changes.push('Observaciones');
  return changes;
}

function singleLine(value: string): string {
  return value
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  const formatted = new Intl.DateTimeFormat('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function formattedInterval(event: NotificationEventSnapshot): string {
  const startDate = formatDate(event.fechaInicio);
  const endDate = formatDate(event.fechaFin);
  return event.fechaInicio === event.fechaFin
    ? `${startDate} · ${event.horaInicio}–${event.horaFin} h`
    : `${startDate}, ${event.horaInicio} h – ${endDate}, ${event.horaFin} h`;
}

function presentation(input: EventEmailInput): {
  readonly label: string;
  readonly introduction: string;
  readonly accent: string;
  readonly soft: string;
} {
  if (input.type === 'cancelacion') {
    return {
      label: 'Evento cancelado',
      introduction: 'El evento fue cancelado. Consulte los datos finales a continuación.',
      accent: '#b3261e',
      soft: '#fff2f0',
    };
  }
  if (input.type === 'logistica') {
    const detail = input.logisticsReason
      ? logisticsLabels[input.logisticsReason]
      : 'Revisión logística';
    return {
      label: 'Aviso logístico',
      introduction: `${detail}. Se requiere revisar la operación del equipo asociado.`,
      accent: '#9a6700',
      soft: '#fff7d6',
    };
  }
  if (input.type === 'retiro_coordinacion') {
    return {
      label: 'Coordinación retirada',
      introduction: 'Su coordinación ya no está involucrada en este evento.',
      accent: '#9a6700',
      soft: '#fff7d6',
    };
  }
  if (input.type === 'actualizacion') {
    return {
      label: 'Evento actualizado',
      introduction: 'La información del evento fue actualizada.',
      accent: '#252a86',
      soft: '#eeeef9',
    };
  }
  return {
    label: 'Evento confirmado',
    introduction: 'El evento fue registrado correctamente.',
    accent: '#18794e',
    soft: '#ecfdf3',
  };
}

function detailRow(label: string, value: string): string {
  if (!value) return '';
  return `<tr><td style="padding:10px 12px 10px 0;color:#667085;font-size:14px;line-height:20px;vertical-align:top;width:130px;">${escapeHtml(label)}</td><td style="padding:10px 0;color:#101828;font-size:15px;line-height:22px;vertical-align:top;font-weight:600;">${value}</td></tr>`;
}

function section(title: string, content: string): string {
  if (!content) return '';
  return `<tr><td style="padding:0 32px 24px;"><div style="border-top:1px solid #dfe3ea;padding-top:20px;"><div style="color:#252a86;font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;margin-bottom:10px;">${escapeHtml(title)}</div>${content}</div></td></tr>`;
}

function textLines(title: string, values: readonly string[]): readonly string[] {
  return values.length > 0 ? ['', title, ...values.map((value) => `- ${value}`)] : [];
}

export function buildEventEmail(input: EventEmailInput): EventEmailContent {
  const event = snapshot(input.event);
  const view = presentation(input);
  const interval = formattedInterval(event);
  const subjectName = singleLine(event.nombreEvento).slice(0, 120) || 'Evento';
  const subject = `[Eventos TUP] ${view.label}: ${subjectName}`;
  const campus = [event.campusNombre, event.campusDireccion].filter(Boolean).join(' · ');
  const coordinationNames = event.coordinacionesNombres;
  const equipment = event.equipos.map((item) => `${item.nombre} × ${item.cantidad}`);
  const logisticsEquipment = event.equipoNombre ? [event.equipoNombre] : [];
  const plainText = [
    view.label,
    event.nombreEvento,
    '',
    view.introduction,
    '',
    `Fecha y horario: ${interval}`,
    'Horario local de Cancún.',
    ...(campus ? [`Campus: ${campus}`] : []),
    ...(event.responsable ? [`Responsable: ${event.responsable}`] : []),
    ...textLines('Coordinaciones involucradas:', coordinationNames),
    ...textLines('Equipamiento solicitado:', equipment),
    ...textLines('Equipo relacionado:', logisticsEquipment),
    ...(event.observaciones ? ['', 'Observaciones:', event.observaciones] : []),
    ...textLines('Cambios realizados:', event.cambios),
    '',
    'Este mensaje fue generado automáticamente por el Sistema de Eventos TUP.',
    'Para solicitar cambios, comuníquese con la persona responsable del evento.',
  ].join('\n');

  const coordinationsHtml = coordinationNames
    .map(
      (name) =>
        `<div style="padding:4px 0;color:#101828;font-size:15px;line-height:22px;">• ${escapeHtml(name)}</div>`,
    )
    .join('');
  const equipmentHtml = equipment
    .map(
      (item) =>
        `<div style="padding:4px 0;color:#101828;font-size:15px;line-height:22px;">• ${escapeHtml(item)}</div>`,
    )
    .join('');
  const changesHtml = event.cambios
    .map(
      (item) =>
        `<div style="padding:4px 0;color:#101828;font-size:15px;line-height:22px;">• ${escapeHtml(item)}</div>`,
    )
    .join('');
  const observationsHtml = event.observaciones
    ? `<div style="color:#101828;font-size:15px;line-height:24px;">${escapeHtml(event.observaciones).replace(/\r?\n/g, '<br>')}</div>`
    : '';
  const logisticsHtml = event.equipoNombre
    ? `<div style="background:#fff7d6;border:1px solid #ead28a;border-radius:10px;padding:12px 14px;color:#101828;font-size:15px;line-height:22px;"><strong>Equipo relacionado:</strong> ${escapeHtml(event.equipoNombre)}</div>`
    : '';

  const html = `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#f8f9fb;font-family:Arial,Helvetica,sans-serif;color:#101828;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(`${view.label}: ${event.nombreEvento}`)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f8f9fb;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #dfe3ea;border-radius:16px;overflow:hidden;">
<tr><td style="background:#252a86;padding:22px 32px;color:#ffffff;"><div style="font-size:13px;line-height:18px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">Sistema de Eventos TUP</div><div style="font-size:13px;line-height:20px;opacity:.85;margin-top:4px;">Gestión institucional de eventos</div></td></tr>
<tr><td style="padding:30px 32px 18px;"><span style="display:inline-block;background:${view.soft};color:${view.accent};border:1px solid ${view.accent};border-radius:999px;padding:5px 10px;font-size:12px;line-height:16px;font-weight:700;">${escapeHtml(view.label)}</span><h1 style="margin:16px 0 8px;color:#101828;font-size:26px;line-height:34px;">${escapeHtml(event.nombreEvento)}</h1><p style="margin:0;color:#667085;font-size:16px;line-height:24px;">${escapeHtml(view.introduction)}</p></td></tr>
<tr><td style="padding:0 32px 24px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f6f7f9;border-radius:12px;padding:6px 16px;">${detailRow('Fecha y horario', escapeHtml(interval))}${detailRow('Campus', escapeHtml(campus))}${detailRow('Responsable', escapeHtml(event.responsable))}</table><div style="margin-top:8px;color:#667085;font-size:12px;line-height:18px;">Horario local de Cancún.</div></td></tr>
${section('Cambios realizados', changesHtml)}
${section('Coordinaciones involucradas', coordinationsHtml)}
${section('Equipamiento solicitado', equipmentHtml)}
${section('Aviso logístico', logisticsHtml)}
${section('Observaciones', observationsHtml)}
<tr><td style="padding:22px 32px;background:#f6f7f9;border-top:1px solid #dfe3ea;color:#667085;font-size:12px;line-height:19px;">Este mensaje fue generado automáticamente por el Sistema de Eventos TUP.<br>Para solicitar cambios, comuníquese con la persona responsable del evento.</td></tr>
</table>
</td></tr></table>
</body></html>`;

  return { subject, text: plainText, html };
}
