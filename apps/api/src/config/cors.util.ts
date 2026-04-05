export function resolveCorsOrigin(corsOrigin: string | undefined): string | string[] {
  if (!corsOrigin) {
    return '*';
  }

  const origins = corsOrigin
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0) {
    return '*';
  }

  return origins.length === 1 ? origins[0] : origins;
}
