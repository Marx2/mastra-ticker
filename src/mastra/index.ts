import { Mastra } from '@mastra/core';
import { createTickerAgent, mcp } from './agents/ticker';

const symbol = process.env.TICKER_SYMBOL ?? 'SAP';

async function init() {
  const tickerAgent = await createTickerAgent();

  const mastraInstance = new Mastra({
    agents: { ticker: tickerAgent },
    mcpServers: mcp.toMCPServerProxies(),
  });

  const existing = await mastraInstance.schedules.list({ agentId: 'ticker' });
  if (existing.length === 0) {
    await mastraInstance.schedules.create({
      agentId: 'ticker',
      cron: '0 * * * *',
      prompt: `Check the current stock price for ${symbol} and send a notification.`,
      name: `${symbol} hourly price check`,
    });
    console.log(`Hourly schedule created for ${symbol}`);
  } else {
    console.log(`Schedule already exists for ticker agent (${existing.length} found)`);
  }

  return mastraInstance;
}

export const mastra = await init();
