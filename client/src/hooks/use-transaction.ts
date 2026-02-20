import { useState, useRef, useCallback, useEffect } from 'react';
import type { TransactionOptions, TransactionStatusResponse } from '@provablehq/aleo-types';
import { useWallet } from '@/contexts/WalletContext';

const POLL_INTERVAL_MS = 3_000;
// const POLL_MAX_ATTEMPTS = 100; // 100 × 3s = 5 minutes

type TxStatus = 'idle' | 'submitting' | 'pending' | 'accepted' | 'failed' | 'timeout';

interface TransactionState {
  status: TxStatus;
  tempId: string | null;
  onChainId: string | null;
  error: string | null;
}

const INITIAL_STATE: TransactionState = {
  status: 'idle',
  tempId: null,
  onChainId: null,
  error: null,
};

export function useTransaction() {
  const { executeTransaction, transactionStatus } = useWallet();
  const [state, setState] = useState<TransactionState>(INITIAL_STATE);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // const attemptsRef = useRef(0);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    // attemptsRef.current = 0;
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const poll = useCallback(async (tempId: string) => {
    // attemptsRef.current += 1;

    // if (attemptsRef.current > POLL_MAX_ATTEMPTS) {
    //   stopPolling();
    //   setState(s => s.status === 'pending'
    //     ? { ...s, status: 'timeout', error: 'Transaction timed out' }
    //     : s
    //   );
    //   return;
    // }

    let response: TransactionStatusResponse | undefined;
    try {
      response = await transactionStatus(tempId);
    } catch {
      stopPolling();
      setState(s => ({ ...s, status: 'failed', error: 'Status check failed' }));
      return;
    }

    if (!response?.status) return;

    const status = response.status.toLowerCase();
    if (status === 'pending') return;

    stopPolling();

    if (status === 'accepted') {
      setState(s => ({
        ...s,
        status: 'accepted',
        onChainId: response!.transactionId ?? null,
      }));
    } else {
      setState(s => ({
        ...s,
        status: 'failed',
        error: response!.error ?? response!.status,
      }));
    }
  }, [transactionStatus, stopPolling]);

  const execute = useCallback(async (options: TransactionOptions) => {
    stopPolling();
    setState({ ...INITIAL_STATE, status: 'submitting' });

    let result: Awaited<ReturnType<typeof executeTransaction>>;
    try {
      result = await executeTransaction(options);
    } catch (err) {
      setState({ ...INITIAL_STATE, status: 'failed', error: String(err) });
      return;
    }

    if (!result?.transactionId) {
      setState({ ...INITIAL_STATE, status: 'failed', error: 'No transaction ID returned' });
      return;
    }

    const { transactionId: tempId } = result;
    setState(s => ({ ...s, status: 'pending', tempId }));

    intervalRef.current = setInterval(() => poll(tempId), POLL_INTERVAL_MS);
    await poll(tempId);
  }, [executeTransaction, poll, stopPolling]);

  const reset = useCallback(() => {
    stopPolling();
    setState(INITIAL_STATE);
  }, [stopPolling]);

  return { execute, reset, ...state };
}
