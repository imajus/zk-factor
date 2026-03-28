import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, Server } from "lucide-react";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-semibold mb-3">{title}</h2>
      <div className="text-muted-foreground space-y-3 text-sm leading-relaxed">
        {children}
      </div>
    </section>
  );
}

export default function Privacy() {
  return (
    <div className="container py-16 max-w-3xl">
      <div className="mb-10">
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground text-sm">
          Last updated: March 2026
        </p>
      </div>

      <p className="text-muted-foreground text-sm mb-10 leading-relaxed">
        ZK Factor is built from the ground up around privacy. This page explains
        what data is public on the blockchain, what is kept private through
        zero-knowledge proofs, and how the client-side architecture means we
        collect almost nothing.
      </p>

      {/* At-a-glance cards */}
      <div className="grid gap-4 sm:grid-cols-3 mb-12">
        <Card className="border-primary/20">
          <CardHeader className="pb-2">
            <Eye className="h-5 w-5 text-primary mb-1" />
            <CardTitle className="text-sm">Public On-Chain</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-1">
            <p>Serial numbers of spent invoices</p>
            <p>Function names called</p>
            <p>Transaction fees</p>
            <p>Factor registration status</p>
          </CardContent>
        </Card>
        <Card className="border-green-500/20">
          <CardHeader className="pb-2">
            <EyeOff className="h-5 w-5 text-green-500 mb-1" />
            <CardTitle className="text-sm">Private via ZK</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-1">
            <p>Invoice amounts</p>
            <p>Debtor identity</p>
            <p>Business relationships</p>
            <p>Factoring discount rates</p>
          </CardContent>
        </Card>
        <Card className="border-blue-500/20">
          <CardHeader className="pb-2">
            <Server className="h-5 w-5 text-blue-500 mb-1" />
            <CardTitle className="text-sm">Minimal Collection</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-1">
            <p>No email collection</p>
            <p>No cookies or tracking</p>
            <p>No IP logging by us</p>
            <p>No analytics</p>
          </CardContent>
        </Card>
      </div>

      <Section title="1. What is Public on the Blockchain">
        <p>
          Aleo is a public blockchain. Certain data is necessarily visible to
          anyone who inspects the chain:
        </p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>
            <strong>Serial numbers</strong> of consumed (spent) invoice records
            — this is what prevents double-factoring
          </li>
          <li>
            <strong>Function names</strong> of transitions called (e.g.,{" "}
            <code>mint_invoice</code>, <code>execute_factoring</code>)
          </li>
          <li>
            <strong>Transaction fees</strong> paid in Aleo credits
          </li>
          <li>
            <strong>Factor registration</strong> in the{" "}
            <code>active_factors</code> mapping (factors opt in publicly)
          </li>
          <li>
            <strong>Settlement status</strong> in the{" "}
            <code>settled_invoices</code> mapping (boolean, no amounts)
          </li>
        </ul>
        <p>
          Importantly, transaction <em>inputs</em> (invoice amounts,
          counterparty identities, discount rates) are encrypted and not visible
          on-chain.
        </p>
      </Section>

      <Section title="2. What is Private via Zero-Knowledge Proofs">
        <p>
          ZK Factor uses Aleo's encrypted record model to keep sensitive
          business data private:
        </p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>
            <strong>Invoice amounts</strong> — encrypted in the Invoice record,
            visible only to the record owner
          </li>
          <li>
            <strong>Debtor identity</strong> — encrypted in Invoice and
            PaymentNotice records
          </li>
          <li>
            <strong>Business-debtor relationships</strong> — not inferable from
            on-chain data
          </li>
          <li>
            <strong>Factoring discount rates</strong> — contained within private
            records
          </li>
          <li>
            <strong>Factor-business relationships</strong> — encrypted in
            FactoringOffer records
          </li>
        </ul>
        <p>
          The PaymentNotice record sent to debtors is encrypted with the
          debtor's public key. Nothing about the payment instruction is readable
          on-chain — only the debtor's wallet can decrypt it.
        </p>
      </Section>

      <Section title="3. Client-Side Architecture">
        <p>
          ZK Factor's core functionality is fully client-side. Zero-knowledge
          proofs are generated in your browser and wallet interactions go
          directly to the Aleo network. We cannot access your wallet private
          keys — ever.
        </p>
        <p>
          Optional features use third-party services described in Section 5. If
          you choose not to use document attachments, no personal data leaves
          your browser beyond standard blockchain interactions.
        </p>
      </Section>

      <Section title="4. Wallet and Key Management">
        <p>
          ZK Factor integrates with Shield Wallet. Your private keys are managed
          entirely by your wallet software and never transmitted to or stored by
          ZK Factor.
        </p>
        <p>
          Your view key is used locally to decrypt records from the blockchain.
          Record decryption happens in your browser — decrypted data is not sent
          anywhere.
        </p>
        <p>
          Losing access to your wallet means losing access to your private
          records. We cannot recover records or private keys on your behalf.
        </p>
      </Section>

      <Section title="5. Third-Party Services">
        <p>The Platform integrates with the following third-party services:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>
            <strong>Aleo Network API</strong> (Provable Inc.) — blockchain data
            and transaction submission
          </li>
          <li>
            <strong>Pinata / IPFS</strong> — optional document attachment.
            Uploaded files are stored on IPFS via Pinata and may be permanently
            available on the public IPFS network
          </li>
        </ul>
        <p>
          We do not use advertising networks, analytics providers, or social
          media trackers.
        </p>
      </Section>

      <Section title="6. Blockchain Immutability">
        <p>
          Data written to the Aleo blockchain (serial numbers, settlement flags,
          factor registrations) is permanent and cannot be deleted or modified.
          This is a fundamental property of blockchain technology.
        </p>
        <p>
          Before submitting any transaction, consider that the public elements
          of that transaction will remain on the blockchain indefinitely.
        </p>
      </Section>

      <Section title="7. Network Metadata">
        <p>
          While ZK proofs protect the content of your transactions,
          network-level metadata (IP addresses, timing of requests) may be
          observable by network observers. For enhanced operational privacy,
          consider using a VPN or Tor when interacting with the Platform.
        </p>
      </Section>

      <Section title="8. Changes to This Policy">
        <p>
          This policy may be updated as the Platform evolves. During the testnet
          phase, significant changes may occur as we refine the privacy model.
        </p>
      </Section>

      <Section title="9. Contact">
        <p>
          For privacy-related questions, please open an issue on the project's
          GitHub repository.
        </p>
      </Section>
    </div>
  );
}
