const FUNCTIONAL_MESSAGES: Readonly<Record<string, string>> = {
  unauthenticated: 'La sesión ya no es válida. Inicie sesión nuevamente.',
  'permission-denied': 'No tiene permisos para administrar coordinaciones.',
  'invalid-argument': 'Revise el nombre y los correos capturados.',
  'domain-not-allowed': 'Todos los correos deben pertenecer al dominio institucional.',
  'duplicate-email': 'No puede repetir un correo dentro de la coordinación.',
  'email-capacity-exceeded': 'Cada coordinación admite como máximo 10 correos.',
  'coordination-name-exists': 'Ya existe una coordinación con ese nombre.',
  'coordination-not-found': 'La coordinación ya no existe. Actualice el listado.',
  'coordination-in-use':
    'La coordinación ya fue utilizada en un evento. Puede suspenderla, pero no eliminarla.',
  'active-coordination-requires-email':
    'Una coordinación activa requiere al menos un correo institucional.',
  'coordination-capacity-exceeded':
    'El catálogo supera las 500 coordinaciones y requiere otra estrategia de consulta.',
  'service-unavailable': 'El servicio de Coordinaciones no está disponible. Intente nuevamente.',
};

interface ErrorLike {
  readonly code?: unknown;
  readonly details?: unknown;
  readonly functionalCode?: unknown;
}

function asErrorLike(error: unknown): ErrorLike {
  return typeof error === 'object' && error !== null ? (error as ErrorLike) : {};
}

export function coordinationFunctionalCode(error: unknown): string | null {
  const candidate = asErrorLike(error);
  const details = asErrorLike(candidate.details);
  return typeof details.functionalCode === 'string' ? details.functionalCode : null;
}

export function mapCoordinationsError(error: unknown): string {
  const functionalCode = coordinationFunctionalCode(error);
  if (functionalCode && FUNCTIONAL_MESSAGES[functionalCode]) {
    return FUNCTIONAL_MESSAGES[functionalCode];
  }
  const code = asErrorLike(error).code;
  if (code === 'functions/unauthenticated') {
    return FUNCTIONAL_MESSAGES['unauthenticated'] ?? 'La sesión no es válida.';
  }
  if (code === 'functions/permission-denied') {
    return FUNCTIONAL_MESSAGES['permission-denied'] ?? 'No tiene permisos.';
  }
  return 'No fue posible completar la operación. Intente nuevamente.';
}
