import type { Metadata } from 'next';
import { AuthProvider } from '../providers/auth-provider';
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
      <body>
        <AuthProvider>
          <main className="min-h-screen bg-bg text-text">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
