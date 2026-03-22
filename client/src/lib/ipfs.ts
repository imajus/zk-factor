// IPFS upload via Pinata (free tier — https://pinata.cloud)
// Set VITE_PINATA_JWT in your .env / Cloudflare Pages env vars
// Get your JWT from: https://app.pinata.cloud/developers/api-keys

const PINATA_UPLOAD_URL = 'https://uploads.pinata.cloud/v3/files';

export interface IPFSUploadResult {
  cid: string;
  url: string;
  // CID encoded as a field element for on-chain storage
  cidField: string;
}

/**
 * Encodes an IPFS CID string into a field element.
 * Takes the first 31 bytes of the UTF-8 encoded CID and packs them into a u248.
 * This is lossy for display but collision-resistant enough for on-chain linking.
 */
export function cidToField(cid: string): string {
  const bytes = new TextEncoder().encode(cid);
  let value = 0n;
  // Pack up to 31 bytes to stay within Aleo's field modulus safely
  for (let i = 0; i < Math.min(31, bytes.length); i++) {
    value = (value << 8n) | BigInt(bytes[i]);
  }
  return `${value}field`;
}

/**
 * Upload a file to IPFS via Pinata.
 * Returns the CID, a public gateway URL, and the field-encoded CID.
 */
export async function uploadToIPFS(file: File): Promise<IPFSUploadResult> {
  const jwt = import.meta.env.VITE_PINATA_JWT;
  if (!jwt) {
    throw new Error('VITE_PINATA_JWT is not set. Get a free API key at https://app.pinata.cloud/developers/api-keys');
  }

  const formData = new FormData();
  formData.append('file', file);
  // Use invoice filename as the pin name for easy identification in Pinata dashboard
  formData.append('name', file.name);

  const response = await fetch(PINATA_UPLOAD_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`IPFS upload failed: ${error}`);
  }

  const data = await response.json();
  const cid: string = data.data?.cid ?? data.IpfsHash;

  if (!cid) {
    throw new Error('No CID returned from Pinata');
  }

  return {
    cid,
    url: `https://gateway.pinata.cloud/ipfs/${cid}`,
    cidField: cidToField(cid),
  };
}