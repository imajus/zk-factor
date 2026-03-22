import { Network } from "@provablehq/aleo-types";

function resolveNetwork(value: string | undefined): Network {
  if (value === "mainnet") return Network.MAINNET;
  if (value === "canary") return Network.CANARY;
  return Network.TESTNET;
}

export const PROGRAM_ID: string =
  import.meta.env.VITE_ALEO_PROGRAM_ID ?? "zk_factor.aleo";

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

// Privy app ID for account abstraction / email login
// Get this from https://privy.io → Dashboard → Settings → App ID
// Set VITE_PRIVY_APP_ID in your .env
export const PRIVY_APP_ID: string =
  import.meta.env.VITE_PRIVY_APP_ID ?? "";

// Resend API key for email notifications
// Set VITE_RESEND_API_KEY in your .env
// NOTE: in production, proxy Resend calls through a backend/edge function
// to avoid exposing the API key in the browser bundle.
export const RESEND_API_KEY: string =
  import.meta.env.VITE_RESEND_API_KEY ?? "";

export type PaymentCurrency = "ALEO" | "USDCx";

export const WHITELISTED_PROGRAMS: string[] = [
  PROGRAM_ID,
  "credits.aleo",
  USDCX_PROGRAM_ID,
];
