import { InjectionToken } from '@angular/core';

import type { DashboardSummary } from '../../../shared/models/dashboard-summary';

export interface DashboardGateway {
  getSummary(): Promise<DashboardSummary>;
}

export const DASHBOARD_GATEWAY = new InjectionToken<DashboardGateway>('DASHBOARD_GATEWAY');
