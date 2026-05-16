const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const isVercel = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';

const DB_PATH = isVercel
  ? '/tmp/gateway-db.json'
  : path.join(__dirname, 'db', 'gateway-db.json');

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
  rateLimitConfig: {
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

let dbCache = null;
let cacheTime = 0;

function loadDB() {
  const now = Date.now();
  if (dbCache && now - cacheTime < 1000) {
    return dbCache;
  }

  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, 'utf-8');
      dbCache = JSON.parse(data);
      cacheTime = now;
      return dbCache;
    }
  } catch (e) {
    console.error('DB load error:', e.message);
  }

  dbCache = JSON.parse(JSON.stringify(DEFAULT_DB));
  saveDB(dbCache);
  return dbCache;
}

function saveDB(db) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
    dbCache = db;
    cacheTime = Date.now();
  } catch (e) {
    console.error('DB save error:', e.message);
  }
}

function generateKey(prefix = 'sk') {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let key = prefix + '-';
  for (let i = 0; i < 48; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

function hashKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

module.exports = {
  DB_PATH,
  DEFAULT_DB,
  loadDB,
  saveDB,
  generateKey,
  hashKey
};
