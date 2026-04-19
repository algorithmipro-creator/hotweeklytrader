import type { Metadata } from 'next';
import Script from 'next/script';
import { AuthProvider } from '../providers/auth-provider';
import { LanguageProvider } from '../providers/language-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Investment Service',
  description: 'Managed trading via Telegram',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
      </head>
      <body>
        <LanguageProvider>
          <AuthProvider>
            <main className="min-h-screen bg-bg text-text">
              {children}
            </main>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}

