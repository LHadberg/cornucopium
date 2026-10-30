const { test } = require('node:test');
const assert = require('node:assert/strict');
const { build } = require('esbuild');
const { spawnSync } = require('node:child_process');

test('saved life-tracker games preserve defaults and reject malformed data', async () => {
  const result = await build({ entryPoints: ['src/app/life-tracker/_components/saved-game.ts'], bundle: true, format: 'esm', write: false });
  assert.ok(result.outputFiles[0]);
  const { savedGameSchema } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
  const players = Array.from({ length: 4 }, (_, id) => ({
    id, name: `Player ${id}`, life: 40, color: 'blue',
    photos: { resting: null, damage: null },
    photoFocus: { resting: { x: 50, y: 50 }, damage: { x: 50, y: 50 } },
    counters: { poison: 0, energy: 0, experience: 0, tax: 0 },
    counterToggles: { poison: false, energy: false, experience: false, tax: false },
    partnerCommanders: false, commanderDamage: { '0': 1 },
  }));
  const game = { version: 1, players, playerCount: 4, startingLife: 40, orientationMode: 'outward', theme: 'A', starter: null };
  const parsed = savedGameSchema.parse(game);
  assert.equal(parsed.players[0].counters.partnerTax, 0);
  assert.equal(parsed.players[0].commanderDamage['0'], 1);
  assert.equal(savedGameSchema.safeParse({ ...game, players: players.slice(1) }).success, false);
  assert.equal(savedGameSchema.safeParse({ ...game, playerCount: 5 }).success, false);
  assert.equal(savedGameSchema.safeParse({ ...game, players: Array(10000).fill(players[0]) }).success, false);
  const bad = structuredClone(game);
  assert.ok(bad.players[0]);
  bad.players[0].commanderDamage = { '0': -1 };
  const invalid = savedGameSchema.safeParse(bad);
  assert.equal(invalid.success, false);
  assert.ok(invalid.error.flatten().fieldErrors.players.length);
});

test('environment validation accepts fixtures and rejects missing or invalid URLs', () => {
  /** @type {NodeJS.ProcessEnv} */
  const environment = {
    ...process.env, SKIP_ENV_VALIDATION: '', NODE_ENV: 'production',
    AUTH_SECRET: 'fixture-only', AUTH_DISCORD_ID: 'fixture', AUTH_DISCORD_SECRET: 'fixture',
    AUTH_URL: 'http://localhost:3012', DATABASE_URL: 'file:./fixture.db',
    TURSO_DATABASE_URL: 'file:./fixture.db', TURSO_AUTH_TOKEN: 'fixture',
    UPSTASH_REDIS_REST_URL: 'https://fixture.example.test', UPSTASH_REDIS_REST_TOKEN: 'fixture',
  };
  const command = ['--input-type=module', '--eval', "await import('./src/env.js')"];
  assert.equal(spawnSync(process.execPath, command, { env: environment }).status, 0);
  assert.notEqual(spawnSync(process.execPath, command, { env: { ...environment, AUTH_URL: '' } }).status, 0);
  assert.notEqual(spawnSync(process.execPath, command, { env: { ...environment, TURSO_DATABASE_URL: 'not-a-url' } }).status, 0);
});
