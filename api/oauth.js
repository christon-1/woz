const { initiateOAuth, handleOAuthCallback } = require('./middleware/oauth');

module.exports = async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const provider = url.searchParams.get('provider');
  const isCallback = req.url.includes('callback');

  if (!isCallback) {
    if (!provider) {
      return res.status(400).json({ error: 'Missing provider parameter' });
    }

    const redirectUri = url.searchParams.get('redirect_uri');
    if (!redirectUri) {
      return res.status(400).json({ error: 'Missing redirect_uri parameter' });
    }

    const result = initiateOAuth(provider, redirectUri);

    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    return res.status(200).json(result);
  }

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code || !state) {
    return res.status(400).json({ error: 'Missing code or state parameter' });
  }

  const result = await handleOAuthCallback(provider, code, state);

  if (result.error) {
    return res.status(400).json({ error: result.error });
  }

  return res.status(200).json({
    success: true,
    userId: result.userId,
    apiKey: result.apiKey,
    message: 'OAuth successful. Save your API key.'
  });
};
