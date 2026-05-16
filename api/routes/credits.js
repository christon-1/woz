const { authenticateRequest } = require('../middleware/auth');
const { getCreditBalance } = require('../middleware/credits');

module.exports = async (req, res) => {
  const auth = authenticateRequest(req);
  if (!auth.authenticated) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const balance = getCreditBalance(auth.apiKey);

  if (!balance) {
    return res.status(404).json({ error: 'No credit account found' });
  }

  return res.status(200).json({
    balance: balance.balance,
    totalAdded: balance.totalAdded,
    totalUsed: balance.totalUsed,
    history: balance.history.slice(-20)
  });
};
