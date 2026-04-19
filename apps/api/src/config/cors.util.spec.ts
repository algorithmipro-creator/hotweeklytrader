import { parseCorsOrigins } from './cors.util';

describe('parseCorsOrigins', () => {
  it('returns true for wildcard origin', () => {
    expect(parseCorsOrigins('*')).toBe(true);
  });

  it('returns a trimmed array for comma-separated origins', () => {
    expect(parseCorsOrigins(' https://hotweeklytrader.duckdns.org , https://hotweeklytrader-admin.duckdns.org '))
      .toEqual([
        'https://hotweeklytrader.duckdns.org',
        'https://hotweeklytrader-admin.duckdns.org',
      ]);
  });

  it('falls back to true when the string is empty', () => {
    expect(parseCorsOrigins('   ')).toBe(true);
  });
});
