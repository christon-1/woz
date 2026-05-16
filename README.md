# AI Gateway - Vercel API Proxy

Full-featured API gateway with rate limiting, credits, OAuth, model restrictions, and admin controls.

## Quick Start

```bash
# 1. Install dependencies
cd vercel
npm install

# 2. Initialize database
npm run init-db

# 3. Seed demo data (creates API keys)
npm run seed

# 4. Deploy to Vercel
npm run deploy

# Or run locally
npm run dev
```

## Architecture

```
Client (test.py)
    |
    v
AI Gateway (Vercel)
    |
    +-- Auth Middleware (API key validation)
    +-- Rate Limit Middleware (per-key limits)
    +-- Credits Middleware (pay-per-request)
    +-- Model Restriction (tier-based access)
    |
    v
Upstream API (h3xloader.fun)
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/chat/completions` | Chat completion (OpenAI compatible) |
| GET | `/v1/models` | List available models for your tier |
| POST | `/v1/keys` | Create new API key |
| GET | `/v1/keys?action=list` | List your API keys |
| DELETE | `/v1/keys` | Revoke an API key |
| GET | `/v1/credits` | Check credit balance |
| GET | `/v1/oauth/authorize` | Start OAuth flow |
| GET | `/v1/oauth/callback` | Complete OAuth flow |
| GET | `/v1/admin/stats` | Gateway statistics |
| POST | `/v1/admin/credits` | Add credits to user |
| POST | `/v1/admin/keys` | Create key for any user |
| POST | `/v1/admin/tier` | Change user tier |
| GET | `/v1/admin/db` | View database (sanitized) |

## Tiers

| Tier | Req/min | Req/day | Models | Max Tokens |
|------|---------|---------|--------|------------|
| free | 5 | 500 | GPT only | 4096 |
| pro | 30 | 5000 | GPT + Claude | 8192 |
| enterprise | 100 | 20000 | All models | 16384 |

## Credit Prices

| Model | Cost |
|-------|------|
| gpt-5.5 | 10 |
| gpt-5.4 | 8 |
| gpt-5.2 | 5 |
| gpt-5.1 | 4 |
| gpt-5 | 3 |
| gpt-4.1 | 2 |
| gpt-5-mini | 1 |
| claude-opus-4-7 | 15 |
| claude-4-6-sonnet | 12 |
| gemini-3-1-pro | 8 |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `UPSTREAM_URL` | Backend API URL | `https://h3xloader.fun/free/v1` |
| `UPSTREAM_KEY` | Backend API key | `h3xloader24` |
| `ADMIN_KEY` | Admin authentication key | `admin-super-key-change-me` |
| `OAUTH_SECRET` | OAuth signing secret | `oauth-secret-change-me` |
| `DEFAULT_CREDITS` | Credits for new users | `100` |

## Admin CLI

```bash
node scripts/admin-cli.js stats
node scripts/admin-cli.js create-key user123 pro
node scripts/admin-cli.js add-credits user123 500
node scripts/admin-cli.js set-tier user123 enterprise
node scripts/admin-cli.js list-users
```

## Using with test.py

```bash
# Set gateway URL and key
set GATEWAY_URL=https://your-gateway.vercel.app
set GATEWAY_KEY=sk-your-api-key
python test.py
```

## Response Headers

Every chat response includes:
- `X-RateLimit-Remaining` - Remaining requests
- `X-Credits-Balance` - Credit balance after request
- `X-Credits-Used` - Credits charged for this request
