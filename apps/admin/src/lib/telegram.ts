type TelegramWebApp = {
  initData?: string;
  ready?: () => void;
};

type TelegramWindow = Window & {
  Telegram?: {
    WebApp?: TelegramWebApp;
  };
};

function getClientWindow(win?: Window): TelegramWindow | undefined {
  if (win) {
    return win as TelegramWindow;
  }

  if (typeof window === 'undefined') {
    return undefined;
  }

  return window as TelegramWindow;
}

function getTelegramWebApp(win?: Window) {
  return getClientWindow(win)?.Telegram?.WebApp;
}

export function getTelegramInitData(win?: Window) {
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
  win,
  attempts = 20,
  intervalMs = 150,
}: {
  win?: Window;
  attempts?: number;
  intervalMs?: number;
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
