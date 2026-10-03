const FUNCTIONAL_MESSAGES: Readonly<Record<string, string>> = {
  unauthenticated: 'La sesión ya no es válida. Inicie sesión nuevamente.',
  'permission-denied': 'No tiene permisos para consultar el Dashboard.',
  'invalid-argument': 'No fue posible solicitar el resumen institucional.',
  'service-unavailable': 'El servicio del Dashboard no está disponible. Intente nuevamente.',
};

export function mapDashboardError(error: unknown): string {
  if (error && typeof error === 'object') {
    const details = (error as { readonly details?: unknown }).details;
    if (details && typeof details === 'object') {
      const functionalCode = (details as { readonly functionalCode?: unknown }).functionalCode;
      if (typeof functionalCode === 'string' && FUNCTIONAL_MESSAGES[functionalCode]) {
        return FUNCTIONAL_MESSAGES[functionalCode];
      }
    }
  }
  return 'No fue posible cargar el Dashboard. Intente nuevamente.';
}
