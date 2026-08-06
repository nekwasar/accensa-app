# x402 AI Inference Demo

This is a pre-scaffolded mock application designed strictly for creating video demonstrations of the `@accensa/sdk`. It simulates an AI image generation endpoint that is gated using the x402 protocol.

## Setup

Because this app is linked into the main pnpm workspace, you must run these commands from the **root of the workspace** (`accensa-app`):
```bash
cd ~/accensa/accensa-app
npx pnpm install
npx pnpm --filter demo-app dev
```

## The Storyboard (90 Seconds)

### Beat 1: The Baseline (0:00-0:30)
* Ensure `src/app/api/generate/route.ts` is unprotected (line 19 is active: `export const POST = handler;`, and lines 2 & 16 are commented out).
* Split your screen: Code editor on the left, browser (`http://localhost:3000`) on the right.
* Click **"Generate Image"**. The mock image will load for free. Explain that AI compute is expensive and developers need a way to monetize API calls instantly without forcing users to sign up for subscriptions.

### Beat 2: The Lock (0:30-1:00)
* In the code editor, apply the lock by doing the following:
  - **Uncomment line 2:** `import { withX402 } from '@accensa/sdk';`
  - **Uncomment line 16:** `export const POST = withX402(handler, { amount: 5, asset: 'XLM' });`
  - **Comment out line 19:** `// export const POST = handler;`
* Explain that you are dropping in the Accensa middleware to gate the route for 5 XLM.
* Click **"Generate Image"** in the browser again.
* The browser receives an HTTP 402, and the Freighter wallet extension automatically pops up asking for a 5 XLM signature.

### Beat 3: The Proof (1:00-1:30)
* Sign the transaction in the wallet.
* The middleware catches the receipt, allows the request through, and the image renders.
* Cut to the merchant dashboard (`apps/web`) to show the revenue charted in real-time.
