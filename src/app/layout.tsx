import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ClientLayoutSwitch } from './ClientLayoutSwitch';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/components/providers/AuthProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'TradingPlatform - Learn, Share, Trade',
  description: 'A comprehensive trading platform combining education and community features for traders of all levels.',
  keywords: 'trading, forex, crypto, education, community, mentorship',
  authors: [{ name: 'TradingPlatform Team' }],
  metadataBase: new URL("http:localhost:3000"), // ganti ke domain asli kamu
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
  },
  openGraph: {
    title: 'TradingPlatform - Learn, Share, Trade',
    description: 'A comprehensive trading platform combining education and community features.',
    type: 'website',
    locale: 'en_US',
    url: "http:localhost:3000", // optional
    siteName: "TradingPlatform",
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TradingPlatform - Learn, Share, Trade',
    description: 'A comprehensive trading platform combining education and community features.',
  },

  icons: {
    icon: '/icon_tp-removebg-preview.png',   
  },
};


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full flex flex-col`}>
        <AuthProvider>
          <ClientLayoutSwitch>{children}</ClientLayoutSwitch>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#22c55e',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 5000,
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}

