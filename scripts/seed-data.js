const path = require('path');
const { loadDB, saveDB, generateKey, hashKey } = require('../api/db/database');

function seed() {
  const db = loadDB();

  const demoUser = 'demo-user-001';
  const adminUser = 'admin-user-001';

  if (!db.users[demoUser]) {
    db.users[demoUser] = {
      id: demoUser,
      provider: 'local',
      profile: { name: 'Demo User' },
      created: new Date().toISOString(),
      tier: 'free'
    };
  }

  if (!db.users[adminUser]) {
    db.users[adminUser] = {
      id: adminUser,
      provider: 'local',
      profile: { name: 'Admin User' },
      created: new Date().toISOString(),
      tier: 'enterprise'
    };
  }

  const demoKey = generateKey('sk');
  const demoHashed = hashKey(demoKey);
  db.apiKeys[demoHashed] = {
    userId: demoUser,
    tier: 'free',
    created: new Date().toISOString(),
    expiresAt: null,
    revoked: false,
    name: 'Demo Free Key',
    lastUsed: null,
    requestCount: 0
  };

  const proKey = generateKey('sk');
  const proHashed = hashKey(proKey);
  db.apiKeys[proHashed] = {
    userId: demoUser,
    tier: 'pro',
    created: new Date().toISOString(),
    expiresAt: null,
    revoked: false,
    name: 'Demo Pro Key',
    lastUsed: null,
    requestCount: 0
  };

  const adminKey = generateKey('sk');
  const adminHashed = hashKey(adminKey);
  db.apiKeys[adminHashed] = {
    userId: adminUser,
    tier: 'enterprise',
    created: new Date().toISOString(),
    expiresAt: null,
    revoked: false,
    name: 'Admin Key',
    lastUsed: null,
    requestCount: 0
  };

  db.credits[demoUser] = {
    balance: 100,
    totalAdded: 100,
    totalUsed: 0,
    history: [{ type: 'add', amount: 100, reason: 'seed', timestamp: new Date().toISOString(), balance: 100 }]
  };

  db.credits[adminUser] = {
    balance: 10000,
    totalAdded: 10000,
    totalUsed: 0,
    history: [{ type: 'add', amount: 10000, reason: 'seed', timestamp: new Date().toISOString(), balance: 10000 }]
  };

  saveDB(db);

  console.log('=== SEED DATA CREATED ===\n');
  console.log('DEMO FREE KEY (5 req/min, 500 credits):');
  console.log(`  ${demoKey}\n`);
  console.log('DEMO PRO KEY (30 req/min, Claude access):');
  console.log(`  ${proKey}\n`);
  console.log('ADMIN KEY (100 req/min, all models):');
  console.log(`  ${adminKey}\n`);
  console.log('SAVE THESE KEYS - they will not be shown again!');
}

seed();
