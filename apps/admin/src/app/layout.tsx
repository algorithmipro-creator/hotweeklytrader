import type { Metadata } from 'next';
import Script from 'next/script';
import { AuthProvider } from '../providers/auth-provider';
import { Sidebar } from '../components/sidebar';
import './globals.css';

export const metadata: Metadata = {
  title: 'Admin Panel — Investment Service',
  description: 'Admin panel for managing the investment service',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-bg text-text">
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
        <AuthProvider>
          <div className="flex">
            <Sidebar />
            <main className="flex-1 p-6 overflow-auto">
              {children}
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
