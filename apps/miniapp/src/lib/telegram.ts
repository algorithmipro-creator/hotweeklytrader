type TelegramWebAppUser = {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
};

type TelegramWebApp = {
  initData?: string;
  initDataUnsafe?: {
    user?: TelegramWebAppUser;
    start_param?: string;
  };
  ready: () => void;
  expand: () => void;
};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

function getWebApp(): TelegramWebApp | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.Telegram?.WebApp ?? null;
}

export function initTelegramWebApp() {
  const webApp = getWebApp();
  if (webApp?.initData) {
    webApp.ready();
    webApp.expand();
    return webApp;
  }
  return null;
}

export function getInitData(): string | undefined {
  return getWebApp()?.initData;
}

export function getUserFromWebApp() {
  return getWebApp()?.initDataUnsafe?.user ?? null;
}

export function getStartParam(): string | null {
  const startParam = getWebApp()?.initDataUnsafe?.start_param || getStartParamFromInitData();
  if (!startParam) {
    return null;
  }

  return startParam.trim();
}

export function getStartParamFromInitData(): string | null {
  const initData = getInitData();
  if (!initData) {
    return null;
  }

  const rawValue = new URLSearchParams(initData).get('start_param');
  return rawValue?.trim() || null;
}

export function getReferralCodeFromUrl(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawValue = new URLSearchParams(window.location.search).get('ref');
  return rawValue?.trim().toUpperCase() || null;
}

export async function waitForTelegramInitData({
  attempts = 20,
  intervalMs = 150,
}: {
  attempts?: number;
  intervalMs?: number;
} = {}): Promise<string> {
  for (let index = 0; index < attempts; index += 1) {
    const initData = getInitData();
    if (initData) {
      return initData.trim();
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  return '';
}
