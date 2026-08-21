import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SystemCampus } from '../../../shared/models/system-campus';
import type { SystemEquipment } from '../../../shared/models/system-equipment';
import { CAMPUSES_GATEWAY, type CampusesGateway } from '../../campuses/data/campuses.gateway';
import { EQUIPMENT_GATEWAY, type EquipmentGateway } from '../data/equipment.gateway';
import { EquipmentPage } from './equipment-page';

const campus: SystemCampus = {
  documentId: 'tup',
  nombre: 'Tecnológico Universitario Playacar',
  nombreNormalizado: 'tecnológico universitario playacar',
  clave: 'TUP',
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
};
function equipment(utilizado = false): SystemEquipment {
  return {
    documentId: utilizado ? 'bocina' : 'pantalla',
    nombre: utilizado ? 'Bocina' : 'Pantalla',
    nombreNormalizado: utilizado ? 'bocina' : 'pantalla',
    campusBaseId: 'tup',
    cantidadOperativa: utilizado ? 2 : 1,
    clasificacion: 'fijo',
    campusDestinoIdsPermitidos: [],
    activo: true,
    utilizado,
    fechaCreacion: null,
    fechaActualizacion: null,
  };
}

describe('EquipmentPage', () => {
  let fixture: ComponentFixture<EquipmentPage>;

  beforeEach(async () => {
    const gateway: EquipmentGateway = {
      list: vi.fn(async () => ({
        items: [equipment(), equipment(true)],
        total: 2,
        maxSupported: 500 as const,
      })),
      listSelectable: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      setStatus: vi.fn(),
      delete: vi.fn(),
    };
    const campuses: CampusesGateway = {
      list: vi.fn(async () => ({ items: [campus], total: 1, maxSupported: 100 as const })),
      listSelectable: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      setStatus: vi.fn(),
      delete: vi.fn(),
    };
    await TestBed.configureTestingModule({
      imports: [EquipmentPage],
      providers: [
        { provide: EQUIPMENT_GATEWAY, useValue: gateway },
        { provide: CAMPUSES_GATEWAY, useValue: campuses },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(EquipmentPage);
    fixture.detectChanges();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect((fixture.nativeElement as HTMLElement).textContent).toContain('Pantalla');
    });
  });

  it('presenta la cantidad como operativa y no como disponibilidad', () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('h1')?.textContent).toContain('Equipos');
    expect(element.textContent).toContain('no representa disponibilidad por fecha u horario');
  });

  it('filtra en vivo sin enviar el formulario', () => {
    const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      '#equipment-search',
    );
    if (!input) throw new Error('Search input missing');
    input.value = 'bocina';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr')).toHaveLength(1);
  });

  it('bloquea eliminar un equipo utilizado y explica la restricción', () => {
    const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      'button[aria-label="Eliminar Bocina"]',
    );
    expect(button?.disabled).toBe(true);
    expect(button?.parentElement?.textContent).toContain('ya fue utilizado');
  });
});
