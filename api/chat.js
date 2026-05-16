const { authenticateRequest } = require('./middleware/auth');
const { checkRateLimit, recordTokenUsage } = require('./middleware/rateLimit');
const { checkCredits, deductCredits } = require('./middleware/credits');
const { checkModelAccess } = require('./middleware/modelRestriction');
const { loadDB, saveDB } = require('./db/database');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = authenticateRequest(req);
  if (!auth.authenticated) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const apiKey = auth.apiKey;
  const body = req.body || {};

  if (!body.model) {
    return res.status(400).json({ error: 'Missing model parameter' });
  }

  if (!body.messages || !Array.isArray(body.messages)) {
    return res.status(400).json({ error: 'Missing or invalid messages array' });
  }

  const modelCheck = checkModelAccess(apiKey, body.model);
  if (!modelCheck.allowed) {
    return res.status(modelCheck.status).json({
      error: modelCheck.error,
      allowedModels: modelCheck.allowedModels
    });
  }

  const rateCheck = checkRateLimit(apiKey, body.model);
  if (!rateCheck.allowed) {
    return res.status(rateCheck.status).json({
      error: rateCheck.error,
      retryAfter: rateCheck.retryAfter
    });
  }

  const creditCheck = checkCredits(apiKey, body.model);
  if (!creditCheck.allowed) {
    return res.status(creditCheck.status).json({
      error: creditCheck.error,
      balance: creditCheck.balance,
      required: creditCheck.required
    });
  }

  try {
    const upstreamUrl = process.env.UPSTREAM_URL || 'https://h3xloader.fun/free/v1';
    const upstreamKey = process.env.UPSTREAM_KEY || 'h3xloader24';

    const response = await fetch(`${upstreamUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${upstreamKey}`
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    const tokensUsed = (data.usage && data.usage.total_tokens) || 0;
    recordTokenUsage(apiKey, tokensUsed);
    deductCredits(apiKey, body.model, tokensUsed);

    const db = loadDB();
    if (db.apiKeys && db.apiKeys[apiKey]) {
      db.apiKeys[apiKey].lastUsed = new Date().toISOString();
      db.apiKeys[apiKey].requestCount = (db.apiKeys[apiKey].requestCount || 0) + 1;
    }
    if (!db.stats) db.stats = { totalRequests: 0, totalTokens: 0, totalCreditsUsed: 0, requestsByModel: {}, requestsByUser: {} };
    db.stats.totalRequests++;
    db.stats.totalTokens += tokensUsed;
    db.stats.requestsByModel[body.model] = (db.stats.requestsByModel[body.model] || 0) + 1;
    db.stats.requestsByUser[auth.userId] = (db.stats.requestsByUser[auth.userId] || 0) + 1;
    saveDB(db);

    res.setHeader('X-RateLimit-Remaining', JSON.stringify(rateCheck.remaining));
    res.setHeader('X-Credits-Balance', creditCheck.remaining);
    res.setHeader('X-Credits-Used', creditCheck.price);

    return res.status(200).json(data);

  } catch (e) {
    return res.status(502).json({
      error: 'Upstream request failed',
      details: e.message
    });
  }
};
