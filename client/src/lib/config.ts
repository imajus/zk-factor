import { Network } from '@provablehq/aleo-types';

function resolveNetwork(value: string | undefined): Network {
  if (value === 'mainnet') return Network.MAINNET;
  if (value === 'canary') return Network.CANARY;
  return Network.TESTNET;
}

export const PROGRAM_ID: string =
  import.meta.env.VITE_ALEO_PROGRAM_ID ?? 'zk_factor.aleo';

export const NETWORK: Network = resolveNetwork(import.meta.env.VITE_ALEO_NETWORK ?? 'testnet');

export const API_ENDPOINT: string =
  import.meta.env.VITE_API_ENDPOINT ?? 'https://api.explorer.provable.com/v1';

export const ALEO_EXPLORER = import.meta.env.VITE_ALEO_EXPLORER ?? 'https://testnet.explorer.provable.com';

/** Programs whitelisted for record decryption via the wallet adapter. */
export const WHITELISTED_PROGRAMS: string[] = [PROGRAM_ID, 'credits.aleo'];
