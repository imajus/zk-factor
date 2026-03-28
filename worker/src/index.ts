import { PinataSDK } from "pinata";

interface Env {
  PINATA_JWT: string;
  PINATA_GATEWAY: string; // e.g. aquamarine-casual-tarantula-177.mypinata.cloud
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const gateway = env.PINATA_GATEWAY || "gateway.pinata.cloud";
    const url = new URL(req.url);

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    };

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (req.method === "GET" && url.pathname === "/presigned-url") {
      const pinata = new PinataSDK({
        pinataJwt: env.PINATA_JWT,
        pinataGateway: env.PINATA_GATEWAY
      });

      try {
        // Create a signed upload URL that expires in 1 hour (3600 seconds)
        // Allowing larger file uploads (up to 4MB) for invoices/PDFs
        const uploadUrl = await pinata.upload.public.createSignedURL({
          expires: 3600,
          name: `invoice-upload-${Date.now()}`,
        });

        return new Response(JSON.stringify({ url: uploadUrl, gateway }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      } catch (error) {
        console.error("Scale-Pinata error:", error);
        return new Response(JSON.stringify({ 
          error: "Failed to create signed URL", 
          details: error instanceof Error ? error.message : String(error) 
        }), {
          status: 502,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    }

    return new Response(null, { status: 404 });
  },
};

