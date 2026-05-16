const { loadDB, saveDB, generateKey, hashKey } = require('../api/db/database');
const { addCredits } = require('../api/middleware/credits');
const { createApiKey, revokeApiKey, listApiKeys } = require('../api/middleware/auth');

const args = process.argv.slice(2);
const cmd = args[0];

function usage() {
  console.log(`
AI Gateway Admin CLI

Usage: node admin-cli.js <command> [options]

Commands:
  stats                          Show gateway statistics
  list-keys <userId>             List API keys for a user
  create-key <userId> [tier]     Create new API key (free/pro/enterprise)
  revoke-key <hashedKey>         Revoke an API key
  add-credits <userId> <amount>  Add credits to a user
  set-tier <userId> <tier>       Set user tier (free/pro/enterprise)
  list-users                     List all users
  show-db                        Show full database (sanitized)
  reset                          Reset database to defaults

Examples:
  node admin-cli.js stats
  node admin-cli.js create-key user123 pro
  node admin-cli.js add-credits user123 500
  node admin-cli.js set-tier user123 enterprise
`);
}

if (!cmd) {
  usage();
  process.exit(0);
}

switch (cmd) {
  case 'stats': {
    const db = loadDB();
    console.log('\n=== Gateway Statistics ===');
    console.log(`Total Requests:    ${db.stats.totalRequests}`);
    console.log(`Total Tokens:      ${db.stats.totalTokens}`);
    console.log(`Total Credits Used: ${db.stats.totalCreditsUsed}`);
    console.log(`Total API Keys:    ${Object.keys(db.apiKeys).length}`);
    console.log(`Total Users:       ${Object.keys(db.users).length}`);
    console.log('\nRequests by Model:');
    for (const [model, count] of Object.entries(db.stats.requestsByModel)) {
      console.log(`  ${model}: ${count}`);
    }
    break;
  }

  case 'list-keys': {
    const userId = args[1];
    if (!userId) { console.log('Usage: list-keys <userId>'); break; }
    const keys = listApiKeys(userId);
    console.log(`\nKeys for ${userId}:`);
    keys.forEach(k => {
      console.log(`  ${k.hash} | ${k.name} | ${k.tier} | ${k.revoked ? 'REVOKED' : 'active'} | ${k.requestCount} requests`);
    });
    if (keys.length === 0) console.log('  No keys found');
    break;
  }

  case 'create-key': {
    const userId = args[1];
    const tier = args[2] || 'free';
    if (!userId) { console.log('Usage: create-key <userId> [tier]'); break; }
    const result = createApiKey(userId, tier, { name: `admin-created-${Date.now()}` });
    console.log(`\nCreated key for ${userId} (${tier}):`);
    console.log(`  ${result.key}`);
    break;
  }

  case 'revoke-key': {
    const key = args[1];
    if (!key) { console.log('Usage: revoke-key <hashedKey>'); break; }
    const result = revokeApiKey(key);
    console.log(result.success ? 'Key revoked' : `Failed: ${result.error}`);
    break;
  }

  case 'add-credits': {
    const userId = args[1];
    const amount = parseInt(args[2]);
    if (!userId || isNaN(amount)) { console.log('Usage: add-credits <userId> <amount>'); break; }
    const result = addCredits(userId, amount, 'admin-cli');
    console.log(`Added ${amount} credits to ${userId}. New balance: ${result.balance}`);
    break;
  }

  case 'set-tier': {
    const userId = args[1];
    const tier = args[2];
    if (!userId || !tier) { console.log('Usage: set-tier <userId> <tier>'); break; }
    const db = loadDB();
    for (const [hash, data] of Object.entries(db.apiKeys)) {
      if (data.userId === userId) db.apiKeys[hash].tier = tier;
    }
    if (db.users[userId]) db.users[userId].tier = tier;
    saveDB(db);
    console.log(`Set ${userId} tier to ${tier}`);
    break;
  }

  case 'list-users': {
    const db = loadDB();
    console.log('\n=== Users ===');
    for (const [id, user] of Object.entries(db.users)) {
      const credits = db.credits[id];
      console.log(`  ${id} | ${user.tier} | credits: ${credits ? credits.balance : 0}`);
    }
    break;
  }

  case 'show-db': {
    const db = loadDB();
    const safe = JSON.parse(JSON.stringify(db));
    for (const key of Object.keys(safe.apiKeys)) {
      safe.apiKeys[key] = { ...safe.apiKeys[key], hash: key.substring(0, 12) + '...' };
    }
    console.log(JSON.stringify(safe, null, 2));
    break;
  }

  case 'reset': {
    const fs = require('fs');
    const DB_PATH = require('../api/db/database').DB_PATH;
    if (fs.existsSync(DB_PATH)) {
      fs.unlinkSync(DB_PATH);
      console.log('Database deleted. Run "npm run init-db" to recreate.');
    } else {
      console.log('Database does not exist.');
    }
    break;
  }

  default:
    console.log(`Unknown command: ${cmd}`);
    usage();
}
