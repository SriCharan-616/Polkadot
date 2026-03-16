'use client';

import { ReactNode } from 'react';
import WalletProvider from '../components/WalletProvider';
import Header from '../components/Header';
import './globals.css';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <WalletProvider>
          <Header />
          <main className="container mx-auto py-8">
            {children}
          </main>
        </WalletProvider>
      </body>
    </html>
  );
}
