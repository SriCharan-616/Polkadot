'use client';

import { createContext, ReactNode, useState, useEffect } from 'react';

interface Account {
  address: string;
  name: string;
}

export interface WalletContextType {
  address: string | null;
  accounts: Account[];
  selectAccount: (address: string) => void;
  disconnect: () => void;
  isConnected: boolean;
}

export const WalletContext = createContext<WalletContextType | undefined>(undefined);

export default function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    connectWallet();
  }, []);

  const connectWallet = async () => {
    if (typeof window === 'undefined') return; // SSR check
    
    try {
      // Dynamically import Polkadot functions (only on client side)
      const { web3Enable, web3AccountsSubscribe } = await import('@polkadot/extension-dapp');
      
      const extensions = await web3Enable('Private Proposal Voting');
      if (!extensions || extensions.length === 0) {
        console.log('Polkadot extension not found or not enabled');
        return;
      }

      await web3AccountsSubscribe((accounts) => {
        if (accounts && accounts.length > 0) {
          setAccounts(
            accounts.map(acc => ({
              address: acc.address,
              name: acc.meta.name || 'Unknown'
            }))
          );

          // Set first account as default
          setAddress(accounts[0].address);
          setIsConnected(true);
        }
      });
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  const selectAccount = (newAddress: string) => {
    setAddress(newAddress);
  };

  const disconnect = () => {
    setAddress(null);
    setAccounts([]);
    setIsConnected(false);
  };

  return (
    <WalletContext.Provider
      value={{
        address,
        accounts,
        selectAccount,
        disconnect,
        isConnected
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}