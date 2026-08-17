import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { afterAll, afterEach, beforeAll, describe, it } from 'vitest';

let environment: RulesTestEnvironment;

describe('Storage authorization rules', () => {
  beforeAll(async () => {
    environment = await initializeTestEnvironment({
      projectId: 'demo-eventos-tup',
      storage: {
        rules: readFileSync(resolve('storage.rules'), 'utf8'),
      },
    });
  });

  afterEach(() => environment.clearStorage());
  afterAll(() => environment.cleanup());

  it('rejects uploads without the authorized claim', async () => {
    const reference = environment
      .authenticatedContext('uid-without-claim')
      .storage()
      .ref('eventos/2026/protocolo.pdf');

    await assertFails(reference.put(new Uint8Array([1, 2, 3]), { contentType: 'application/pdf' }));
  });

  it('allows authorized PDF uploads under 10 MiB', async () => {
    const reference = environment
      .authenticatedContext('authorized-user', { authorized: true, role: 'usuario' })
      .storage()
      .ref('eventos/2026/protocolo.pdf');

    await assertSucceeds(
      reference.put(new Uint8Array([1, 2, 3]), { contentType: 'application/pdf' }),
    );
  });

  it('rejects non-PDF uploads and direct deletion', async () => {
    const storage = environment
      .authenticatedContext('authorized-user', { authorized: true, role: 'usuario' })
      .storage();
    const invalidReference = storage.ref('eventos/2026/protocolo.txt');
    const pdfReference = storage.ref('eventos/2026/protocolo.pdf');

    await assertFails(
      invalidReference.put(new Uint8Array([1, 2, 3]), { contentType: 'text/plain' }),
    );
    await environment.withSecurityRulesDisabled(async (context) => {
      await context
        .storage()
        .ref('eventos/2026/protocolo.pdf')
        .put(new Uint8Array([1, 2, 3]), { contentType: 'application/pdf' });
    });
    await assertFails(pdfReference.delete());
  });
});
