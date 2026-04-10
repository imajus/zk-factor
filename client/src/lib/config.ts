import { Network } from "@provablehq/aleo-types";

function resolveNetwork(value: string | undefined): Network {
  if (value === "mainnet") return Network.MAINNET;
  if (value === "canary") return Network.CANARY;
  return Network.TESTNET;
}

export const PROGRAM_ID: string =
  import.meta.env.VITE_PROGRAM_ID ?? "zk_factor_12256.aleo";

export const PROGRAM_ADDRESS: string =
  import.meta.env.VITE_PROGRAM_ADDRESS ??
  "aleo1s8hgprffm0tqdc9d4q5mshu90efwcg7qfvwzyr3r9wpangazrq8s5yfww6";

export const POOL_PROGRAM_ID: string =
  import.meta.env.VITE_POOL_PROGRAM_ID ?? PROGRAM_ID;

export const POOL_PROGRAM_ADDRESS: string =
  import.meta.env.VITE_POOL_PROGRAM_ADDRESS ?? PROGRAM_ADDRESS;

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
  POOL_PROGRAM_ID,
  "credits.aleo",
  USDCX_PROGRAM_ID,
];
