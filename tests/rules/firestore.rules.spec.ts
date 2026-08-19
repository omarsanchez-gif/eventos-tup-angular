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

describe('Firestore authorization rules', () => {
  beforeAll(async () => {
    environment = await initializeTestEnvironment({
      projectId: 'demo-eventos-tup',
      firestore: {
        rules: readFileSync(resolve('firestore.rules'), 'utf8'),
      },
    });
  });

  afterEach(() => environment.clearFirestore());
  afterAll(() => environment.cleanup());

  it('rejects authenticated users without the authorized claim', async () => {
    const firestore = environment.authenticatedContext('uid-without-claim').firestore();
    await assertFails(firestore.collection('eventos').get());
  });

  it('allows an authorized user to read events', async () => {
    const firestore = environment
      .authenticatedContext('authorized-user', {
        authorized: true,
        role: 'usuario',
      })
      .firestore();
    await assertSucceeds(firestore.collection('eventos').get());
  });

  it('allows only an authorized admin to read users', async () => {
    const anonymousFirestore = environment.unauthenticatedContext().firestore();
    const claimlessFirestore = environment.authenticatedContext('claimless-user').firestore();
    const userFirestore = environment
      .authenticatedContext('regular-user', {
        authorized: true,
        role: 'usuario',
      })
      .firestore();
    const adminFirestore = environment
      .authenticatedContext('admin-user', { authorized: true, role: 'admin' })
      .firestore();

    await assertFails(anonymousFirestore.collection('usuarios').get());
    await assertFails(claimlessFirestore.collection('usuarios').get());
    await assertFails(userFirestore.collection('usuarios').get());
    await assertSucceeds(adminFirestore.collection('usuarios').get());
  });

  it('blocks direct user writes even for an authorized admin', async () => {
    const adminDocument = environment
      .authenticatedContext('admin-user', { authorized: true, role: 'admin' })
      .firestore()
      .doc('usuarios/new-user');

    await assertFails(
      adminDocument.set({
        uid: null,
        nombre: 'Persona Nueva',
        correo: 'persona@tecplayacar.edu.mx',
        rol: 'usuario',
        activo: true,
      }),
    );
    await assertFails(adminDocument.update({ activo: false }));
    await assertFails(adminDocument.delete());
  });

  it('allows only admin to read complete coordination documents', async () => {
    const anonymousFirestore = environment.unauthenticatedContext().firestore();
    const userFirestore = environment
      .authenticatedContext('regular-user', {
        authorized: true,
        role: 'usuario',
      })
      .firestore();
    const adminFirestore = environment
      .authenticatedContext('admin-user', { authorized: true, role: 'admin' })
      .firestore();

    await assertFails(anonymousFirestore.collection('coordinaciones').get());
    await assertFails(userFirestore.collection('coordinaciones').get());
    await assertSucceeds(adminFirestore.collection('coordinaciones').get());
  });

  it('blocks direct coordination writes for every client role', async () => {
    const userDocument = environment
      .authenticatedContext('regular-user', {
        authorized: true,
        role: 'usuario',
      })
      .firestore()
      .doc('coordinaciones/academia');
    const adminDocument = environment
      .authenticatedContext('admin-user', { authorized: true, role: 'admin' })
      .firestore()
      .doc('coordinaciones/academia');
    const data = {
      nombre: 'Academia',
      nombreNormalizado: 'academia',
      correos: ['academia@tecplayacar.edu.mx'],
      activo: true,
      utilizada: false,
    };

    await assertFails(userDocument.set(data));
    await assertFails(adminDocument.set(data));
    await assertFails(adminDocument.update({ activo: false }));
    await assertFails(adminDocument.delete());
  });

  it('allows event updates only to the creator and blocks direct deletion', async () => {
    await environment.withSecurityRulesDisabled(async (context) => {
      await context.firestore().doc('eventos/event-1').set({
        nombreEvento: 'Evento de prueba',
        creadoPorUid: 'creator-uid',
      });
    });

    const ownerDocument = environment
      .authenticatedContext('creator-uid', {
        authorized: true,
        role: 'usuario',
      })
      .firestore()
      .doc('eventos/event-1');
    const otherDocument = environment
      .authenticatedContext('other-uid', { authorized: true, role: 'usuario' })
      .firestore()
      .doc('eventos/event-1');

    await assertSucceeds(ownerDocument.update({ nombreEvento: 'Actualizado' }));
    await assertFails(otherDocument.update({ nombreEvento: 'Sin permiso' }));
    await assertFails(ownerDocument.delete());
  });
});
