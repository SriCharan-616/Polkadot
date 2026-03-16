'use client';

import { useContext } from 'react';
import { WalletContext } from '../components/WalletProvider';

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    return {
      address: null,
      accounts: [],
      selectAccount: () => {},
      disconnect: () => {},
      isConnected: false
    };
  }
  return context;
}
