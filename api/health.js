module.exports = async (req, res) => {
  return res.status(200).json({
    status: 'ok',
    service: 'ai-gateway',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
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
};
