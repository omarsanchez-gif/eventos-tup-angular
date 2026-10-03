import { describe, expect, it, vi } from 'vitest';

import { createProtocolValidator, type ProtocolBucket } from './protocol-validator.js';

function bucket(metadata: { contentType?: string; size?: string | number }): ProtocolBucket {
  return {
    name: 'eventos-tup-angular-stg.firebasestorage.app',
    file: vi.fn(() => ({
      getMetadata: vi.fn(async () => [metadata] as const),
      delete: vi.fn(async () => undefined),
    })),
  };
}

const validUrl =
  'https://firebasestorage.googleapis.com/v0/b/eventos-tup-angular-stg.firebasestorage.app/o/eventos%2F2026%2Fprotocol.pdf?alt=media&token=test';

describe('validador autoritativo de protocolos', () => {
  it('acepta un PDF almacenado en la ruta y bucket esperados', async () => {
    await expect(
      createProtocolValidator(bucket({ contentType: 'application/pdf', size: '1024' })).validate(
        validUrl,
      ),
    ).resolves.toEqual({ path: 'eventos/2026/protocol.pdf' });
  });

  it('rechaza URLs externas o de otro bucket', async () => {
    await expect(
      createProtocolValidator(bucket({ contentType: 'application/pdf', size: '1024' })).validate(
        'https://example.com/protocol.pdf',
      ),
    ).rejects.toMatchObject({ functionalCode: 'invalid-pdf' });
  });

  it('rechaza tipo incorrecto, archivo vacío o tamaño de 10 MiB', async () => {
    for (const metadata of [
      { contentType: 'text/plain', size: '1024' },
      { contentType: 'application/pdf', size: '0' },
      { contentType: 'application/pdf', size: String(10 * 1024 * 1024) },
    ]) {
      await expect(
        createProtocolValidator(bucket(metadata)).validate(validUrl),
      ).rejects.toMatchObject({ functionalCode: 'invalid-pdf' });
    }
  });
});
