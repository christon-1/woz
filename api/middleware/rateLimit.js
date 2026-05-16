const { loadDB, saveDB } = require('../db/database');

function checkRateLimit(apiKey, model = 'default') {
  const db = loadDB();
  const now = Date.now();
  const minuteAgo = now - 60000;
  const hourAgo = now - 3600000;
  const dayAgo = now - 86400000;

  const keyData = db.apiKeys[apiKey];
  if (!keyData) {
    return { allowed: false, error: 'Invalid API key', status: 401 };
  }

  const tier = keyData.tier || 'free';
  const limits = db.rateLimits.tiers[tier] || db.rateLimits.default;

  if (!db.rateLimits[apiKey]) {
    db.rateLimits[apiKey] = { requests: [], tokens: [] };
  }

  const rl = db.rateLimits[apiKey];

  rl.requests = rl.requests.filter(t => t > dayAgo);
  rl.tokens = rl.tokens.filter(t => t > dayAgo);

  const minuteReqs = rl.requests.filter(t => t > minuteAgo).length;
  const hourReqs = rl.requests.filter(t => t > hourAgo).length;
  const dayReqs = rl.requests.length;

  if (minuteReqs >= limits.requestsPerMinute) {
    return { allowed: false, error: 'Rate limit exceeded: requests per minute', retryAfter: 60, status: 429 };
  }
  if (hourReqs >= limits.requestsPerHour) {
    return { allowed: false, error: 'Rate limit exceeded: requests per hour', retryAfter: 3600, status: 429 };
  }
  if (dayReqs >= limits.requestsPerDay) {
    return { allowed: false, error: 'Rate limit exceeded: requests per day', retryAfter: 86400, status: 429 };
  }

  const minuteTokens = rl.tokens.filter(t => t > minuteAgo).reduce((sum, t) => sum + (t.tokens || 0), 0);
  if (minuteTokens >= limits.tokensPerMinute) {
    return { allowed: false, error: 'Rate limit exceeded: tokens per minute', retryAfter: 60, status: 429 };
  }

  rl.requests.push(now);
  saveDB(db);

  return {
    allowed: true,
    remaining: {
      requestsPerMinute: limits.requestsPerMinute - minuteReqs - 1,
      requestsPerHour: limits.requestsPerHour - hourReqs - 1,
      requestsPerDay: limits.requestsPerDay - dayReqs - 1
    },
    limits
  };
}

function recordTokenUsage(apiKey, tokens) {
  const db = loadDB();
  if (!db.rateLimits[apiKey]) {
    db.rateLimits[apiKey] = { requests: [], tokens: [] };
  }
  db.rateLimits[apiKey].tokens.push({ time: Date.now(), tokens });
  saveDB(db);
}

module.exports = { checkRateLimit, recordTokenUsage };
