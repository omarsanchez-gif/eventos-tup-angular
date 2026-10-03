import { inject, Injectable } from '@angular/core';
import { httpsCallable } from 'firebase/functions';

import { FIREBASE_FUNCTIONS } from '../../../core/firebase/firebase.tokens';
import type { DashboardSummary } from '../../../shared/models/dashboard-summary';
import type { DashboardGateway } from './dashboard.gateway';

@Injectable()
export class FirebaseDashboardGateway implements DashboardGateway {
  private readonly functions = inject(FIREBASE_FUNCTIONS);

  async getSummary(): Promise<DashboardSummary> {
    const callable = httpsCallable<Record<string, never>, DashboardSummary>(
      this.functions,
      'getDashboardSummary',
    );
    return (await callable({})).data;
  }
}
