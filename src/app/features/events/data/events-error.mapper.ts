const messages: Readonly<Record<string, string>> = {
  unauthenticated: 'La sesión terminó. Inicie sesión nuevamente.',
  'permission-denied': 'No tiene permisos para realizar esta operación.',
  'invalid-argument': 'Revise los datos capturados.',
  'invalid-date-range': 'Revise las fechas y horarios del evento.',
  'event-advance-required':
    'El evento debe registrarse con cinco fechas naturales de anticipación.',
  'event-duration-exceeded': 'El evento admite como máximo seis fechas operativas.',
  'event-on-sunday': 'Los eventos no pueden transcurrir en domingo.',
  'campus-not-found': 'El campus seleccionado ya no existe.',
  'campus-inactive': 'El campus seleccionado está suspendido.',
  'coordination-not-found': 'Una coordinación seleccionada ya no existe.',
  'coordination-inactive': 'Una coordinación seleccionada está suspendida.',
  'equipment-not-found': 'Un equipo seleccionado ya no existe.',
  'equipment-inactive': 'Un equipo seleccionado ya no está disponible.',
  'equipment-unavailable': 'La disponibilidad cambió. Revise los equipos solicitados.',
  'equipment-cutoff-missed': 'Ya pasó el corte para trasladar uno de los equipos.',
  'invalid-campus-schedule': 'No existe una ventana logística válida para el equipo.',
  'calendar-range-invalid': 'El calendario admite intervalos de hasta 42 fechas.',
  'invalid-pdf': 'El protocolo debe ser un PDF válido menor a 10 MiB.',
  'service-unavailable': 'El servicio de eventos no está disponible. Intente nuevamente.',
};

export function mapEventsError(error: unknown): string {
  if (!error || typeof error !== 'object') return messages['service-unavailable']!;
  const record = error as Readonly<Record<string, unknown>>;
  const details =
    record['details'] && typeof record['details'] === 'object'
      ? (record['details'] as Readonly<Record<string, unknown>>)
      : null;
  const raw = details?.['functionalCode'] ?? record['functionalCode'] ?? record['code'];
  const code = typeof raw === 'string' ? raw.replace(/^functions\//u, '') : '';
  return messages[code] ?? messages['service-unavailable']!;
}
