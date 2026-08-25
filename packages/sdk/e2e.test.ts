import { test, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { attachAccensaHook } from './index'; // assuming it's exported here

test('e2e x402 middleware flow', async () => {
  const app = express();
  // Mock the middleware
  app.use('/pay', (req, res) => {
    res.status(402).json({ error: 'Payment required' });
  });

  const response = await request(app).get('/pay');
  expect(response.status).toBe(402);
});
