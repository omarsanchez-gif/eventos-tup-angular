const FUNCTIONAL_MESSAGES: Readonly<Record<string, string>> = {
  'domain-not-allowed': 'Utilice una cuenta del dominio institucional.',
  'user-not-authorized': 'Usuario no autorizado.',
  'user-inactive': 'Usuario inactivo.',
  'uid-conflict': 'La cuenta está vinculada con otra identidad. Contacte al administrador.',
  'invalid-role': 'El usuario no tiene un rol válido. Contacte al administrador.',
  unauthenticated: 'La sesión no es válida. Inicie sesión nuevamente.',
  'service-unavailable': 'El servicio no está disponible. Intente nuevamente.',
};

const FIREBASE_MESSAGES: Readonly<Record<string, string>> = {
  'auth/popup-closed-by-user': 'Inicio de sesión cancelado. Puede intentarlo nuevamente.',
  'auth/cancelled-popup-request': 'Inicio de sesión cancelado. Puede intentarlo nuevamente.',
  'auth/popup-blocked': 'El navegador bloqueó la ventana de acceso. Permita ventanas emergentes.',
  'auth/network-request-failed': 'No fue posible conectar con el servicio. Revise su conexión.',
  'auth/unauthorized-domain': 'Este sitio no está autorizado para iniciar sesión.',
  'functions/unavailable': 'El servicio no está disponible. Intente nuevamente.',
  'functions/deadline-exceeded': 'El servicio tardó demasiado. Intente nuevamente.',
};

interface ErrorLike {
  readonly code?: unknown;
  readonly details?: unknown;
  readonly functionalCode?: unknown;
}

function asErrorLike(error: unknown): ErrorLike {
  return typeof error === 'object' && error !== null ? (error as ErrorLike) : {};
}

export function mapAuthError(error: unknown): string {
  const candidate = asErrorLike(error);
  const details = asErrorLike(candidate.details);
  const functionalCode =
    typeof details.functionalCode === 'string' ? details.functionalCode : undefined;

  if (functionalCode && FUNCTIONAL_MESSAGES[functionalCode]) {
    return FUNCTIONAL_MESSAGES[functionalCode];
  }

  const firebaseCode = typeof candidate.code === 'string' ? candidate.code : undefined;
  return (
    (firebaseCode ? FIREBASE_MESSAGES[firebaseCode] : undefined) ??
    'No fue posible iniciar sesión. Intente nuevamente.'
  );
}
