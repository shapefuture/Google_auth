'use client';

import type {Metadata} from 'next';
import {Geist, Geist_Mono} from 'next/font/google';
import './globals.css';
import {SessionProvider} from 'next-auth/react';
import {useEffect} from 'react';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  useEffect(() => {
    console.log('RootLayout component mounted');
    return () => {
      console.log('RootLayout component unmounted');
    };
  }, []);

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ClientOnly>{children}</ClientOnly>
      </body>
    </html>
  );
}

function ClientOnly({children}: {children: React.ReactNode}) {
  useEffect(() => {
    console.log('ClientOnly component mounted');
    return () => {
      console.log('ClientOnly component unmounted');
    };
  }, []);

  return (
    <SessionProvider>
      {children}
    </SessionProvider>
  );
}
