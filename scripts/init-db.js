const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'api', 'db', 'gateway-db.json');

const DEFAULT_DB = {
  version: '1.0.0',
  created: new Date().toISOString(),
  apiKeys: {},
  users: {},
  credits: {},
  rateLimits: {},
  oauth: {
    providers: {},
    tokens: {}
  },
  modelRestrictions: {
    default: {
      allowed: ['gpt-5.5', 'gpt-5.4', 'gpt-5.2', 'gpt-5.1', 'gpt-5', 'gpt-4.1', 'gpt-5-mini', 'gpt-5.4-mini', 'gpt-4.1-mini'],
      blocked: [],
      maxTokens: 8192,
      maxPerRequest: 4096
    },
    tiers: {
      free: {
        allowed: ['gpt-5.5', 'gpt-5.4', 'gpt-5.2', 'gpt-5.1', 'gpt-5', 'gpt-4.1', 'gpt-5-mini', 'gpt-5.4-mini', 'gpt-4.1-mini'],
        blocked: ['claude-opus-4-7', 'claude-4-6-sonnet', 'claude-4-5-sonnet'],
        maxTokens: 4096,
        maxPerRequest: 2048
      },
      pro: {
        allowed: ['gpt-5.5', 'gpt-5.4', 'gpt-5.2', 'gpt-5.1', 'gpt-5', 'gpt-4.1', 'gpt-5-mini', 'gpt-5.4-mini', 'gpt-4.1-mini', 'claude-opus-4-7', 'claude-4-6-sonnet', 'claude-4-5-sonnet'],
        blocked: [],
        maxTokens: 16384,
        maxPerRequest: 8192
      },
      enterprise: {
        allowed: 'all',
        blocked: [],
        maxTokens: 32768,
        maxPerRequest: 16384
      }
    }
  },
  rateLimits: {
    default: {
      requestsPerMinute: 10,
      requestsPerHour: 100,
      requestsPerDay: 1000,
      tokensPerMinute: 50000,
      tokensPerHour: 500000,
      tokensPerDay: 5000000
    },
    tiers: {
      free: {
        requestsPerMinute: 5,
        requestsPerHour: 50,
        requestsPerDay: 500,
        tokensPerMinute: 25000,
        tokensPerHour: 250000,
        tokensPerDay: 2500000
      },
      pro: {
        requestsPerMinute: 30,
        requestsPerHour: 500,
        requestsPerDay: 5000,
        tokensPerMinute: 150000,
        tokensPerHour: 1500000,
        tokensPerDay: 15000000
      },
      enterprise: {
        requestsPerMinute: 100,
        requestsPerHour: 2000,
        requestsPerDay: 20000,
        tokensPerMinute: 500000,
        tokensPerHour: 5000000,
        tokensPerDay: 50000000
      }
    }
  },
  creditPrices: {
    'gpt-5.5': 10,
    'gpt-5.4': 8,
    'gpt-5.2': 5,
    'gpt-5.1': 4,
    'gpt-5': 3,
    'gpt-4.1': 2,
    'gpt-5-mini': 1,
    'gpt-5.4-mini': 1,
    'gpt-4.1-mini': 1,
    'claude-opus-4-7': 15,
    'claude-4-6-sonnet': 12,
    'claude-4-5-sonnet': 10,
    'claude-4-5-haiku': 5,
    'gemini-3-1-pro': 8,
    'gemini-2.5-flash': 3,
    'gemini-3-flash': 2
  },
  stats: {
    totalRequests: 0,
    totalTokens: 0,
    totalCreditsUsed: 0,
    requestsByModel: {},
    requestsByUser: {}
  }
};

function init() {
  if (fs.existsSync(DB_PATH)) {
    console.log('Database already exists at:', DB_PATH);
    console.log('Delete it first to reinitialize.');
    return;
  }

  fs.writeFileSync(DB_PATH, JSON.stringify(DEFAULT_DB, null, 2), 'utf-8');
  console.log('Database initialized at:', DB_PATH);
  console.log('Default credits per user: 100');
  console.log('Run "npm run seed" to add demo data.');
}

init();
