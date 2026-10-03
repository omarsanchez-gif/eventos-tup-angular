import { EventsError } from './events.js';

interface ProtocolMetadata {
  readonly contentType?: string;
  readonly size?: string | number;
}

export interface ProtocolBucket {
  readonly name: string;
  file(path: string): {
    getMetadata(): Promise<readonly [ProtocolMetadata, ...unknown[]]>;
    delete(options?: { readonly ignoreNotFound?: boolean }): Promise<unknown>;
  };
}

function invalid(): never {
  throw new EventsError(
    'invalid-pdf',
    'invalid-argument',
    'El protocolo debe ser un PDF válido menor a 10 MiB.',
  );
}

function objectPath(urlValue: string, expectedBucket: string): string {
  try {
    const url = new URL(urlValue);
    if (url.protocol !== 'https:' || url.hostname !== 'firebasestorage.googleapis.com') invalid();
    const match = /^\/v0\/b\/([^/]+)\/o\/([^/]+)$/u.exec(url.pathname);
    if (!match || decodeURIComponent(match[1] ?? '') !== expectedBucket) invalid();
    const path = decodeURIComponent(match[2] ?? '');
    if (!/^eventos\/\d{4}\/[^/]+\.pdf$/iu.test(path) || path.includes('..')) invalid();
    return path;
  } catch (error) {
    if (error instanceof EventsError) throw error;
    return invalid();
  }
}

export function createProtocolValidator(bucket: ProtocolBucket) {
  return {
    async validate(url: string): Promise<{ readonly path: string }> {
      const path = objectPath(url, bucket.name);
      try {
        const [metadata] = await bucket.file(path).getMetadata();
        const size = Number(metadata.size);
        if (
          metadata.contentType !== 'application/pdf' ||
          !Number.isFinite(size) ||
          size <= 0 ||
          size >= 10 * 1024 * 1024
        ) {
          invalid();
        }
        return { path };
      } catch (error) {
        if (error instanceof EventsError) throw error;
        return invalid();
      }
    },
    async remove(path: string): Promise<void> {
      if (!/^eventos\/\d{4}\/[^/]+\.pdf$/iu.test(path) || path.includes('..')) invalid();
      await bucket.file(path).delete({ ignoreNotFound: true });
    },
  };
}
