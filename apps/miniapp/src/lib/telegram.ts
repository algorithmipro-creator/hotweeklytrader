import WebApp from '@twa-dev/sdk';

export function initTelegramWebApp() {
  if (typeof window !== 'undefined' && WebApp.initData) {
    WebApp.ready();
    WebApp.expand();
    return WebApp;
  }
  return null;
}

export function getInitData(): string | undefined {
  if (typeof window !== 'undefined') {
    return WebApp.initData;
  }
  return undefined;
}

export function getUserFromWebApp() {
  if (typeof window !== 'undefined' && WebApp.initDataUnsafe?.user) {
    return WebApp.initDataUnsafe.user;
  }
  return null;
}

export { WebApp };
