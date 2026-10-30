const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, rm, writeFile } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const { execFileSync } = require('node:child_process');
const { PrismaClient } = require('../generated/prisma');
const { PrismaLibSql } = require('@prisma/adapter-libsql');

test('local libSQL persistence and Auth.js adapter contracts', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'cornucopia-db-test-'));
  const url = `file:${join(directory, 'fixture.db').replaceAll('\\', '/')}`;
  let db;
  try {
    await writeFile(join(directory, 'fixture.db'), '');
    // The explicit URL overrides .env. Never use the configured remote database.
    execFileSync(process.execPath, [
      resolve('node_modules/prisma/build/index.js'), 'db', 'push',
      '--schema', resolve('prisma/schema.prisma'), '--skip-generate',
    ], { env: { ...process.env, DATABASE_URL: url }, stdio: 'pipe' });
    db = new PrismaClient({ adapter: new PrismaLibSql({ url }) });
    const { PrismaAdapter } = await import('@auth/prisma-adapter');
    let adapter = PrismaAdapter(db);
    const user = await adapter.createUser({ name: 'Fixture', email: 'fixture@example.test', emailVerified: null, image: null });
    const other = await adapter.createUser({ name: 'Other', email: 'other@example.test', emailVerified: null, image: null });
    await adapter.linkAccount({ userId: user.id, type: 'oauth', provider: 'discord', providerAccountId: 'fixture-discord' });
    assert.equal((await adapter.getUserByAccount({ provider: 'discord', providerAccountId: 'fixture-discord' })).id, user.id);
    const token = 'local-fixture-session';
    await adapter.createSession({ sessionToken: token, userId: user.id, expires: new Date(Date.now() + 60000) });
    assert.equal((await adapter.getSessionAndUser(token)).user.id, user.id);
    await adapter.updateSession({ sessionToken: token, expires: new Date(Date.now() + 120000) });

    const deck = await db.deck.create({ data: { userId: user.id, name: 'Fixture deck' } });
    assert.equal(await db.deck.findFirst({ where: { id: deck.id, userId: other.id } }), null);
    await db.deck.update({ where: { id: deck.id, userId: user.id }, data: { archetype: 'Aggro' } });
    assert.equal((await db.deck.findUnique({ where: { id: deck.id } })).archetype, 'Aggro');
    const route = await db.hikingMapData.create({ data: {
      userId: user.id, name: 'Fixture route', waypoints: '[]', routeCoords: '[]',
      routeSegments: '[]', routeWaypointDistancesKm: '[]', distanceKm: 0,
    } });
    await db.user.update({ where: { id: user.id }, data: { diceRollerStats: '{"rolls":1}' } });
    await db.$disconnect();
    db = new PrismaClient({ adapter: new PrismaLibSql({ url }) });
    adapter = PrismaAdapter(db);
    assert.equal((await db.user.findUnique({ where: { id: user.id } })).diceRollerStats, '{"rolls":1}');
    assert.equal((await db.hikingMapData.findUnique({ where: { id: route.id } })).name, 'Fixture route');
    await db.hikingMapData.delete({ where: { id: route.id } });
    await db.deck.delete({ where: { id: deck.id } });
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
