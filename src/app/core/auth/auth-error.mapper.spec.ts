import { describe, expect, it } from 'vitest';

import { mapAuthError } from './auth-error.mapper';

describe('mapAuthError', () => {
  it('maps an unauthorized user without exposing technical details', () => {
    expect(mapAuthError({ details: { functionalCode: 'user-not-authorized' } })).toBe(
      'Usuario no autorizado.',
    );
  });

  it('maps a cancelled popup to a retryable message', () => {
    expect(mapAuthError({ code: 'auth/popup-closed-by-user' })).toContain(
      'Puede intentarlo nuevamente',
    );
  });

  it('uses a safe fallback for unknown failures', () => {
    expect(mapAuthError(new Error('secret technical detail'))).toBe(
      'No fue posible iniciar sesión. Intente nuevamente.',
    );
  });
});
