'use client';

import Link from 'next/link';
import { useWallet } from '../hooks/useWallet';
import { useState } from 'react';

export default function Header() {
  const { address, accounts, selectAccount, disconnect } = useWallet();
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  const truncateAddress = (addr: string) => {
    return addr.slice(0, 6) + '...' + addr.slice(-6);
  };

  return (
    <header className="bg-white shadow">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold text-blue-600">
          🗳️ Private Voting
        </Link>

        <div className="flex items-center gap-4">
          {address ? (
            <div className="relative">
              <button
                onClick={() => setShowAccountMenu(!showAccountMenu)}
                className="btn btn-secondary flex items-center gap-2"
              >
                📦 {truncateAddress(address)}
                <span className="text-xs">▼</span>
              </button>

              {showAccountMenu && accounts.length > 1 && (
                <div className="absolute right-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg z-50">
                  {accounts.map(account => (
                    <button
                      key={account.address}
                      onClick={() => {
                        selectAccount(account.address);
                        setShowAccountMenu(false);
                      }}
                      className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                    >
                      {account.name}
                      <div className="text-xs text-gray-500">
                        {truncateAddress(account.address)}
                      </div>
                    </button>
                  ))}
                  <div className="border-t border-gray-200" />
                  <button
                    onClick={() => {
                      disconnect();
                      setShowAccountMenu(false);
                    }}
                    className="block w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 text-sm"
                  >
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-600 text-sm">
              ⚠️ Wallet not connected
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
