import type { Metadata } from 'next';
import Script from 'next/script';
import { AuthProvider } from '../providers/auth-provider';
import { AuthShell } from '../components/auth-shell';
import './globals.css';

export const metadata: Metadata = {
  title: 'Admin Panel — Investment Service',
  description: 'Admin panel for managing the investment service',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-bg text-text">
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
        <AuthProvider>
          <AuthShell>{children}</AuthShell>
        </AuthProvider>
      </body>
    </html>
  );
}
