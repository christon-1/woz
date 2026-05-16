const { loadDB, saveDB } = require('../db/database');

function checkCredits(apiKey, model) {
  const db = loadDB();
  const keyData = db.apiKeys[apiKey];
  if (!keyData) {
    return { allowed: false, error: 'Invalid API key', status: 401 };
  }

  const userId = keyData.userId || apiKey;
  if (!db.credits[userId]) {
    db.credits[userId] = {
      balance: parseInt(process.env.DEFAULT_CREDITS || '100'),
      totalAdded: 0,
      totalUsed: 0,
      history: []
    };
    saveDB(db);
  }

  const creditData = db.credits[userId];
  const price = db.creditPrices[model] || 1;

  if (creditData.balance < price) {
    return {
      allowed: false,
      error: `Insufficient credits. Required: ${price}, Balance: ${creditData.balance}`,
      status: 402,
      balance: creditData.balance,
      required: price
    };
  }

  return {
    allowed: true,
    price,
    balance: creditData.balance,
    remaining: creditData.balance - price
  };
}

function deductCredits(apiKey, model, tokensUsed = 0) {
  const db = loadDB();
  const keyData = db.apiKeys[apiKey];
  const userId = keyData.userId || apiKey;

  if (!db.credits[userId]) return;

  const price = db.creditPrices[model] || 1;
  db.credits[userId].balance -= price;
  db.credits[userId].totalUsed += price;
  db.credits[userId].history.push({
    type: 'deduct',
    model,
    price,
    tokens: tokensUsed,
    timestamp: new Date().toISOString(),
    balance: db.credits[userId].balance
  });

  db.stats.totalCreditsUsed += price;
  saveDB(db);

  return {
    deducted: price,
    balance: db.credits[userId].balance,
    totalUsed: db.credits[userId].totalUsed
  };
}

function addCredits(apiKeyOrUserId, amount, reason = 'admin') {
  const db = loadDB();
  const userId = apiKeyOrUserId;

  if (!db.credits[userId]) {
    db.credits[userId] = {
      balance: 0,
      totalAdded: 0,
      totalUsed: 0,
      history: []
    };
  }

  db.credits[userId].balance += amount;
  db.credits[userId].totalAdded += amount;
  db.credits[userId].history.push({
    type: 'add',
    amount,
    reason,
    timestamp: new Date().toISOString(),
    balance: db.credits[userId].balance
  });

  saveDB(db);

  return {
    added: amount,
    balance: db.credits[userId].balance,
    totalAdded: db.credits[userId].totalAdded
  };
}

function getCreditBalance(apiKey) {
  const db = loadDB();
  const keyData = db.apiKeys[apiKey];
  if (!keyData) return null;

  const userId = keyData.userId || apiKey;
  return db.credits[userId] || null;
}

module.exports = { checkCredits, deductCredits, addCredits, getCreditBalance };
