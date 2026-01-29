import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type UserRole = 'business' | 'factor' | 'observer';

interface WalletState {
  isConnected: boolean;
  address: string | null;
  balance: number;
  roles: UserRole[];
  activeRole: UserRole | null;
  lastSyncTime: Date | null;
  isSyncing: boolean;
  syncProgress: number;
  network: 'mainnet' | 'testnet';
}

interface WalletContextType extends WalletState {
  connect: () => Promise<void>;
  disconnect: () => void;
  setActiveRole: (role: UserRole) => void;
  syncWallet: () => Promise<void>;
  formatAddress: (address: string, chars?: number) => string;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const MOCK_ADDRESS = 'aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc';

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>({
    isConnected: false,
    address: null,
    balance: 0,
    roles: [],
    activeRole: null,
    lastSyncTime: null,
    isSyncing: false,
    syncProgress: 0,
    network: 'mainnet',
  });

  const connect = useCallback(async () => {
    // Simulate wallet connection
    setState(prev => ({ ...prev, isSyncing: true, syncProgress: 0 }));
    
    // Simulate sync progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 100));
      setState(prev => ({ ...prev, syncProgress: i }));
    }

    setState({
      isConnected: true,
      address: MOCK_ADDRESS,
      balance: 125847.523456,
      roles: ['business', 'factor'],
      activeRole: 'business',
      lastSyncTime: new Date(),
      isSyncing: false,
      syncProgress: 100,
      network: 'mainnet',
    });
  }, []);

  const disconnect = useCallback(() => {
    setState({
      isConnected: false,
      address: null,
      balance: 0,
      roles: [],
      activeRole: null,
      lastSyncTime: null,
      isSyncing: false,
      syncProgress: 0,
      network: 'mainnet',
    });
  }, []);

  const setActiveRole = useCallback((role: UserRole) => {
    setState(prev => ({ ...prev, activeRole: role }));
  }, []);

  const syncWallet = useCallback(async () => {
    setState(prev => ({ ...prev, isSyncing: true, syncProgress: 0 }));
    
    for (let i = 0; i <= 100; i += 5) {
      await new Promise(resolve => setTimeout(resolve, 50));
      setState(prev => ({ ...prev, syncProgress: i }));
    }

    setState(prev => ({
      ...prev,
      isSyncing: false,
      syncProgress: 100,
      lastSyncTime: new Date(),
    }));
  }, []);

  const formatAddress = useCallback((address: string, chars: number = 6) => {
    if (!address) return '';
    return `${address.slice(0, chars + 5)}...${address.slice(-chars)}`;
  }, []);

  return (
    <WalletContext.Provider
      value={{
        ...state,
        connect,
        disconnect,
        setActiveRole,
        syncWallet,
        formatAddress,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
