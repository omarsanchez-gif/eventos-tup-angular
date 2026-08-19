import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SystemCoordination } from '../../../shared/models/system-coordination';
import { COORDINATIONS_GATEWAY, type CoordinationsGateway } from '../data/coordinations.gateway';
import { CoordinationsPage } from './coordinations-page';

function coordination(utilizada = false): SystemCoordination {
  return {
    documentId: utilizada ? 'usada' : 'academia',
    nombre: utilizada ? 'Marketing' : 'Academia',
    nombreNormalizado: utilizada ? 'marketing' : 'academia',
    correos: utilizada ? ['marketing@tecplayacar.edu.mx'] : ['academia@tecplayacar.edu.mx'],
    activo: true,
    utilizada,
    fechaCreacion: null,
    fechaActualizacion: null,
  };
}

describe('CoordinationsPage', () => {
  let fixture: ComponentFixture<CoordinationsPage>;
  let gateway: CoordinationsGateway;

  beforeEach(async () => {
    gateway = {
      list: vi.fn(async () => ({
        items: [coordination(), coordination(true)],
        total: 2,
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
    await TestBed.configureTestingModule({
      imports: [CoordinationsPage],
      providers: [{ provide: COORDINATIONS_GATEWAY, useValue: gateway }],
    }).compileComponents();
    fixture = TestBed.createComponent(CoordinationsPage);
    fixture.detectChanges();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect((fixture.nativeElement as HTMLElement).textContent).toContain('Academia');
    });
  });

  it('presenta tabla accesible, datos y estados', () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('h1')?.textContent).toContain('Coordinaciones');
    expect(element.querySelector('table caption')?.textContent).toContain('Catálogo');
    expect(element.textContent).toContain('Academia');
    expect(element.textContent).toContain('Activa');
  });

  it('filtra al escribir sin enviar ni recargar el formulario', () => {
    const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      '#coordination-search',
    );
    if (!input) throw new Error('Search input missing');
    input.value = 'marketing';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    const rows = (fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr');
    expect(rows).toHaveLength(1);
    expect(rows[0]?.textContent).toContain('Marketing');
  });

  it('bloquea eliminación utilizada y explica la restricción', () => {
    const deleteButton = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      'button[aria-label="Eliminar Marketing"]',
    );
    expect(deleteButton?.disabled).toBe(true);
    expect(deleteButton?.parentElement?.textContent).toContain('ya fue utilizada');
  });

  it('limita la lista dinámica a diez correos', () => {
    const createButton = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button'),
    ).find((button) => button.textContent?.includes('Nueva coordinación'));
    createButton?.click();
    fixture.detectChanges();
    for (let index = 1; index < 10; index += 1) {
      const add = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
        '.add-email',
      );
      add?.click();
      fixture.detectChanges();
    }
    expect(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLInputElement>(
        'input[id^="coordination-email-"]',
      ),
    ).toHaveLength(10);
    expect(
      (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.add-email')
        ?.disabled,
    ).toBe(true);
  });

  it('detecta correos duplicados antes de llamar al backend', () => {
    const element = fixture.nativeElement as HTMLElement;
    const createButton = Array.from(element.querySelectorAll<HTMLButtonElement>('button')).find(
      (button) => button.textContent?.includes('Nueva coordinación'),
    );
    createButton?.click();
    fixture.detectChanges();

    const name = element.querySelector<HTMLInputElement>('#coordination-name');
    const firstEmail = element.querySelector<HTMLInputElement>('#coordination-email-0');
    if (!name || !firstEmail) throw new Error('Coordination form missing');
    name.value = 'Academia nueva';
    name.dispatchEvent(new Event('input'));
    firstEmail.value = 'contacto@tecplayacar.edu.mx';
    firstEmail.dispatchEvent(new Event('input'));
    element.querySelector<HTMLButtonElement>('.add-email')?.click();
    fixture.detectChanges();
    const secondEmail = element.querySelector<HTMLInputElement>('#coordination-email-1');
    if (!secondEmail) throw new Error('Second email missing');
    secondEmail.value = 'CONTACTO@TECPLAYACAR.EDU.MX';
    secondEmail.dispatchEvent(new Event('input'));

    element.querySelector<HTMLButtonElement>('button[type="submit"]')?.click();
    fixture.detectChanges();
    expect(gateway.create).not.toHaveBeenCalled();
    expect(element.textContent).toContain('No puede repetir un correo');
  });
});
