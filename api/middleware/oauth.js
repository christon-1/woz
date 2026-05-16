const { loadDB, saveDB, generateKey, hashKey } = require('../db/database');
const crypto = require('crypto');

function generateOAuthState() {
  return crypto.randomBytes(32).toString('hex');
}

function generateOAuthCode() {
  return crypto.randomBytes(16).toString('hex');
}

function initiateOAuth(provider, redirectUri) {
  const db = loadDB();
  const state = generateOAuthState();
  const oauthSecret = process.env.OAUTH_SECRET || 'oauth-secret-change-me';

  const config = db.oauth.providers[provider];
  if (!config) {
    return { error: `OAuth provider '${provider}' not configured` };
  }

  db.oauth.tokens[state] = {
    provider,
    redirectUri,
    created: Date.now(),
    expires: Date.now() + 300000
  };

  saveDB(db);

  const authUrl = new URL(config.authUrl);
  authUrl.searchParams.set('client_id', config.clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('scope', config.scopes.join(' '));

  return { authUrl: authUrl.toString(), state };
}

async function handleOAuthCallback(provider, code, state) {
  const db = loadDB();
  const tokenData = db.oauth.tokens[state];

  if (!tokenData || tokenData.provider !== provider) {
    return { error: 'Invalid OAuth state' };
  }

  if (Date.now() > tokenData.expires) {
    delete db.oauth.tokens[state];
    saveDB(db);
    return { error: 'OAuth state expired' };
  }

  const config = db.oauth.providers[provider];
  if (!config) {
    return { error: 'Provider not configured' };
  }

  try {
    const tokenResponse = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        redirect_uri: tokenData.redirectUri,
        grant_type: 'authorization_code'
      })
    });

    const tokens = await tokenResponse.json();

    if (!tokenResponse.ok) {
      return { error: 'Token exchange failed', details: tokens };
    }

    const userResponse = await fetch(config.userUrl, {
      headers: { 'Authorization': `Bearer ${tokens.access_token}` }
    });

    const user = await userResponse.json();

    const userId = `${provider}:${user.id || user.sub || user.login}`;

    if (!db.users[userId]) {
      db.users[userId] = {
        id: userId,
        provider,
        profile: user,
        created: new Date().toISOString(),
        tier: 'free'
      };
    }

    const apiKey = generateKey('sk-oauth');
    const hashedKey = hashKey(apiKey);

    db.apiKeys[hashedKey] = {
      userId,
      tier: db.users[userId].tier || 'free',
      created: new Date().toISOString(),
      expiresAt: null,
      revoked: false,
      name: `${provider} OAuth Key`,
      lastUsed: null,
      requestCount: 0,
      oauthProvider: provider
    };

    delete db.oauth.tokens[state];
    saveDB(db);

    return {
      success: true,
      userId,
      apiKey,
      user: db.users[userId],
      redirectUri: tokenData.redirectUri
    };

  } catch (e) {
    return { error: 'OAuth callback failed', details: e.message };
  }
}

function configureOAuthProvider(provider, config) {
  const db = loadDB();
  db.oauth.providers[provider] = {
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    authUrl: config.authUrl,
    tokenUrl: config.tokenUrl,
    userUrl: config.userUrl,
    scopes: config.scopes || ['read']
  };
  saveDB(db);
  return { success: true, provider };
}

module.exports = {
  initiateOAuth,
  handleOAuthCallback,
  configureOAuthProvider,
  generateOAuthState
};
