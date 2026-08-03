import express from "express";
import {
  paymentMiddlewareFromHTTPServer,
  x402ResourceServer,
  x402HTTPResourceServer
} from "@x402/express";
import { HTTPFacilitatorClient } from "@x402/core/server";

const app = express();
const PORT = process.env.PORT || 3001;

// Where to report route attribution. Point this at your Accensa deployment.
const ACCENSA_URL = process.env.ACCENSA_URL || "http://localhost:3000";
const HOOK_API_KEY = process.env.HOOK_API_KEY;

// 1. Create the resource server and point it to the public facilitator
const resourceServer = new x402ResourceServer([
  new HTTPFacilitatorClient({ url: "https://www.x402.org/facilitator" })
]);

// 2. Path B: report the route that was paid for.
//
// The ledger records the transfer but not the route — a SAC transfer event has
// no notion of an HTTP path. That mapping only exists here, at settlement, so
// this is where it has to be captured.
//
// Note what is *not* here: no fallback hash. If x402 reports a settlement
// without a transaction, there is nothing to attribute and we send nothing. A
// row whose tx_hash never appears on chain is worse than a missing row.
resourceServer.onAfterSettle(async (ctx) => {
  if (!ctx.result.success) {
    console.error("❌ Settlement failed:", ctx.result.errorReason);
    return;
  }
  if (!ctx.result.transaction) {
    console.warn("⚠️  Settlement succeeded without a transaction hash; nothing to attribute");
    return;
  }
  if (!HOOK_API_KEY) {
    console.warn("⚠️  HOOK_API_KEY is not set; skipping attribution report");
    return;
  }

  console.log("✅ Settled", ctx.result.transaction, "for", ctx.paymentPayload?.path);

  try {
    const res = await fetch(`${ACCENSA_URL}/api/hook/settle`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${HOOK_API_KEY}`
      },
      body: JSON.stringify({
        tx_hash: ctx.result.transaction,
        route: ctx.paymentPayload?.path,
        method: "GET",
        payer: ctx.result.payer
      })
    });

    if (!res.ok) {
      console.error(`⚠️  Accensa returned ${res.status}:`, await res.text());
    } else {
      console.log("📊 Attribution reported to Accensa");
    }
  } catch (error) {
    // Never let reporting break a paid request — the payment already settled.
    console.error("⚠️  Could not reach Accensa:", error.message);
  }
});

// 3. Configure the routes
const routesConfig = {
  "/api/hello": {
    accepts: {
      scheme: "exact",
      price: "1000", // e.g. 1000 stroops
      network: "stellar:testnet",
      payTo: process.env.MERCHANT_ADDRESS || "GAQW...REPLACE_WITH_REAL_ADDRESS",
    },
  },
};

const httpServer = new x402HTTPResourceServer(resourceServer, routesConfig);

// 4. Apply the middleware
app.use(paymentMiddlewareFromHTTPServer(httpServer));

// 5. Protected route
app.get("/api/hello", (req, res) => {
  res.json({
    message: "Payment verified!",
    data: "This is the premium Accensa content."
  });
});

app.listen(PORT, () => {
  console.log(`Demo merchant server running on port ${PORT}`);
  console.log(`Protected route: http://localhost:${PORT}/api/hello`);
  console.log(`Reporting attribution to: ${ACCENSA_URL}/api/hook/settle`);
});
