import { NextResponse } from 'next/server';
// import { withX402 } from '@accensa/sdk';

async function handler(req: Request) {
  // Simulate AI inference delay
  await new Promise(r => setTimeout(r, 1500));
  
  return NextResponse.json({
    success: true,
    url: 'https://images.unsplash.com/photo-1518770660439-4636190af475',
    prompt: 'A futuristic cybernetic golden retriever'
  });
}

// Uncomment this for Beat 2 of the demo
// export const POST = withX402(handler, { amount: 5, asset: 'XLM' });

// Keep this for Beat 1
export const POST = handler;
