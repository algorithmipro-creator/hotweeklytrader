import { BadRequestException } from '@nestjs/common';
import { PeriodTransitionGuard } from './period-transition.guard';

describe('PeriodTransitionGuard', () => {
  it('allows only forward period transitions', () => {
    expect(PeriodTransitionGuard.canTransition('FUNDING', 'TRADING_ACTIVE')).toBe(true);
    expect(PeriodTransitionGuard.canTransition('TRADING_ACTIVE', 'REPORTING')).toBe(true);
    expect(PeriodTransitionGuard.canTransition('REPORTING', 'PAYOUT_IN_PROGRESS')).toBe(true);
    expect(PeriodTransitionGuard.canTransition('PAYOUT_IN_PROGRESS', 'CLOSED')).toBe(true);
    expect(PeriodTransitionGuard.canTransition('TRADING_ACTIVE', 'FUNDING')).toBe(false);
    expect(PeriodTransitionGuard.canTransition('CLOSED', 'FUNDING')).toBe(false);
  });

  it('throws on backward transitions', () => {
    expect(() => PeriodTransitionGuard.assertCanTransition('TRADING_ACTIVE', 'FUNDING')).toThrow(
      BadRequestException,
    );
  });
});
