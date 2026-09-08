import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SystemCampus } from '../../../shared/models/system-campus';
import { CAMPUSES_GATEWAY, type CampusesGateway } from '../data/campuses.gateway';
import { CampusesPage } from './campuses-page';

function campus(utilizado = false): SystemCampus {
  return {
    documentId: utilizado ? 'tup' : 'fcs',
    nombre: utilizado ? 'Tecnológico Universitario Playacar' : 'Facultad de Ciencias de la Salud',
    nombreNormalizado: utilizado
      ? 'tecnológico universitario playacar'
      : 'facultad de ciencias de la salud',
    clave: utilizado ? 'TUP' : 'FCS',
    direccion: null,
    referencia: null,
    activo: true,
    utilizado,
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
}

describe('CampusesPage', () => {
  let fixture: ComponentFixture<CampusesPage>;
  let gateway: CampusesGateway;

  beforeEach(async () => {
    gateway = {
      list: vi.fn(async () => ({
        items: [campus(), campus(true)],
        total: 2,
        maxSupported: 100 as const,
      })),
      listSelectable: vi.fn(async () => ({ items: [], total: 0 })),
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
    await TestBed.configureTestingModule({
      imports: [CampusesPage],
      providers: [{ provide: CAMPUSES_GATEWAY, useValue: gateway }],
    }).compileComponents();
    fixture = TestBed.createComponent(CampusesPage);
    fixture.detectChanges();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect((fixture.nativeElement as HTMLElement).textContent).toContain('Facultad');
    });
  });

  it('presenta el catálogo y sus horarios', () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('h1')?.textContent).toContain('Campus');
    expect(element.querySelector('table caption')?.textContent).toContain('Catálogo');
    expect(element.textContent).toContain('L–V 08:00–20:00');
  });

  it('filtra en vivo por clave sin enviar el formulario', () => {
    const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      '#campus-search',
    );
    if (!input) throw new Error('Search input missing');
    input.value = 'FCS';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    const rows = (fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr');
    expect(rows).toHaveLength(1);
    expect(rows[0]?.textContent).toContain('Facultad');
  });

  it('bloquea eliminar un campus utilizado y explica la restricción', () => {
    const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      'button[aria-label="Eliminar Tecnológico Universitario Playacar"]',
    );
    expect(button?.disabled).toBe(true);
    expect(button?.parentElement?.textContent).toContain('ya fue utilizado');
  });
});
