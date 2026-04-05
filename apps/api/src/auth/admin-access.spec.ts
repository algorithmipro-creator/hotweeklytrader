import 'reflect-metadata';
import { ROLES_KEY } from './guards/roles.guard';
import { AdminPeriodsController } from '../periods/admin-periods.controller';
import { AdminUsersController } from '../users/admin-users.controller';
import { AdminSupportController } from '../support/admin-support.controller';
import { AdminDepositsController } from '../deposits/admin-deposits.controller';
import { AdminReportsController } from '../reports/admin-reports.controller';
import { AdminPayoutsController } from '../payouts/admin-payouts.controller';
import { AdminAuditController } from '../audit/admin-audit.controller';
import { AdminNotificationsController } from '../notifications/admin-notifications.controller';
import { AdminDashboardController } from '../admin/admin-dashboard.controller';

describe('Admin access metadata', () => {
  const controllers = [
    AdminPeriodsController,
    AdminUsersController,
    AdminSupportController,
    AdminDepositsController,
    AdminReportsController,
    AdminPayoutsController,
    AdminAuditController,
    AdminNotificationsController,
    AdminDashboardController,
  ];

  it.each(controllers)('%p requires elevated roles', (controllerClass) => {
    expect(Reflect.getMetadata(ROLES_KEY, controllerClass)).toEqual(
      expect.arrayContaining(['ADMIN', 'SUPER_ADMIN']),
    );
  });
});
