interface Env {
  PINATA_JWT: string;
  PINATA_GATEWAY: string; // e.g. aquamarine-casual-tarantula-177.mypinata.cloud
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    };

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (req.method === "GET" && url.pathname === "/presigned-url") {
      const response = await fetch("https://uploads.pinata.cloud/v3/files/sign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.PINATA_JWT}`,
        },
        body: JSON.stringify({ network: "public", expires: 60, date: Math.floor(Date.now() / 1000) }),
      });

      const body = await response.json() as { data: string };

      if (!response.ok) {
        return new Response(JSON.stringify({ error: body }), {
          status: 502,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const gateway = env.PINATA_GATEWAY || "gateway.pinata.cloud";
      return new Response(JSON.stringify({ url: body.data, gateway }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(null, { status: 404 });
  },
};
