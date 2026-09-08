import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import type { SystemUser } from '../../../shared/models/system-user';
import { USERS_GATEWAY, type UsersGateway } from '../data/users.gateway';
import { UsersFacade } from './users.facade';

const records: readonly SystemUser[] = Array.from({ length: 12 }, (_, index) => ({
  documentId: `user-${index}`,
  uid: index === 0 ? 'admin-uid' : null,
  nombre: index === 0 ? 'Omar Sanchez' : `Persona ${index}`,
  correo: index === 0 ? 'omar@tecplayacar.edu.mx' : `persona${index}@tecplayacar.edu.mx`,
  rol: index === 0 ? ('admin' as const) : ('usuario' as const),
  activo: true,
  fechaCreacion: null,
  ultimoAcceso: null,
}));

describe('UsersFacade', () => {
  let facade: UsersFacade;
  let gateway: UsersGateway;

  beforeEach(() => {
    gateway = {
      list: vi.fn().mockResolvedValue({
        items: records,
        total: records.length,
        maxSupported: 500,
      }),
      create: vi.fn().mockResolvedValue({ documentId: 'new-user', status: 'completed' }),
      update: vi.fn().mockResolvedValue({ documentId: 'user-1', status: 'completed' }),
      setStatus: vi.fn().mockResolvedValue({ documentId: 'user-1', status: 'completed' }),
      delete: vi.fn().mockResolvedValue({ documentId: 'user-1', status: 'completed' }),
    };
    TestBed.configureTestingModule({
      providers: [UsersFacade, { provide: USERS_GATEWAY, useValue: gateway }],
    });
    facade = TestBed.inject(UsersFacade);
  });

  it('loads once, paginates locally and exposes the approved page size', async () => {
    await Promise.all([facade.load(), facade.load()]);
    expect(gateway.list).toHaveBeenCalledOnce();
    expect(facade.visibleUsers()).toHaveLength(10);
    expect(facade.totalPages()).toBe(2);

    facade.setPageSize(5);
    facade.setPage(2);
    expect(facade.visibleUsers()).toHaveLength(5);
    expect(facade.page()).toBe(2);
  });

  it('searches name and email without case sensitivity and resets the page', async () => {
    await facade.load();
    facade.setPage(2);
    facade.search('  OMAR@TECPLAYACAR  ');
    expect(facade.page()).toBe(1);
    expect(facade.filteredUsers().map((user) => user.documentId)).toEqual(['user-0']);
  });

  it('reloads after a completed mutation and announces success', async () => {
    await facade.load();
    const completed = await facade.setStatus(records[1]!, false);
    expect(completed).toBe(true);
    expect(gateway.setStatus).toHaveBeenCalledWith({
      documentId: 'user-1',
      activo: false,
    });
    expect(gateway.list).toHaveBeenCalledTimes(2);
    expect(facade.notice()).toContain('desactivado');
  });

  it('preserves the list and shows a persistent reconciliation warning', async () => {
    await facade.load();
    vi.mocked(gateway.update).mockRejectedValue({
      details: { functionalCode: 'reconciliation-required' },
    });
    const completed = await facade.update({
      documentId: 'user-1',
      nombre: 'Persona 1',
      correo: 'persona1@tecplayacar.edu.mx',
      rol: 'usuario',
    });
    expect(completed).toBe(false);
    expect(facade.users()).toHaveLength(records.length);
    expect(facade.reconciliation()).toContain('reconciliación');
    expect(gateway.list).toHaveBeenCalledOnce();
  });
});
