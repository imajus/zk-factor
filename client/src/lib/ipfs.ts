import { PinataSDK } from "pinata";

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
 * Upload a file to IPFS via a Pinata presigned URL obtained from the CF worker.
 * Returns the CID, a public gateway URL, and the field-encoded CID.
 */
export async function uploadToIPFS(file: File): Promise<IPFSUploadResult> {
  const workerUrl = import.meta.env.VITE_WORKER_URL;
  if (!workerUrl) {
    throw new Error("VITE_WORKER_URL is not set.");
  }

  // 1. Get a short-lived presigned upload URL from the worker
  const urlRes = await fetch(`${workerUrl}/presigned-url`);
  if (!urlRes.ok) {
    throw new Error(`Failed to get presigned URL: ${urlRes.statusText}`);
  }
  const { url: presignedUrl, gateway } = (await urlRes.json()) as {
    url: string;
    gateway: string;
  };

  // 2. Initialize Pinata SDK (JWT stays server-side when using signed URLs)
  const resolvedGateway = gateway || "gateway.pinata.cloud";
  const pinata = new PinataSDK({
    pinataJwt: "",
    pinataGateway: resolvedGateway,
  });

  // 3. Upload using the signed URL via Pinata SDK
  const upload = await pinata.upload.public.file(file).url(presignedUrl);
  const cid = upload.cid;

  if (!cid) {
    throw new Error("No CID returned from Pinata");
  }

  return {
    cid,
    url: `https://${resolvedGateway}/ipfs/${cid}`,
    cidField: cidToField(cid),
  };
}
