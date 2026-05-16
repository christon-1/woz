const { authenticateRequest } = require('../middleware/auth');
const { getAvailableModels, getModelPrice } = require('../middleware/modelRestriction');
const { loadDB } = require('../db/database');

module.exports = async (req, res) => {
  const auth = authenticateRequest(req);
  if (!auth.authenticated) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const db = loadDB();
  const availableModels = getAvailableModels(auth.apiKey);

  const models = availableModels.map(id => ({
    id,
    object: 'model',
    created: 0,
    owned_by: db.creditPrices[id] ? 'gated' : 'unknown',
    price: getModelPrice(id),
    available: true
  }));

  return res.status(200).json({
    object: 'list',
    data: models,
    tier: auth.tier
  });
};
