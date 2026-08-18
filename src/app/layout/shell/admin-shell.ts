import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthFacade } from '../../core/auth/auth.facade';

const DESKTOP_BREAKPOINT = 960;

@Component({
  selector: 'app-admin-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './admin-shell.html',
  styleUrl: './admin-shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminShell {
  @ViewChild('menuButton') private menuButton?: ElementRef<HTMLButtonElement>;

  protected readonly auth = inject(AuthFacade);
  protected readonly isDesktop = signal(this.readIsDesktop());
  protected readonly sidebarOpen = signal(this.isDesktop());
  protected readonly isAdmin = computed(() => this.auth.user()?.rol === 'admin');
  protected readonly initials = computed(() => this.getInitials(this.auth.user()?.nombre));
  protected readonly roleLabel = computed(() =>
    this.auth.user()?.rol === 'admin' ? 'Administrador' : 'Usuario',
  );

  protected toggleSidebar(): void {
    this.sidebarOpen.update((isOpen) => !isOpen);
  }

  protected closeSidebar(restoreFocus = false): void {
    if (!this.sidebarOpen()) {
      return;
    }

    this.sidebarOpen.set(false);
    if (restoreFocus) {
      setTimeout(() => this.menuButton?.nativeElement.focus());
    }
  }

  protected selectNavigation(): void {
    if (!this.isDesktop()) {
      this.closeSidebar();
    }
  }

  protected logout(): void {
    void this.auth.logout();
  }

  @HostListener('window:resize')
  protected handleViewportChange(): void {
    const desktop = this.readIsDesktop();
    if (desktop === this.isDesktop()) {
      return;
    }

    this.isDesktop.set(desktop);
    this.sidebarOpen.set(desktop);
  }

  @HostListener('document:keydown.escape')
  protected handleEscape(): void {
    if (!this.isDesktop() && this.sidebarOpen()) {
      this.closeSidebar(true);
    }
  }

  private readIsDesktop(): boolean {
    return typeof window === 'undefined' || window.innerWidth >= DESKTOP_BREAKPOINT;
  }

  private getInitials(name: string | undefined): string {
    if (!name?.trim()) {
      return 'TUP';
    }

    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toLocaleUpperCase('es-MX'))
      .join('');
  }
}
