# mastra-ticker

Hourly stock price monitoring agent. Scrapes Yahoo Finance via Firecrawl, computes % change from previous hour, and sends a push notification via Apprise → ntfy → Android.

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `TICKER_SYMBOL` | `SAP` | Stock ticker to monitor |
| `OPENROUTER_API_KEY` | — | OpenRouter API key (required) |
| `OPENROUTER_MODEL` | `openrouter/free` | OpenRouter model ID — auto-routes to best available free model |
| `LIBSQL_URL` | `file:/data/mastra.db` | LibSQL database path |
| `FIRECRAWL_API_URL` | `http://firecrawl-api.home.svc.cluster.local:3002` | Firecrawl API endpoint |
| `APPRISE_URL` | `http://apprise.monitoring.svc.cluster.local:8000/notify` | Apprise notify endpoint |

## Run Locally

```bash
npm install
TICKER_SYMBOL=SAP \
OPENROUTER_API_KEY=your-key \
LIBSQL_URL=file:./local.db \
FIRECRAWL_API_URL=http://firecrawl-api.home.svc.cluster.local:3002 \
APPRISE_URL=http://apprise.monitoring.svc.cluster.local:8000/notify \
npm run dev
```

Open Mastra Studio at http://localhost:4111

## Trigger Manually

```bash
# List schedules
curl http://localhost:4111/api/schedules

# Fire schedule immediately
curl -X POST http://localhost:4111/api/schedules/<id>/run
```

## Docker Compose (local testing)

```bash
cp .env.example .env
# fill in OPENROUTER_API_KEY and override FIRECRAWL_API_URL / APPRISE_URL if testing locally
docker compose up
```

Open Mastra Studio at http://localhost:4111

## Docker (manual)
```bash
docker build -t mastra-ticker .
docker run -p 4111:4111 \
  -e TICKER_SYMBOL=SAP \
  -e OPENROUTER_API_KEY=your-key \
  -v /tmp/mastra-data:/data \
  mastra-ticker
```
