import { computed, inject, Injectable, signal } from '@angular/core';

import type { DashboardSummary } from '../../../shared/models/dashboard-summary';
import { DASHBOARD_GATEWAY } from '../data/dashboard.gateway';
import { mapDashboardError } from '../data/dashboard-error.mapper';

@Injectable()
export class DashboardFacade {
  private readonly gateway = inject(DASHBOARD_GATEWAY);
  private readonly summaryState = signal<DashboardSummary | null>(null);
  private readonly loadingState = signal(false);
  private readonly errorState = signal<string | null>(null);

  readonly summary = this.summaryState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly hasPartialData = computed(
    () => (this.summaryState()?.unavailableSections.length ?? 0) > 0,
  );

  async load(): Promise<void> {
    if (this.loadingState()) return;
    this.loadingState.set(true);
    this.errorState.set(null);
    try {
      this.summaryState.set(await this.gateway.getSummary());
    } catch (error) {
      this.summaryState.set(null);
      this.errorState.set(mapDashboardError(error));
    } finally {
      this.loadingState.set(false);
    }
  }
}
