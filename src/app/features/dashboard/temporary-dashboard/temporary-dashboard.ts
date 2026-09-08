import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { AuthFacade } from '../../../core/auth/auth.facade';

@Component({
  selector: 'app-temporary-dashboard',
  templateUrl: './temporary-dashboard.html',
  styleUrl: './temporary-dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TemporaryDashboard {
  protected readonly auth = inject(AuthFacade);
}
