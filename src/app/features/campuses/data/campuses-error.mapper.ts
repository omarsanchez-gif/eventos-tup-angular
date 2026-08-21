const MESSAGES: Readonly<Record<string, string>> = {
  unauthenticated: 'La sesión ya no es válida. Inicie sesión nuevamente.',
  'permission-denied': 'No tiene permisos para administrar campus.',
  'invalid-argument': 'Revise los datos y horarios capturados.',
  'campus-name-exists': 'Ya existe un campus con ese nombre.',
  'campus-code-exists': 'Ya existe un campus con esa clave.',
  'campus-code-immutable': 'La clave de un campus utilizado ya no puede cambiarse.',
  'campus-not-found': 'El campus ya no existe. Actualice el listado.',
  'campus-in-use': 'El campus ya fue utilizado. Puede suspenderlo, pero no eliminarlo.',
  'active-campus-requires-schedule': 'Un campus activo requiere al menos un día operativo.',
  'campus-capacity-exceeded': 'El catálogo supera el máximo técnico de 100 campus.',
  'service-unavailable': 'El servicio de Campus no está disponible. Intente nuevamente.',
};
interface ErrorLike {
  readonly code?: unknown;
  readonly details?: unknown;
  readonly functionalCode?: unknown;
}
function asErrorLike(error: unknown): ErrorLike {
  return typeof error === 'object' && error !== null ? (error as ErrorLike) : {};
}
export function mapCampusesError(error: unknown): string {
  const details = asErrorLike(asErrorLike(error).details);
  const code = typeof details.functionalCode === 'string' ? details.functionalCode : null;
  if (code && MESSAGES[code]) return MESSAGES[code];
  if (asErrorLike(error).code === 'functions/unauthenticated') return MESSAGES['unauthenticated']!;
  if (asErrorLike(error).code === 'functions/permission-denied')
    return MESSAGES['permission-denied']!;
  return 'No fue posible completar la operación. Intente nuevamente.';
}
