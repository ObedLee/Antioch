import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import PWAInstaller from '@/components/PWAInstaller';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '안디옥교회 데이터 관리 시스템',
  description: '안디옥교회 데이터 등록 관리 시스템',
  manifest: '/manifest.json',
  icons: {
    icon: '/images/favicon.ico',
    shortcut: '/images/favicon.ico',
    apple: '/images/favicon.ico',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Antioch Data',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: '안디옥교회 데이터 관리 시스템',
    description: '안디옥교회 데이터 등록 관리 시스템',
    url: 'https://antioch-lsgwbuldq-obeds-projects-5f431bff.vercel.app',
    siteName: '안디옥교회 데이터 관리 시스템',
    images: [
      {
        url: '/images/logo.svg',
        width: 358,
        height: 133,
        alt: '안디옥교회 로고',
      },
    ],
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '안디옥교회 데이터 관리 시스템',
    description: '안디옥교회 데이터 등록 관리 시스템',
    images: ['/images/logo.svg'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#1f2937" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Antioch Data" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512x512.png" />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          {children}
          <PWAInstaller />
        </AuthProvider>
      </body>
    </html>
  );
}
