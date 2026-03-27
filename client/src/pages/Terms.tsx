import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

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

export default function Terms() {
  return (
    <div className="container py-16 max-w-3xl">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-3xl font-bold">Terms of Service</h1>
          <Badge variant="outline">Testnet</Badge>
        </div>
        <p className="text-muted-foreground text-sm">
          Last updated: March 2026
        </p>
      </div>

      <Alert className="mb-10 border-yellow-500/30 bg-yellow-500/5">
        <AlertTriangle className="h-4 w-4 text-yellow-500" />
        <AlertDescription className="text-sm">
          <strong>Testnet Software.</strong> ZK Factor is currently running on
          the Aleo testnet. No real money or real assets are involved. This
          software is provided for evaluation and testing purposes only.
        </AlertDescription>
      </Alert>

      <Section title="1. Acceptance of Terms">
        <p>
          By accessing or using ZK Factor ("the Platform"), you agree to be
          bound by these Terms of Service. If you do not agree to these terms,
          do not use the Platform.
        </p>
        <p>
          These terms apply to all users, including businesses seeking invoice
          financing, factoring companies, and any other participants.
        </p>
      </Section>

      <Section title="2. Testnet Status and No Real Value">
        <p>
          ZK Factor is currently deployed on the Aleo <strong>testnet</strong>.
          Testnet tokens have no monetary value. No fiat currency, stablecoins,
          or real-world assets are transferred through the Platform at this
          time.
        </p>
        <p>
          All transactions, invoices, and factoring operations performed on the
          Platform are for demonstration and testing purposes. Do not treat any
          output of the Platform as legally binding financial transactions.
        </p>
      </Section>

      <Section title="3. Not Financial Advice">
        <p>
          Nothing on this Platform constitutes financial, legal, tax, or
          investment advice. ZK Factor is a technology demonstration platform.
          Any figures, rates, or financial terms shown are illustrative only.
        </p>
        <p>
          Consult qualified financial and legal professionals before making any
          real financial decisions related to invoice factoring or blockchain
          technology.
        </p>
      </Section>

      <Section title="4. No Warranties">
        <p>
          The Platform is provided "as is" and "as available" without warranties
          of any kind, express or implied. We do not warrant that the Platform
          will be uninterrupted, error-free, or free of security
          vulnerabilities.
        </p>
        <p>
          Smart contracts on blockchain networks may contain bugs.
          Zero-knowledge proofs are computationally intensive and may fail or
          take significant time. We make no guarantees about transaction
          finality, proof generation times, or record availability.
        </p>
      </Section>

      <Section title="5. Limitation of Liability">
        <p>
          To the maximum extent permitted by law, ZK Factor and its contributors
          shall not be liable for any indirect, incidental, special,
          consequential, or punitive damages, including loss of profits, data,
          or goodwill.
        </p>
        <p>
          Because this is testnet software with no real asset transfers, there
          is no monetary liability associated with Platform use during the
          testnet phase.
        </p>
      </Section>

      <Section title="6. Third-Party Services">
        <p>
          The Platform integrates with third-party services that have their own
          terms and privacy policies:
        </p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>
            <strong>Pinata / IPFS</strong> — document storage for invoice
            attachments
          </li>
          <li>
            <strong>Resend</strong> — transactional email notifications
          </li>
        </ul>
        <p>
          We are not responsible for the availability, security, or practices of
          these services. Documents uploaded to IPFS are content-addressed and
          may be permanently available on the public IPFS network. Do not upload
          confidential documents unless you understand the implications.
        </p>
      </Section>

      <Section title="7. Privacy & Data">
        <p>
          ZK Factor does not collect email addresses or personal data. All core
          functionality is wallet-based and client-side. We do not sell or share
          user information with third parties.
        </p>
        <p>
          On-chain data is governed by the Aleo blockchain's privacy model.
          Private record contents are encrypted and visible only to record
          owners. Public mappings and serial numbers are visible to all network
          participants.
        </p>
      </Section>

      <Section title="8. User Responsibilities">
        <p>You are responsible for:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Securing your wallet private keys — we have no access to them</li>
          <li>Ensuring the accuracy of invoice data you submit</li>
          <li>Complying with applicable laws in your jurisdiction</li>
          <li>Not using the Platform for any unlawful purpose</li>
          <li>Understanding that blockchain transactions are irreversible</li>
        </ul>
      </Section>

      <Section title="9. Intellectual Property">
        <p>
          The ZK Factor platform is open-source software. Smart contract code is
          available for review on the Aleo blockchain. Frontend source code may
          be made available under an open-source license.
        </p>
        <p>
          Nothing in these terms grants you ownership of ZK Factor trademarks or
          branding.
        </p>
      </Section>

      <Section title="10. Changes to Terms">
        <p>
          We may update these terms at any time. Continued use of the Platform
          after changes constitutes acceptance of the new terms. During the
          testnet phase, terms may change frequently as the product evolves.
        </p>
      </Section>

      <Section title="11. Contact">
        <p>
          For questions about these terms, please open an issue on the project's
          GitHub repository.
        </p>
      </Section>
    </div>
  );
}
