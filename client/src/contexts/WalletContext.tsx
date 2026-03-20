import {
  createContext,
  useContext,
  useState,
  useEffect,
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
  address: string | null;
  network: Network | null;
  connecting: boolean;
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
  const [resolvingRole, setResolvingRole] = useState(false);
  const adapter = useAdapterWallet();

  useEffect(() => {
    if (!adapter.connected || !adapter.address) {
      if (!adapter.connected) setActiveRoleState(null);
      return;
    }
    const stored = localStorage.getItem(roleStorageKey(adapter.address));
    if (stored === "business" || stored === "factor") {
      setActiveRoleState(stored);
      return;
    }
    setResolvingRole(true);
    fetchFactorStatus(adapter.address).then((status) => {
      if (status?.is_active) {
        setActiveRoleState("factor");
        localStorage.setItem(roleStorageKey(adapter.address!), "factor");
      }
      setResolvingRole(false);
    });
  }, [adapter.connected, adapter.address]);

  const connect = useCallback(async () => {
    if (adapter.wallets.length > 0 && !adapter.wallet) {
      adapter.selectWallet(adapter.wallets[0].adapter.name);
      return;
    }
    await adapter.connect(NETWORK);
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
        address: adapter.address,
        network: adapter.network,
        connecting: adapter.connecting,
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
