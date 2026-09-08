import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SystemCoordination } from '../../../shared/models/system-coordination';
import { COORDINATIONS_GATEWAY, type CoordinationsGateway } from '../data/coordinations.gateway';
import { CoordinationsFacade } from './coordinations.facade';

function coordination(documentId: string, nombre: string): SystemCoordination {
  return {
    documentId,
    nombre,
    nombreNormalizado: nombre.toLocaleLowerCase('es-MX'),
    correos: [`${documentId}@tecplayacar.edu.mx`],
    activo: true,
    utilizada: false,
    fechaCreacion: null,
    fechaActualizacion: null,
  };
}

describe('CoordinationsFacade', () => {
  let facade: CoordinationsFacade;
  let gateway: CoordinationsGateway;
  const records = [coordination('academia', 'Academia'), coordination('deportes', 'Deportes')];

  beforeEach(() => {
    gateway = {
      list: vi.fn(async () => ({
        items: records,
        total: records.length,
        maxSupported: 500 as const,
      })),
      listSelectable: vi.fn(async () => ({ items: [], total: 0 })),
      create: vi.fn(async () => ({
        documentId: 'new',
        status: 'completed' as const,
      })),
      update: vi.fn(async (input) => ({
        documentId: input.documentId,
        status: 'completed' as const,
      })),
      setStatus: vi.fn(async (input) => ({
        documentId: input.documentId,
        status: 'completed' as const,
      })),
      delete: vi.fn(async (documentId) => ({
        documentId,
        status: 'completed' as const,
      })),
    };
    TestBed.configureTestingModule({
      providers: [CoordinationsFacade, { provide: COORDINATIONS_GATEWAY, useValue: gateway }],
    });
    facade = TestBed.inject(CoordinationsFacade);
  });

  it('carga y expone el catálogo', async () => {
    await facade.load();
    expect(facade.records()).toEqual(records);
    expect(facade.resultCount()).toBe(2);
  });

  it('filtra por nombre o correo mientras se escribe', async () => {
    await facade.load();
    facade.search('deportes');
    expect(facade.filteredRecords().map((item) => item.documentId)).toEqual(['deportes']);
    facade.search('academia@');
    expect(facade.filteredRecords().map((item) => item.documentId)).toEqual(['academia']);
  });

  it('pagina solo con los tamaños aprobados', async () => {
    vi.mocked(gateway.list).mockResolvedValue({
      items: Array.from({ length: 12 }, (_, index) => coordination(`c${index}`, `Coord ${index}`)),
      total: 12,
      maxSupported: 500 as const,
    });
    await facade.load();
    facade.setPageSize(5);
    facade.setPage(2);
    expect(facade.visibleRecords()).toHaveLength(5);
    facade.setPageSize(7);
    expect(facade.pageSize()).toBe(5);
  });

  it('crea, informa éxito y vuelve a cargar', async () => {
    await facade.load();
    const completed = await facade.create({
      nombre: 'Marketing',
      correos: ['marketing@tecplayacar.edu.mx'],
      activo: true,
    });
    expect(completed).toBe(true);
    expect(gateway.create).toHaveBeenCalledOnce();
    expect(gateway.list).toHaveBeenCalledTimes(2);
    expect(facade.notice()).toContain('creada');
  });

  it('muestra error funcional y no comunica éxito', async () => {
    vi.mocked(gateway.create).mockRejectedValue({
      details: { functionalCode: 'coordination-name-exists' },
    });
    const completed = await facade.create({
      nombre: 'Academia',
      correos: ['academia@tecplayacar.edu.mx'],
      activo: true,
    });
    expect(completed).toBe(false);
    expect(facade.error()).toContain('Ya existe');
    expect(facade.notice()).toBeNull();
  });
});
