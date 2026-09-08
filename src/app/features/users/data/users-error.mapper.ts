const FUNCTIONAL_MESSAGES: Readonly<Record<string, string>> = {
  unauthenticated: 'La sesión ya no es válida. Inicie sesión nuevamente.',
  'permission-denied': 'No tiene permisos para administrar usuarios.',
  'invalid-argument': 'Revise los datos capturados e intente nuevamente.',
  'domain-not-allowed': 'El correo debe pertenecer al dominio institucional.',
  'email-already-exists': 'Ya existe una autorización para ese correo.',
  'user-not-found': 'El usuario ya no existe. Actualice el listado.',
  'self-delete-forbidden': 'No puede eliminar su propio registro.',
  'self-status-change-forbidden': 'No puede desactivar ni reducir su propio acceso.',
  'last-admin-required': 'Debe permanecer al menos otro administrador activo.',
  'uid-bound-email-change-forbidden': 'El correo no puede cambiarse después de asociar la cuenta.',
  'invalid-role': 'El rol seleccionado no es válido.',
  'user-capacity-exceeded':
    'La cantidad de usuarios supera el límite de esta versión. Se requiere otra estrategia de consulta.',
  'reconciliation-required':
    'El estado se guardó, pero la autorización requiere reconciliación. Reintente la misma operación.',
  'service-unavailable': 'El servicio de Usuarios no está disponible. Intente nuevamente.',
};

interface ErrorLike {
  readonly code?: unknown;
  readonly details?: unknown;
  readonly functionalCode?: unknown;
}

function asErrorLike(error: unknown): ErrorLike {
  return typeof error === 'object' && error !== null ? (error as ErrorLike) : {};
}

export function usersFunctionalCode(error: unknown): string | null {
  const candidate = asErrorLike(error);
  const details = asErrorLike(candidate.details);
  return typeof details.functionalCode === 'string' ? details.functionalCode : null;
}

export function mapUsersError(error: unknown): string {
  const functionalCode = usersFunctionalCode(error);
  if (functionalCode && FUNCTIONAL_MESSAGES[functionalCode]) {
    return FUNCTIONAL_MESSAGES[functionalCode];
  }

  const candidate = asErrorLike(error);
  const firebaseCode = typeof candidate.code === 'string' ? candidate.code : '';
  if (firebaseCode === 'functions/unauthenticated') {
    return FUNCTIONAL_MESSAGES['unauthenticated'] ?? 'La sesión no es válida.';
  }
  if (firebaseCode === 'functions/permission-denied') {
    return FUNCTIONAL_MESSAGES['permission-denied'] ?? 'No tiene permisos.';
  }
  return 'No fue posible completar la operación. Intente nuevamente.';
}
