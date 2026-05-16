const { loadDB, saveDB, generateKey, hashKey } = require('./db/database');

function authenticateRequest(req) {
  const authHeader = (req.headers && req.headers['authorization']) || '';
  const apiKey = authHeader.replace('Bearer ', '').trim();

  if (!apiKey) {
    return { authenticated: false, error: 'Missing API key', status: 401 };
  }

  const db = loadDB();
  const hashedKey = hashKey(apiKey);

  const keyData = db.apiKeys && db.apiKeys[hashedKey];
  if (!keyData) {
    return { authenticated: false, error: 'Invalid API key', status: 401 };
  }

  if (keyData.revoked) {
    return { authenticated: false, error: 'API key has been revoked', status: 401 };
  }

  if (keyData.expiresAt && new Date(keyData.expiresAt) < new Date()) {
    return { authenticated: false, error: 'API key has expired', status: 401 };
  }

  return {
    authenticated: true,
    apiKey: hashedKey,
    userId: keyData.userId,
    tier: keyData.tier || 'free',
    keyData
  };
}

function authenticateAdmin(req) {
  const authHeader = (req.headers && req.headers['authorization']) || '';
  const key = authHeader.replace('Bearer ', '').trim();
  const adminKey = process.env.ADMIN_KEY || 'admin-super-key-change-me';

  if (key !== adminKey) {
    return { authenticated: false, error: 'Invalid admin key', status: 403 };
  }

  return { authenticated: true, isAdmin: true };
}

function createApiKey(userId, tier = 'free', options = {}) {
  const db = loadDB();
  const rawKey = generateKey('sk');
  const hashedKey = hashKey(rawKey);

  if (!db.apiKeys) db.apiKeys = {};

  db.apiKeys[hashedKey] = {
    userId,
    tier,
    created: new Date().toISOString(),
    expiresAt: options.expiresAt || null,
    revoked: false,
    name: options.name || `key-${Date.now()}`,
    lastUsed: null,
    requestCount: 0
  };

  saveDB(db);

  return {
    key: rawKey,
    hashedKey,
    userId,
    tier,
    created: db.apiKeys[hashedKey].created,
    expiresAt: db.apiKeys[hashedKey].expiresAt,
    name: db.apiKeys[hashedKey].name
  };
}

function revokeApiKey(hashedKey) {
  const db = loadDB();
  if (!db.apiKeys || !db.apiKeys[hashedKey]) {
    return { success: false, error: 'Key not found' };
  }

  db.apiKeys[hashedKey].revoked = true;
  db.apiKeys[hashedKey].revokedAt = new Date().toISOString();
  saveDB(db);

  return { success: true, message: 'Key revoked' };
}

function listApiKeys(userId) {
  const db = loadDB();
  const keys = [];

  if (!db.apiKeys) return keys;

  for (const [hash, data] of Object.entries(db.apiKeys)) {
    if (data.userId === userId) {
      keys.push({
        hash: hash.substring(0, 12) + '...',
        name: data.name,
        tier: data.tier,
        created: data.created,
        expiresAt: data.expiresAt,
        revoked: data.revoked,
        lastUsed: data.lastUsed,
        requestCount: data.requestCount
      });
    }
  }

  return keys;
}

module.exports = {
  authenticateRequest,
  authenticateAdmin,
  createApiKey,
  revokeApiKey,
  listApiKeys
};
