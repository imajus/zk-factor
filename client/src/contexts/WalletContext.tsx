import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from "react";
import { useWallet as useAdapterWallet } from "@provablehq/aleo-wallet-adaptor-react";
import { NETWORK } from "@/lib/config";
import { fetchFactorStatus } from "@/lib/aleo-factors";
import type {
  Network,
  TransactionOptions,
  TransactionStatusResponse,
  TxHistoryResult,
} from "@provablehq/aleo-types";
import type { Wallet } from "@provablehq/aleo-wallet-adaptor-react";
import type { WalletName } from "@provablehq/aleo-wallet-standard";

export type UserRole = "business" | "factor" | null;

const roleStorageKey = (address: string) => `zk_factor_role_${address}`;

interface AppWalletContextType {
  isConnected: boolean;
  isInitializing: boolean;
  address: string | null;
  network: Network | null;
  connecting: boolean;
  reconnecting: boolean;
  wallets: Wallet[];
  selectWallet: (name: WalletName) => void;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  executeTransaction: (
    options: TransactionOptions,
  ) => Promise<{ transactionId: string } | undefined>;
  transactionStatus: (
    transactionId: string,
  ) => Promise<TransactionStatusResponse>;
  requestRecords: (
    program: string,
    includePlaintext?: boolean,
  ) => Promise<unknown[]>;
  requestTransactionHistory: (program: string) => Promise<TxHistoryResult>;
  activeRole: UserRole;
  resolvingRole: boolean;
  setActiveRole: (role: UserRole) => void;
  formatAddress: (address: string, chars?: number) => string;
}

const AppWalletContext = createContext<AppWalletContextType | undefined>(
  undefined,
);

function WalletContextInner({ children }: { children: ReactNode }) {
  const [activeRole, setActiveRoleState] = useState<UserRole>(null);
  const adapter = useAdapterWallet();
  // Track which address we've finished resolving — derive resolvingRole
  // synchronously during render so child effects (e.g. WalletConnect) see
  // it immediately, avoiding a race where navigation fires before the role
  // is restored from localStorage / on-chain.
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const resolvingRole =
    adapter.connected && !!adapter.address && adapter.address !== resolvedAddress;

  // Guard against redirect-before-autoConnect race. On page refresh the adapter
  // starts with connecting=false/connected=false, then its autoConnect useEffect
  // fires and sets connecting=true. We stay "initializing" until we see that
  // connecting has started and finished (or connected=true), with a 3 s fallback
  // for when the wallet extension isn't installed and autoConnect never fires.
  const [isInitializing, setIsInitializing] = useState(true);
  const connectingStarted = useRef(false);
  useEffect(() => {
    if (adapter.connected) {
      setIsInitializing(false);
      return;
    }
    if (adapter.connecting) {
      connectingStarted.current = true;
      return;
    }
    if (connectingStarted.current) {
      setIsInitializing(false);
    }
  }, [adapter.connecting, adapter.connected]);
  useEffect(() => {
    const timer = setTimeout(() => setIsInitializing(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!adapter.connected || !adapter.address) {
      if (!adapter.connected) {
        setActiveRoleState(null);
        setResolvedAddress(null);
      }
      return;
    }

    const stored = localStorage.getItem(roleStorageKey(adapter.address));

    fetchFactorStatus(adapter.address)
      .then((status) => {
        // On-chain factor registration has priority over any locally cached role.
        if (status?.is_active) {
          setActiveRoleState("factor");
          localStorage.setItem(roleStorageKey(adapter.address!), "factor");
          return;
        }

        if (stored === "business") {
          setActiveRoleState("business");
          return;
        }

        setActiveRoleState(null);
      })
      .finally(() => {
        setResolvedAddress(adapter.address!);
      });
  }, [adapter.connected, adapter.address]);

  const connect = useCallback(async () => {
    if (adapter.wallets.length > 0 && !adapter.wallet) {
      adapter.selectWallet(adapter.wallets[0].adapter.name);
      // Let the adapter process wallet selection before connect is attempted.
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    }

    try {
      await adapter.connect(NETWORK);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      const walletNotSelected = /wallet.*not.*selected|select.*wallet/i.test(
        message,
      );

      if (walletNotSelected && adapter.wallets.length > 0) {
        adapter.selectWallet(adapter.wallets[0].adapter.name);
        await new Promise((resolve) => window.setTimeout(resolve, 50));
        await adapter.connect(NETWORK);
        return;
      }

      throw error;
    }
  }, [adapter]);

  const disconnect = useCallback(async () => {
    await adapter.disconnect();
    setActiveRoleState(null);
  }, [adapter]);

  const setActiveRole = useCallback(
    (role: UserRole) => {
      setActiveRoleState(role);
      if (adapter.address) {
        if (role) {
          localStorage.setItem(roleStorageKey(adapter.address), role);
        } else {
          localStorage.removeItem(roleStorageKey(adapter.address));
        }
      }
    },
    [adapter.address],
  );

  const formatAddress = useCallback((address: string, chars: number = 6) => {
    if (!address) return "";
    return `${address.slice(0, 10)}…${address.slice(-chars)}`;
  }, []);

  return (
    <AppWalletContext.Provider
      value={{
        isConnected: adapter.connected,
        isInitializing,
        address: adapter.address,
        network: adapter.network,
        connecting: adapter.connecting,
        reconnecting: adapter.reconnecting,
        wallets: adapter.wallets,
        selectWallet: adapter.selectWallet,
        connect,
        disconnect,
        executeTransaction: adapter.executeTransaction,
        transactionStatus: adapter.transactionStatus,
        requestRecords: adapter.requestRecords,
        requestTransactionHistory: adapter.requestTransactionHistory,
        activeRole,
        resolvingRole,
        setActiveRole,
        formatAddress,
      }}
    >
      {children}
    </AppWalletContext.Provider>
  );
}

export function WalletProvider({ children }: { children: ReactNode }) {
  return <WalletContextInner>{children}</WalletContextInner>;
}

export function useWallet() {
  const context = useContext(AppWalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}
