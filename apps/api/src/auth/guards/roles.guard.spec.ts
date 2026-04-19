import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Roles, RolesGuard, ROLES_KEY } from './roles.guard';
import { AdminPeriodsController } from '../../periods/admin-periods.controller';
import { AdminTradersController } from '../../traders/admin-traders.controller';
import { AdminDepositsController } from '../../deposits/admin-deposits.controller';
import { AdminSupportController } from '../../support/admin-support.controller';
import { AdminUsersController } from '../../users/admin-users.controller';
import { AdminPayoutsController } from '../../payouts/admin-payouts.controller';
import { AdminReportsController } from '../../reports/admin-reports.controller';
import { AdminAuditController } from '../../audit/admin-audit.controller';
import { AdminNotificationsController } from '../../notifications/admin-notifications.controller';
import { AdminDashboardController } from '../../admin/admin-dashboard.controller';

class DummyAdminController {
  @Roles('ADMIN', 'SUPER_ADMIN')
  handler() {
    return true;
  }
}

describe('RolesGuard', () => {
  it('stores declared roles in metadata', () => {
    const target = DummyAdminController.prototype.handler;

    expect(Reflect.getMetadata(ROLES_KEY, target)).toEqual(['ADMIN', 'SUPER_ADMIN']);
  });

  it('reads class-level or handler-level roles and blocks unauthorized users', () => {
    const reflector = new Reflector();
    const guard = new RolesGuard(reflector);
    const request = { user: { role: 'USER' } };

    const context = {
      getHandler: () => DummyAdminController.prototype.handler,
      getClass: () => DummyAdminController,
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    expect(() => guard.canActivate(context)).toThrow('Insufficient permissions');
  });

  it('all admin controllers declare admin-only role metadata', () => {
    const controllers = [
      AdminPeriodsController,
      AdminTradersController,
      AdminDepositsController,
      AdminSupportController,
      AdminUsersController,
      AdminPayoutsController,
      AdminReportsController,
      AdminAuditController,
      AdminNotificationsController,
      AdminDashboardController,
    ];

    for (const controller of controllers) {
      expect(Reflect.getMetadata(ROLES_KEY, controller)).toEqual(['ADMIN', 'SUPER_ADMIN']);
    }
  });
});
