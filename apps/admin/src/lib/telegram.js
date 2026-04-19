function getTelegramWebApp(win = typeof window !== 'undefined' ? window : undefined) {
  return win?.Telegram?.WebApp;
}

export function getTelegramInitData(win = typeof window !== 'undefined' ? window : undefined) {
  const webApp = getTelegramWebApp(win);
  if (!webApp) {
    return '';
  }

  try {
    webApp.ready?.();
  } catch {
    // Ignore readiness errors and keep probing for initData.
  }

  return typeof webApp.initData === 'string' ? webApp.initData.trim() : '';
}

export async function waitForTelegramInitData({
  win = typeof window !== 'undefined' ? window : undefined,
  attempts = 20,
  intervalMs = 150,
} = {}) {
  for (let index = 0; index < attempts; index += 1) {
    const initData = getTelegramInitData(win);
    if (initData) {
      return initData;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  return '';
}
