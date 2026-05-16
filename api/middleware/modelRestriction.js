const { loadDB } = require('../db/database');

function checkModelAccess(apiKey, model) {
  const db = loadDB();
  const keyData = db.apiKeys[apiKey];
  if (!keyData) {
    return { allowed: false, error: 'Invalid API key', status: 401 };
  }

  const tier = keyData.tier || 'free';
  const restrictions = db.modelRestrictions.tiers[tier] || db.modelRestrictions.default;

  if (restrictions.allowed === 'all') {
    return { allowed: true, tier };
  }

  if (restrictions.blocked.includes(model)) {
    return {
      allowed: false,
      error: `Model '${model}' is blocked for ${tier} tier`,
      status: 403,
      allowedModels: restrictions.allowed
    };
  }

  if (restrictions.allowed.length > 0 && !restrictions.allowed.includes(model)) {
    return {
      allowed: false,
      error: `Model '${model}' is not available in ${tier} tier`,
      status: 403,
      allowedModels: restrictions.allowed
    };
  }

  return { allowed: true, tier, restrictions };
}

function getAvailableModels(apiKey) {
  const db = loadDB();
  const keyData = db.apiKeys[apiKey];
  const tier = keyData ? (keyData.tier || 'free') : 'free';
  const restrictions = db.modelRestrictions.tiers[tier] || db.modelRestrictions.default;

  if (restrictions.allowed === 'all') {
    return Object.keys(db.creditPrices);
  }

  return restrictions.allowed.filter(m => !restrictions.blocked.includes(m));
}

function getModelPrice(model) {
  const db = loadDB();
  return db.creditPrices[model] || 1;
}

module.exports = { checkModelAccess, getAvailableModels, getModelPrice };
