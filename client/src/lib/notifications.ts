/**
 * ZK-Factor email notifications via Resend API.
 *
 * Only fires when `email` is non-null (i.e. the user logged in via Privy).
 *
 * Production note: Resend's API does not allow browser-side calls with a real
 * API key due to CORS restrictions and key exposure risk. Proxy these requests
 * through a Cloudflare Worker or similar edge function that holds the key
 * server-side. For local dev you can point VITE_RESEND_PROXY_URL at a local
 * endpoint or use the Resend sandbox.
 */

import { RESEND_API_KEY } from "@/lib/config";

// Point this at your backend proxy in production.
// Falls back to the Resend API directly for local dev (may be CORS-blocked).
const RESEND_ENDPOINT =
  import.meta.env.VITE_RESEND_PROXY_URL ?? "https://api.resend.com/emails";

const FROM_ADDRESS =
  import.meta.env.VITE_NOTIFY_FROM ?? "ZK-Factor <notify@zkfactor.app>";

interface SendParams {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail({ to, subject, html }: SendParams): Promise<void> {
  if (!RESEND_API_KEY && !import.meta.env.VITE_RESEND_PROXY_URL) {
    // Silently skip if neither a key nor a proxy is configured
    return;
  }
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (RESEND_API_KEY) {
      headers["Authorization"] = `Bearer ${RESEND_API_KEY}`;
    }
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers,
      body: JSON.stringify({ from: FROM_ADDRESS, to, subject, html }),
    });
    if (!res.ok) {
      console.warn("[notifications] Resend error:", res.status, await res.text());
    }
  } catch (err) {
    // Notifications are non-critical — log and swallow
    console.warn("[notifications] Failed to send email:", err);
  }
}

// ─────────────────────────────────────────────────────────────
// NOTIFICATION TRIGGERS
// ─────────────────────────────────────────────────────────────

/**
 * Fired after mint_invoice succeeds.
 */
export async function notifyInvoiceCreated(
  email: string | null,
  params: {
    invoiceHash: string;
    amount: string;
    debtor: string;
    dueDate: string;
  },
): Promise<void> {
  if (!email) return;
  await sendEmail({
    to: email,
    subject: "Invoice Created — ZK-Factor",
    html: `
      <p>Your invoice has been created on Aleo.</p>
      <ul>
        <li><strong>Hash:</strong> <code>${params.invoiceHash}</code></li>
        <li><strong>Amount:</strong> ${params.amount}</li>
        <li><strong>Debtor:</strong> <code>${params.debtor}</code></li>
        <li><strong>Due:</strong> ${params.dueDate}</li>
      </ul>
      <p>You can now offer this invoice for factoring from your dashboard.</p>
    `,
  });
}

/**
 * Fired after execute_factoring or execute_factoring_token succeeds.
 */
export async function notifyFactoringAccepted(
  email: string | null,
  params: {
    invoiceHash: string;
    advanceAmount: string;
    currency: "ALEO" | "USDCx";
    factorAddress: string;
  },
): Promise<void> {
  if (!email) return;
  await sendEmail({
    to: email,
    subject: "Factoring Accepted — ZK-Factor",
    html: `
      <p>A factor has accepted your invoice and sent the advance payment.</p>
      <ul>
        <li><strong>Invoice Hash:</strong> <code>${params.invoiceHash}</code></li>
        <li><strong>Advance:</strong> ${params.advanceAmount} ${params.currency}</li>
        <li><strong>Factor:</strong> <code>${params.factorAddress}</code></li>
      </ul>
      <p>The funds have been deposited to your wallet.</p>
    `,
  });
}

/**
 * Fired after pay_invoice succeeds (debtor settled the invoice).
 */
export async function notifyPaymentReceived(
  email: string | null,
  params: {
    invoiceHash: string;
    amount: string;
    payer: string;
  },
): Promise<void> {
  if (!email) return;
  await sendEmail({
    to: email,
    subject: "Payment Received — ZK-Factor",
    html: `
      <p>An invoice you hold has been paid by the debtor.</p>
      <ul>
        <li><strong>Invoice Hash:</strong> <code>${params.invoiceHash}</code></li>
        <li><strong>Amount:</strong> ${params.amount}</li>
        <li><strong>Paid by:</strong> <code>${params.payer}</code></li>
      </ul>
      <p>The invoice is now marked as settled on-chain.</p>
    `,
  });
}

/**
 * Fired after initiate_recourse succeeds.
 */
export async function notifyRecourseInitiated(
  email: string | null,
  params: {
    invoiceHash: string;
    advanceAmount: string;
    factorAddress: string;
  },
): Promise<void> {
  if (!email) return;
  await sendEmail({
    to: email,
    subject: "⚠️ Recourse Initiated — ZK-Factor",
    html: `
      <p><strong>Action required:</strong> A factor has initiated recourse on one of your invoices.</p>
      <ul>
        <li><strong>Invoice Hash:</strong> <code>${params.invoiceHash}</code></li>
        <li><strong>Amount Owed:</strong> ${params.advanceAmount}</li>
        <li><strong>Factor:</strong> <code>${params.factorAddress}</code></li>
      </ul>
      <p>Log in to your ZK-Factor dashboard and click <strong>Settle Recourse</strong> to repay the advance and close the claim.</p>
    `,
  });
}
