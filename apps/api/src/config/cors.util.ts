export function parseCorsOrigins(value?: string): true | string[] {
  if (!value) {
    return true;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed === '*') {
    return true;
  }

  const origins = trimmed
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return origins.length > 0 ? origins : true;
}
