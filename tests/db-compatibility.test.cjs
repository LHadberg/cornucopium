const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, rm, writeFile } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const { execFileSync } = require('node:child_process');
const { PrismaClient } = require('../generated/prisma');
const { PrismaLibSql } = require('@prisma/adapter-libsql');
const { build } = require('esbuild');

test('local libSQL persistence and Auth.js adapter contracts', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'cornucopia-db-test-'));
  const url = `file:${join(directory, 'fixture.db').replaceAll('\\', '/')}`;
  let db;
  try {
    await writeFile(join(directory, 'fixture.db'), '');
    // The explicit URL overrides .env. Never use the configured remote database.
    execFileSync(process.execPath, [
      resolve('node_modules/prisma/build/index.js'), 'db', 'push',
      '--schema', resolve('prisma/schema.prisma'),
    ], { env: { ...process.env, DATABASE_URL: url }, stdio: 'pipe' });
    db = new PrismaClient({ adapter: new PrismaLibSql({ url }) });
    const { PrismaAdapter } = await import('@auth/prisma-adapter');
    let adapter = PrismaAdapter(db);
    assert.ok(adapter.createUser && adapter.linkAccount && adapter.getUserByAccount && adapter.createSession && adapter.getSessionAndUser && adapter.updateSession);
    const user = await adapter.createUser({ id: 'fixture-user', name: 'Fixture', email: 'fixture@example.test', emailVerified: null, image: null });
    const other = await adapter.createUser({ id: 'other-user', name: 'Other', email: 'other@example.test', emailVerified: null, image: null });
    await adapter.linkAccount({ userId: user.id, type: 'oauth', provider: 'discord', providerAccountId: 'fixture-discord' });
    assert.equal((await adapter.getUserByAccount({ provider: 'discord', providerAccountId: 'fixture-discord' }))?.id, user.id);
    const token = 'local-fixture-session';
    await adapter.createSession({ sessionToken: token, userId: user.id, expires: new Date(Date.now() + 60000) });
    assert.equal((await adapter.getSessionAndUser(token))?.user.id, user.id);
    await adapter.updateSession({ sessionToken: token, expires: new Date(Date.now() + 120000) });

    const deck = await db.deck.create({ data: { userId: user.id, name: 'Fixture deck' } });
    assert.equal(await db.deck.findFirst({ where: { id: deck.id, userId: other.id } }), null);
    await db.deck.update({ where: { id: deck.id, userId: user.id }, data: { archetype: 'Aggro' } });
    assert.equal((await db.deck.findUnique({ where: { id: deck.id } }))?.archetype, 'Aggro');
    const route = await db.hikingMapData.create({ data: {
      userId: user.id, name: 'Fixture route', waypoints: '[]', routeCoords: '[]',
      routeSegments: '[]', routeWaypointDistancesKm: '[]', distanceKm: 0,
    } });
    await db.user.update({ where: { id: user.id }, data: { diceRollerStats: '{"rolls":1}' } });
    await db.$disconnect();
    db = new PrismaClient({ adapter: new PrismaLibSql({ url }) });
    adapter = PrismaAdapter(db);
    assert.equal((await db.user.findUnique({ where: { id: user.id } }))?.diceRollerStats, '{"rolls":1}');
    assert.equal((await db.hikingMapData.findUnique({ where: { id: route.id } }))?.name, 'Fixture route');

    // Exercise real routers/validators against the fixture DB. Only external
    // context creation and Redis are replaced; caller context is explicit.
    const bundled = await build({
      entryPoints: ['src/server/api/root.ts'], bundle: true, platform: 'node', format: 'cjs', write: false,
      define: { 'process.env.NODE_ENV': '"production"' },
      plugins: [{ name: 'local-context', setup(builder) {
        builder.onResolve({ filter: /^~\/server\/(auth|db|ratelimit)$/ }, args => ({ path: args.path, namespace: 'fixture' }));
        builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: 'export const auth = async () => null; export const db = {}; export const generalLimiter = null; export const nameGenLimiter = null;' }));
      } }],
    });
    assert.ok(bundled.outputFiles[0]);
    const { createCaller } = new Function('require', 'module', `${bundled.outputFiles[0].text}; return module.exports;`)(require, { exports: {} });
    const caller = createCaller({ db, session: { user: { id: user.id }, expires: new Date(Date.now() + 60000).toISOString() }, headers: new Headers() });
    const guest = createCaller({ db, session: null, headers: new Headers() });
    const stranger = createCaller({ db, session: { user: { id: other.id }, expires: new Date(Date.now() + 60000).toISOString() }, headers: new Headers() });
    await assert.rejects(guest.decks.getAll(), { code: 'UNAUTHORIZED' });
    assert.equal((await caller.decks.getAll()).length, 1);
    assert.equal((await stranger.decks.getAll()).length, 0);
    await assert.rejects(caller.dice.saveConfig({ stats: 123 }), { code: 'BAD_REQUEST' });
    await caller.dice.saveConfig({ stats: '{"rolls":2}', selectedActionSet: null });
    assert.equal((await caller.dice.getConfig()).diceRollerStats, '{"rolls":2}');
    assert.equal((await caller.hiking.list()).length, 1);
    assert.equal((await stranger.hiking.list()).length, 0);
    await assert.rejects(caller.hiking.save({ name: '' }), { code: 'BAD_REQUEST' });
    await db.hikingMapData.delete({ where: { id: route.id } });
    await db.deck.delete({ where: { id: deck.id } });
    assert.ok(adapter.deleteSession && adapter.getSessionAndUser);
    await adapter.deleteSession(token);
    assert.equal(await adapter.getSessionAndUser(token), null);
  } catch (error) {
    console.error('Database compatibility assertion failed:', error);
    throw error;
  } finally {
    await db?.$disconnect();
    await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
});

