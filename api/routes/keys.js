const { authenticateRequest, createApiKey, revokeApiKey, listApiKeys } = require('../middleware/auth');
const { loadDB } = require('../db/database');

module.exports = async (req, res) => {
  const auth = authenticateRequest(req);
  if (!auth.authenticated) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const method = req.method;

  if (method === 'POST') {
    const body = req.body || {};
    const newKey = createApiKey(auth.userId, body.tier || auth.tier, {
      name: body.name,
      expiresAt: body.expiresAt
    });

    return res.status(201).json({
      success: true,
      key: newKey.key,
      warning: 'Save this key - it will not be shown again',
      details: {
        name: newKey.name,
        tier: newKey.tier,
        created: newKey.created,
        expiresAt: newKey.expiresAt
      }
    });
  }

  if (method === 'GET' && url.searchParams.get('action') === 'list') {
    const keys = listApiKeys(auth.userId);
    return res.status(200).json({ keys });
  }

  if (method === 'DELETE') {
    const body = req.body || {};
    const result = revokeApiKey(body.key || body.hashedKey);
    return res.status(result.success ? 200 : 404).json(result);
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
