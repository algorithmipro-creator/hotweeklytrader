export function buildUserTonDepositMemo(userId: string): string {
  return `TW${userId.replace(/-/g, '').toUpperCase()}`;
}
