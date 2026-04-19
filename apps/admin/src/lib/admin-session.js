export const ADMIN_TOKEN_KEY = 'admin_token';

function writeAdminCookie(token) {
  if (typeof document === 'undefined') return;
  document.cookie = `${ADMIN_TOKEN_KEY}=${token}; Path=/; SameSite=Lax`;
}

export function getAdminToken(storage) {
  return storage?.getItem(ADMIN_TOKEN_KEY) || null;
}

export function ensureAdminTokenCookie(storage) {
  const token = getAdminToken(storage);
  if (!token) {
    return null;
  }

  writeAdminCookie(token);
  return token;
}

export function storeAdminToken(storage, token) {
  if (!storage || !token) return;
  storage.setItem(ADMIN_TOKEN_KEY, token);
  writeAdminCookie(token);
}

export function clearAdminToken(storage) {
  if (!storage) return;
  storage.removeItem(ADMIN_TOKEN_KEY);
  writeAdminCookie('; Max-Age=0');
}
