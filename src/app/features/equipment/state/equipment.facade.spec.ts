import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SystemCampus } from '../../../shared/models/system-campus';
import type { SystemEquipment } from '../../../shared/models/system-equipment';
import { CAMPUSES_GATEWAY, type CampusesGateway } from '../../campuses/data/campuses.gateway';
import { EQUIPMENT_GATEWAY, type EquipmentGateway } from '../data/equipment.gateway';
import { EquipmentFacade } from './equipment.facade';

const campus = (id: string, nombre: string, clave: string): SystemCampus => ({
  documentId: id,
  nombre,
  nombreNormalizado: nombre.toLocaleLowerCase('es-MX'),
  clave,
  direccion: null,
  referencia: null,
  activo: true,
  utilizado: true,
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
const record = (id: string, nombre: string, campusBaseId: string): SystemEquipment => ({
  documentId: id,
  nombre,
  nombreNormalizado: nombre.toLocaleLowerCase('es-MX'),
  campusBaseId,
  cantidadOperativa: 2,
  clasificacion: 'fijo',
  campusDestinoIdsPermitidos: [],
  activo: true,
  utilizado: false,
  fechaCreacion: null,
  fechaActualizacion: null,
});

describe('EquipmentFacade', () => {
  let gateway: EquipmentGateway;
  let facade: EquipmentFacade;

  beforeEach(() => {
    gateway = {
      list: vi.fn(async () => ({
        items: [record('bocina', 'Bocina', 'tup'), record('pantalla', 'Pantalla', 'fcs')],
        total: 2,
        maxSupported: 500 as const,
      })),
      listSelectable: vi.fn(),
      create: vi.fn(async () => ({ documentId: 'new', status: 'completed' as const })),
      update: vi.fn(async (input) => ({
        documentId: input.documentId,
        status: 'completed' as const,
      })),
      setStatus: vi.fn(async (input) => ({
        documentId: input.documentId,
        status: 'completed' as const,
      })),
      delete: vi.fn(async (id) => ({ documentId: id, status: 'completed' as const })),
    };
    const campuses: CampusesGateway = {
      list: vi.fn(async () => ({
        items: [
          campus('tup', 'Tecnológico Universitario Playacar', 'TUP'),
          campus('fcs', 'Facultad de Ciencias de la Salud', 'FCS'),
        ],
        total: 2,
        maxSupported: 100 as const,
      })),
      listSelectable: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      setStatus: vi.fn(),
      delete: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        EquipmentFacade,
        { provide: EQUIPMENT_GATEWAY, useValue: gateway },
        { provide: CAMPUSES_GATEWAY, useValue: campuses },
      ],
    });
    facade = TestBed.inject(EquipmentFacade);
  });

  it('carga equipos y campus y filtra en vivo por el nombre del campus', async () => {
    await facade.load();
    facade.search('ciencias');
    expect(facade.visibleRecords().map((item) => item.documentId)).toEqual(['pantalla']);
  });

  it('recarga el catálogo después de una mutación exitosa', async () => {
    await facade.load();
    await expect(facade.setStatus(facade.records()[0]!, false)).resolves.toBe(true);
    expect(gateway.setStatus).toHaveBeenCalledWith({ documentId: 'bocina', activo: false });
    expect(gateway.list).toHaveBeenCalledTimes(2);
  });
});
