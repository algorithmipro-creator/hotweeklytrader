import { DepositStatus } from './dto/deposit.dto';

const TRANSITIONS: Record<string, string[]> = {
  CREATED: ['AWAITING_TRANSFER', 'CANCELLED'],
  AWAITING_TRANSFER: ['DETECTED', 'CANCELLED'],
  DETECTED: ['CONFIRMING', 'MANUAL_REVIEW', 'REJECTED'],
  CONFIRMING: ['CONFIRMED', 'MANUAL_REVIEW'],
  CONFIRMED: ['ACTIVE'],
  ACTIVE: ['COMPLETED', 'ON_HOLD'],
  COMPLETED: ['REPORT_READY'],
  REPORT_READY: ['PAYOUT_PENDING'],
  PAYOUT_PENDING: ['PAYOUT_APPROVED', 'ON_HOLD'],
  PAYOUT_APPROVED: ['PAYOUT_SENT'],
  PAYOUT_SENT: ['PAYOUT_CONFIRMED', 'MANUAL_REVIEW'],
  PAYOUT_CONFIRMED: [],
  ON_HOLD: ['ACTIVE', 'MANUAL_REVIEW', 'CANCELLED'],
  MANUAL_REVIEW: ['ACTIVE', 'REJECTED', 'CANCELLED'],
  REJECTED: [],
  CANCELLED: [],
};

export class DepositStateMachine {
  static canTransition(from: string, to: string): boolean {
    const allowed = TRANSITIONS[from];
    return allowed ? allowed.includes(to) : false;
  }

  static getAllowedTransitions(from: string): string[] {
    return TRANSITIONS[from] || [];
  }

  static isTerminal(status: string): boolean {
    const terminal = ['PAYOUT_CONFIRMED', 'REJECTED', 'CANCELLED'];
    return terminal.includes(status);
  }
}
