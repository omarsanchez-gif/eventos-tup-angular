const messages: Readonly<Record<string, string>> = {
  unauthenticated: 'La sesión terminó. Inicie sesión nuevamente.',
  'permission-denied': 'No tiene permisos para administrar equipos.',
  'invalid-argument': 'Revise los datos capturados.',
  'equipment-name-exists': 'Ya existe un equipo con ese nombre en el campus base.',
  'equipment-not-found': 'El equipo ya no existe.',
  'equipment-in-use': 'El equipo ya tiene uso histórico y solo puede suspenderse.',
  'equipment-base-campus-immutable':
    'El campus base no puede cambiar porque el equipo ya tiene uso histórico.',
  'campus-not-found': 'El campus seleccionado ya no existe.',
  'campus-inactive': 'El campus base está suspendido.',
  'invalid-destination-campus': 'Revise los campus destino permitidos.',
  'active-equipment-requires-stock': 'Un equipo activo requiere al menos una unidad operativa.',
  'equipment-capacity-exceeded': 'Se alcanzó el máximo técnico de 500 equipos.',
  'service-unavailable': 'El servicio de equipos no está disponible. Intente nuevamente.',
};

export function mapEquipmentError(error: unknown): string {
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
