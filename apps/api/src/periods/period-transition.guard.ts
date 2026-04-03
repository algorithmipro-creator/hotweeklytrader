import { BadRequestException } from '@nestjs/common';

export const PERIOD_TRANSITIONS: Record<string, string[]> = {
  FUNDING: ['TRADING_ACTIVE'],
  TRADING_ACTIVE: ['REPORTING'],
  REPORTING: ['PAYOUT_IN_PROGRESS'],
  PAYOUT_IN_PROGRESS: ['CLOSED'],
  CLOSED: [],
};

export class PeriodTransitionGuard {
  static canTransition(from: string, to: string): boolean {
    const allowedTransitions = PERIOD_TRANSITIONS[from];
    return allowedTransitions ? allowedTransitions.includes(to) : false;
  }

  static getAllowedTransitions(from: string): string[] {
    return PERIOD_TRANSITIONS[from] || [];
  }

  static assertCanTransition(from: string, to: string) {
    if (!this.canTransition(from, to)) {
      throw new BadRequestException(
        `Cannot transition period from ${from} to ${to}. Allowed: ${this.getAllowedTransitions(from).join(', ') || 'none'}`,
      );
    }
  }
}
