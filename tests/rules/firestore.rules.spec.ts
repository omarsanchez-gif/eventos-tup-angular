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

  it('allows only admin to read complete campus documents', async () => {
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

    await assertFails(anonymousFirestore.collection('campus').get());
    await assertFails(userFirestore.collection('campus').get());
    await assertSucceeds(adminFirestore.collection('campus').get());
  });

  it('blocks direct campus writes for every client role', async () => {
    const adminDocument = environment
      .authenticatedContext('admin-user', { authorized: true, role: 'admin' })
      .firestore()
      .doc('campus/tup');
    await assertFails(
      adminDocument.set({
        nombre: 'Tecnológico Universitario Playacar',
        nombreNormalizado: 'tecnológico universitario playacar',
        clave: 'TUP',
        activo: true,
        utilizado: false,
      }),
    );
    await assertFails(adminDocument.update({ activo: false }));
    await assertFails(adminDocument.delete());
  });

  it('allows only admin to read complete equipment documents', async () => {
    const anonymousFirestore = environment.unauthenticatedContext().firestore();
    const userFirestore = environment
      .authenticatedContext('regular-user', { authorized: true, role: 'usuario' })
      .firestore();
    const adminFirestore = environment
      .authenticatedContext('admin-user', { authorized: true, role: 'admin' })
      .firestore();

    await assertFails(anonymousFirestore.collection('equipos').get());
    await assertFails(userFirestore.collection('equipos').get());
    await assertSucceeds(adminFirestore.collection('equipos').get());
  });

  it('blocks direct equipment writes for every client role', async () => {
    const adminDocument = environment
      .authenticatedContext('admin-user', { authorized: true, role: 'admin' })
      .firestore()
      .doc('equipos/speaker');
    await assertFails(
      adminDocument.set({
        nombre: 'Bocina',
        nombreNormalizado: 'bocina',
        campusBaseId: 'tup',
        cantidadOperativa: 2,
        clasificacion: 'transferible',
        campusDestinoIdsPermitidos: ['fcs'],
        activo: true,
        utilizado: false,
      }),
    );
    await assertFails(adminDocument.update({ cantidadOperativa: 1 }));
    await assertFails(adminDocument.delete());
  });

  it('blocks every direct event mutation, including the creator and admin', async () => {
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
    const adminDocument = environment
      .authenticatedContext('admin-uid', { authorized: true, role: 'admin' })
      .firestore()
      .doc('eventos/event-1');

    await assertFails(ownerDocument.set({ nombreEvento: 'Nuevo', creadoPorUid: 'creator-uid' }));
    await assertFails(ownerDocument.update({ nombreEvento: 'Actualizado' }));
    await assertFails(adminDocument.update({ nombreEvento: 'Cambio administrativo' }));
    await assertFails(ownerDocument.delete());
  });

  it('protects reservations, controls, notifications and configuration from every client', async () => {
    const userFirestore = environment
      .authenticatedContext('regular-user', { authorized: true, role: 'usuario' })
      .firestore();
    const adminFirestore = environment
      .authenticatedContext('admin-user', { authorized: true, role: 'admin' })
      .firestore();
    const paths = [
      'reservasEquipo/reservation-1',
      'controlReservasEquipo/speaker',
      'notificacionesEventos/notification-1',
      'configuracion/logisticaEquipos',
    ];

    for (const path of paths) {
      await assertFails(userFirestore.doc(path).get());
      await assertFails(adminFirestore.doc(path).get());
      await assertFails(adminFirestore.doc(path).set({ test: true }));
      await assertFails(adminFirestore.doc(path).update({ test: false }));
      await assertFails(adminFirestore.doc(path).delete());
    }
  });
});
