import { Agent } from '@mastra/core/agent';
import { createTool } from '@mastra/core/tools';
import { MCPClient } from '@mastra/mcp';
import { z } from 'zod';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const symbol = process.env.TICKER_SYMBOL ?? 'SAP';
const appriseUrl = process.env.APPRISE_URL ?? 'http://apprise.monitoring.svc.cluster.local:8000/notify/apprise';
const firecrawlApiUrl = process.env.FIRECRAWL_API_URL ?? 'http://firecrawl-api.home.svc.cluster.local:3002';
const model = process.env.OPENROUTER_MODEL ?? 'openrouter/free';
const dataDir = process.env.DATA_DIR ?? '/data';

function priceFile() {
  return join(dataDir, `${symbol.toLowerCase()}-price.json`);
}

export const mcp = new MCPClient({
  servers: {
    firecrawl: {
      command: 'npx',
      args: ['-y', 'firecrawl-mcp'],
      env: {
        FIRECRAWL_API_URL: firecrawlApiUrl,
        FIRECRAWL_API_KEY: 'any',
      },
    },
  },
});

const readLastPrice = createTool({
  id: 'readLastPrice',
  description: 'Read the last recorded price for the ticker from persistent storage',
  inputSchema: z.object({}),
  outputSchema: z.object({
    price: z.number().nullable(),
    timestamp: z.string().nullable(),
  }),
  execute: async (_input, _context) => {
    try {
      const data = JSON.parse(readFileSync(priceFile(), 'utf8'));
      return { price: data.price ?? null, timestamp: data.timestamp ?? null };
    } catch (e: any) {
      if (e.code !== 'ENOENT') console.log('readLastPrice error:', e.message);
      return { price: null, timestamp: null };
    }
  },
});

const savePrice = createTool({
  id: 'savePrice',
  description: 'Save the current price for the ticker to persistent storage',
  inputSchema: z.object({
    price: z.number().describe('Current stock price'),
  }),
  outputSchema: z.object({ ok: z.boolean() }),
  execute: async (input, _context) => {
    try {
      mkdirSync(dataDir, { recursive: true });
      writeFileSync(priceFile(), JSON.stringify({ price: input.price, timestamp: new Date().toISOString() }));
      return { ok: true };
    } catch (e: any) {
      console.log('savePrice error:', e.message);
      return { ok: false };
    }
  },
});

const sendNotification = createTool({
  id: 'sendNotification',
  description: 'Send a push notification via Apprise',
  inputSchema: z.object({
    title: z.string().describe('Notification title, e.g. "SAP $149.23 (+1.14%)"'),
    body: z.string().describe('Notification body with details'),
  }),
  outputSchema: z.object({ ok: z.boolean() }),
  execute: async (input, _context) => {
    try {
      const res = await fetch(appriseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: input.title, body: input.body }),
      });
      if (!res.ok) console.log('sendNotification HTTP error:', res.status, await res.text());
      return { ok: res.ok };
    } catch (e: any) {
      console.log('sendNotification error:', e.message);
      return { ok: false };
    }
  },
});

export async function createTickerAgent(): Promise<Agent> {
  const mcpTools = await mcp.listTools();
  return new Agent({
    id: 'ticker',
    name: 'Stock Ticker Agent',
    model: `openrouter/${model}`,
    instructions: `You are a stock price monitoring agent for the ${symbol} ticker.

Each time you run, follow these steps in order:
1. Call readLastPrice to get the previous price and timestamp.
2. Call firecrawl_firecrawl_scrape with url="https://stockanalysis.com/stocks/${symbol.toLowerCase()}/" and formats=["markdown"] to get the current stock price. The price appears near the top of the page right after the ticker heading as a plain number like "179.17".
3. Call savePrice with the extracted numeric price (digits and decimal point only, no currency symbols).
4. Call sendNotification with:
   - title: "${symbol} $<price> (<+/->X.XX%)" — include % change vs previous if available, or "first reading" if no previous price
   - body: multi-line with current price, previous price + elapsed time, % and absolute change. If first reading, just state the current price.`,
    tools: { readLastPrice, savePrice, sendNotification, ...mcpTools },
  });
}
