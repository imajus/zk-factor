import { Network } from "@provablehq/aleo-types";

function resolveNetwork(value: string | undefined): Network {
  if (value === "mainnet") return Network.MAINNET;
  if (value === "canary") return Network.CANARY;
  return Network.TESTNET;
}

export const PROGRAM_ID: string =
  import.meta.env.VITE_ALEO_PROGRAM_ID ?? "zk_factor_12250.aleo";

export const NETWORK: Network = resolveNetwork(
  import.meta.env.VITE_ALEO_NETWORK ?? "testnet",
);

export const API_ENDPOINT: string =
  import.meta.env.VITE_API_ENDPOINT ?? "https://api.explorer.provable.com/v1";

export const ALEO_EXPLORER =
  import.meta.env.VITE_ALEO_EXPLORER ?? "https://testnet.explorer.provable.com";

// USDCx token program on Aleo (ARC-20 compatible)
// Set VITE_USDCX_PROGRAM_ID in your .env / Cloudflare env vars
export const USDCX_PROGRAM_ID: string =
  import.meta.env.VITE_USDCX_PROGRAM_ID ?? "test_usdcx_stablecoin.aleo";

export type PaymentCurrency = "ALEO" | "USDCx";

export const WHITELISTED_PROGRAMS: string[] = [
  PROGRAM_ID,
  "credits.aleo",
  USDCX_PROGRAM_ID,
];
