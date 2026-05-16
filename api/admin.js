const { authenticateAdmin, createApiKey, revokeApiKey } = require('./middleware/auth');
const { addCredits } = require('./middleware/credits');
const { loadDB, saveDB } = require('./db/database');
const { configureOAuthProvider } = require('./middleware/oauth');

module.exports = async (req, res) => {
  const auth = authenticateAdmin(req);
  if (!auth.authenticated) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname.replace('/v1/admin/', '');
  const method = req.method;

  if (path === 'stats' && method === 'GET') {
    const db = loadDB();
    return res.status(200).json({
      stats: db.stats || { totalRequests: 0, totalTokens: 0, totalCreditsUsed: 0 },
      totalKeys: db.apiKeys ? Object.keys(db.apiKeys).length : 0,
      totalUsers: db.users ? Object.keys(db.users).length : 0,
      dbVersion: db.version
    });
  }

  if (path === 'credits' && method === 'POST') {
    const body = req.body || {};
    if (!body.userId || !body.amount) {
      return res.status(400).json({ error: 'Missing userId or amount' });
    }
    const result = addCredits(body.userId, body.amount, body.reason || 'admin');
    return res.status(200).json(result);
  }

  if (path === 'keys' && method === 'POST') {
    const body = req.body || {};
    if (!body.userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }
    const newKey = createApiKey(body.userId, body.tier || 'free', {
      name: body.name,
      expiresAt: body.expiresAt
    });
    return res.status(201).json({ key: newKey.key, details: newKey });
  }

  if (path === 'keys/revoke' && method === 'POST') {
    const body = req.body || {};
    if (!body.key) {
      return res.status(400).json({ error: 'Missing key' });
    }
    const result = revokeApiKey(body.key);
    return res.status(result.success ? 200 : 404).json(result);
  }

  if (path === 'oauth/configure' && method === 'POST') {
    const body = req.body || {};
    if (!body.provider || !body.clientId || !body.clientSecret) {
      return res.status(400).json({ error: 'Missing required OAuth config' });
    }
    const result = configureOAuthProvider(body.provider, body);
    return res.status(200).json(result);
  }

  if (path === 'tier' && method === 'POST') {
    const body = req.body || {};
    if (!body.userId || !body.tier) {
      return res.status(400).json({ error: 'Missing userId or tier' });
    }
    const db = loadDB();
    if (db.apiKeys) {
      for (const [hash, data] of Object.entries(db.apiKeys)) {
        if (data.userId === body.userId) {
          db.apiKeys[hash].tier = body.tier;
        }
      }
    }
    if (db.users && db.users[body.userId]) {
      db.users[body.userId].tier = body.tier;
    }
    saveDB(db);
    return res.status(200).json({ success: true, userId: body.userId, tier: body.tier });
  }

  if (path === 'db' && method === 'GET') {
    const db = loadDB();
    const safe = JSON.parse(JSON.stringify(db));
    if (safe.apiKeys) {
      for (const key of Object.keys(safe.apiKeys)) {
        safe.apiKeys[key] = { ...safe.apiKeys[key], hash: key.substring(0, 12) + '...' };
      }
    }
    return res.status(200).json(safe);
  }

  return res.status(404).json({ error: `Unknown admin endpoint: ${path}` });
};
