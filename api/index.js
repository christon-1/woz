module.exports = async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/health' || url.pathname === '/') {
    return res.status(200).json({
      status: 'ok',
      service: 'ai-gateway',
      version: '1.0.0',
      endpoints: [
        'POST /v1/chat/completions',
        'GET  /v1/models',
        'POST /v1/keys',
        'GET  /v1/keys?action=list',
        'DELETE /v1/keys',
        'GET  /v1/credits',
        'GET  /v1/oauth/authorize?provider=github&redirect_uri=...',
        'GET  /v1/oauth/callback?code=...&state=...',
        'GET  /v1/admin/stats',
        'POST /v1/admin/credits',
        'POST /v1/admin/keys',
        'POST /v1/admin/tier',
        'GET  /v1/admin/db',
        'GET  /health'
      ]
    });
  }

  return res.status(404).json({ error: 'Not found' });
};
