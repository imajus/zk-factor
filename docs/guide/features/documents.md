# Attach Documents

You can attach supporting documents (PDFs, images, contracts) to invoices when creating them. Files are stored on IPFS; a content fingerprint is recorded in your invoice record.

## How It Works

1. When [creating an invoice](../business/create-invoice.md), look for the **Attach Document** section
2. Click or drag a file into the upload area
3. The file uploads to IPFS automatically
4. Once uploaded, you'll see a confirmation with a link to view the file

<!-- screenshot: document-upload.png — the document attachment area showing an uploaded file with IPFS link -->

## What Gets Stored Where

| What | Where | Who can see it |
|---|---|---|
| The file itself | IPFS (via Pinata) | Anyone with the link |
| Content fingerprint (CID) | Your invoice record on-chain | Only record owners |

The on-chain fingerprint proves a specific document was attached at creation time. It can't be changed after the fact.

## Important Notes

- **IPFS is public** — anyone with the content link can view the file. Don't upload confidential documents unless you understand this.
- Uploading is optional. If you skip it, the invoice works the same way.
- There's no file size limit enforced by the app, but very large files may take longer to upload.
- The document link is visible to anyone who receives the invoice record (the factor, after factoring).
