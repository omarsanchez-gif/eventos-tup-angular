import {
  FieldValue,
  Timestamp,
  type DocumentData,
  type Firestore,
  type Query,
} from 'firebase-admin/firestore';

import { validateUpdatedEventWindow } from './event-time.js';
import { buildEventSearchTerms, EventsError } from './events.js';

export interface EventProtocolFile {
  readonly name: string;
  readonly metadata: Readonly<{ timeCreated?: string }>;
  delete(options?: { readonly ignoreNotFound?: boolean }): Promise<unknown>;
}

export interface EventProtocolBucket {
  getFiles(options: {
    readonly prefix: string;
    readonly maxResults: number;
    readonly autoPaginate: false;
  }): Promise<readonly [readonly EventProtocolFile[], ...unknown[]]>;
}

export async function cleanupEventProtocols(input: {
  readonly firestore: Firestore;
  readonly bucket: EventProtocolBucket;
  readonly now?: Date;
}): Promise<{
  readonly inspected: number;
  readonly deleted: number;
  readonly failed: number;
  readonly reconciliationRequired: boolean;
}> {
  const [files] = await input.bucket.getFiles({
    prefix: 'eventos/',
    maxResults: 1001,
    autoPaginate: false,
  });
  const reconciliationRequired = files.length > 1000;
  const now = input.now ?? new Date();
  const threshold = now.getTime() - 24 * 60 * 60_000;
  const candidates = files.slice(0, 1000).filter((file) => {
    const created = file.metadata.timeCreated ? Date.parse(file.metadata.timeCreated) : Number.NaN;
    return (
      file.name.startsWith('eventos/') &&
      /^eventos\/\d{4}\/[^/]+\.pdf$/iu.test(file.name) &&
      Number.isFinite(created) &&
      created <= threshold
    );
  });
  const referenced = new Set<string>();
  for (let offset = 0; offset < candidates.length; offset += 30) {
    const paths = candidates.slice(offset, offset + 30).map((file) => file.name);
    if (!paths.length) continue;
    const snapshot = await input.firestore
      .collection('eventos')
      .where('protocoloRuta', 'in', paths)
      .get();
    snapshot.docs.forEach((document) => {
      const path = document.data()['protocoloRuta'];
      if (typeof path === 'string') referenced.add(path);
    });
  }
  let deleted = 0;
  let failed = 0;
  for (const file of candidates) {
    if (referenced.has(file.name)) continue;
    try {
      await file.delete({ ignoreNotFound: true });
      deleted += 1;
    } catch {
      failed += 1;
    }
  }
  return {
    inspected: Math.min(files.length, 1000),
    deleted,
    failed,
    reconciliationRequired: reconciliationRequired || failed > 0,
  };
}

function requestObject(data: unknown): Readonly<Record<string, unknown>> {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new EventsError('invalid-argument', 'invalid-argument', 'La solicitud no es válida.');
  }
  return data as Readonly<Record<string, unknown>>;
}

export async function backfillEventHistory(input: {
  readonly firestore: Firestore;
  readonly data: unknown;
  readonly now?: Date;
}): Promise<{
  readonly dryRun: boolean;
  readonly processed: number;
  readonly eligible: number;
  readonly updated: number;
  readonly skipped: number;
  readonly nextCursor: string | null;
}> {
  const request = requestObject(input.data);
  if (Object.keys(request).some((key) => !['dryRun', 'cursor', 'limit'].includes(key))) {
    throw new EventsError(
      'invalid-argument',
      'invalid-argument',
      'La solicitud contiene campos no permitidos.',
    );
  }
  if (typeof request['dryRun'] !== 'boolean') {
    throw new EventsError('invalid-argument', 'invalid-argument', 'Debe indicar el modo seco.');
  }
  const dryRun = request['dryRun'];
  const cursor = request['cursor'];
  const limit = request['limit'] === undefined ? 100 : request['limit'];
  if (
    (cursor !== null && cursor !== undefined && typeof cursor !== 'string') ||
    !Number.isInteger(limit) ||
    (limit as number) < 1 ||
    (limit as number) > 100
  ) {
    throw new EventsError('invalid-argument', 'invalid-argument', 'El lote no es válido.');
  }
  let query: Query<DocumentData> = input.firestore
    .collection('eventos')
    .orderBy('__name__')
    .limit((limit as number) + 1);
  if (typeof cursor === 'string' && cursor) query = query.startAfter(cursor);
  const snapshot = await query.get();
  const page = snapshot.docs.slice(0, limit as number);
  const batch = input.firestore.batch();
  let eligible = 0;
  let updated = 0;
  let skipped = 0;
  for (const document of page) {
    const event = document.data();
    if (
      typeof event['fechaInicio'] !== 'string' ||
      typeof event['horaInicio'] !== 'string' ||
      typeof event['fechaFin'] !== 'string' ||
      typeof event['horaFin'] !== 'string' ||
      typeof event['nombreEvento'] !== 'string' ||
      typeof event['responsable'] !== 'string'
    ) {
      skipped += 1;
      continue;
    }
    try {
      const window = validateUpdatedEventWindow(
        event['fechaInicio'],
        event['horaInicio'],
        event['fechaFin'],
        event['horaFin'],
        input.now ?? new Date(),
      );
      const values = {
        inicioAt: Timestamp.fromDate(window.start),
        finAt: Timestamp.fromDate(window.end),
        terminosBusqueda: buildEventSearchTerms(event['nombreEvento'], event['responsable']),
        fechaActualizacion: FieldValue.serverTimestamp(),
      };
      eligible += 1;
      if (!dryRun) {
        batch.update(document.ref, values);
        updated += 1;
      }
    } catch {
      skipped += 1;
    }
  }
  if (!dryRun && updated > 0) await batch.commit();
  const last = page.at(-1);
  return {
    dryRun,
    processed: page.length,
    eligible,
    updated,
    skipped,
    nextCursor: snapshot.docs.length > (limit as number) && last ? last.id : null,
  };
}
