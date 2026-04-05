import { resolveCorsOrigin } from './cors.util';

describe('resolveCorsOrigin', () => {
  it('returns wildcard when env is missing', () => {
    expect(resolveCorsOrigin(undefined)).toBe('*');
  });

  it('returns a single origin string unchanged', () => {
    expect(resolveCorsOrigin('https://hotweeklytrader.duckdns.org')).toBe(
      'https://hotweeklytrader.duckdns.org',
    );
  });

  it('splits comma-separated origins into an array', () => {
    expect(
      resolveCorsOrigin(
        'https://hotweeklytrader.duckdns.org, https://hotweeklytrader-admin.duckdns.org',
      ),
    ).toEqual([
      'https://hotweeklytrader.duckdns.org',
      'https://hotweeklytrader-admin.duckdns.org',
    ]);
  });
});
