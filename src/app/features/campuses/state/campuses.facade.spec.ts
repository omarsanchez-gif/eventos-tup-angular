import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SystemCampus } from '../../../shared/models/system-campus';
import { CAMPUSES_GATEWAY, type CampusesGateway } from '../data/campuses.gateway';
import { CampusesFacade } from './campuses.facade';

const record = (id: string, name: string, key: string): SystemCampus => ({
  documentId: id,
  nombre: name,
  nombreNormalizado: name.toLocaleLowerCase('es-MX'),
  clave: key,
  direccion: null,
  referencia: null,
  activo: true,
  utilizado: false,
  horariosSistemas: {
    lunes: { operativo: true, inicio: '08:00', fin: '20:00' },
    martes: { operativo: true, inicio: '08:00', fin: '20:00' },
    miercoles: { operativo: true, inicio: '08:00', fin: '20:00' },
    jueves: { operativo: true, inicio: '08:00', fin: '20:00' },
    viernes: { operativo: true, inicio: '08:00', fin: '20:00' },
    sabado: { operativo: true, inicio: '08:00', fin: '18:00' },
    domingo: { operativo: false, inicio: null, fin: null },
  },
  fechaCreacion: null,
  fechaActualizacion: null,
});

describe('CampusesFacade', () => {
  let gateway: CampusesGateway;
  let facade: CampusesFacade;

  beforeEach(() => {
    gateway = {
      list: vi.fn(async () => ({
        items: [
          record('tup', 'Tecnológico Universitario Playacar', 'TUP'),
          record('fcs', 'Facultad de Ciencias de la Salud', 'FCS'),
        ],
        total: 2,
        maxSupported: 100 as const,
      })),
      listSelectable: vi.fn(),
      create: vi.fn(async () => ({ documentId: 'new', status: 'completed' as const })),
      update: vi.fn(async () => ({ documentId: 'tup', status: 'completed' as const })),
      setStatus: vi.fn(async () => ({
        documentId: 'tup',
        status: 'completed' as const,
      })),
      delete: vi.fn(async () => ({ documentId: 'tup', status: 'completed' as const })),
    };
    TestBed.configureTestingModule({
      providers: [CampusesFacade, { provide: CAMPUSES_GATEWAY, useValue: gateway }],
    });
    facade = TestBed.inject(CampusesFacade);
  });

  it('carga y filtra en vivo por nombre o clave', async () => {
    await facade.load();
    facade.search('fcs');
    expect(facade.visibleRecords().map((item) => item.documentId)).toEqual(['fcs']);
  });

  it('recarga después de una mutación exitosa', async () => {
    await facade.load();
    await expect(facade.setStatus(facade.records()[0]!, false)).resolves.toBe(true);
    expect(gateway.setStatus).toHaveBeenCalledWith({
      documentId: 'tup',
      activo: false,
    });
    expect(gateway.list).toHaveBeenCalledTimes(2);
  });
});
