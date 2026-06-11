// One-shot Turso migration: safely adds missing app tables/columns.
import { createClient } from "@libsql/client";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "../.env") });

const url = process.env.TURSO_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error("TURSO_DATABASE_URL or DATABASE_URL not set");

// Parse libsql URL with embedded auth_token query param
const parsed = new URL(url);
const authToken = parsed.searchParams.get("auth_token") ?? process.env.TURSO_AUTH_TOKEN;
const cleanUrl = `${parsed.protocol}//${parsed.host}`;

const db = createClient({ url: cleanUrl, authToken });

async function columnExists(table, column) {
  const res = await db.execute(`PRAGMA table_info(${table})`);
  return res.rows.some((r) => r.name === column);
}

async function tableExists(table) {
  const res = await db.execute(
    `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
    [table],
  );
  return res.rows.length > 0;
}

async function addColumnIfMissing(table, column, type) {
  if (await columnExists(table, column)) {
    console.log(`  skip  ${table}.${column} (exists)`);
  } else {
    await db.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
    console.log(`  added ${table}.${column}`);
  }
}

async function main() {
  console.log("Connected to:", cleanUrl);

  // ── CommanderSelection: add missing columns (table may not exist in all envs) ─
  console.log("\nCommanderSelection missing columns:");
  if (!(await tableExists("CommanderSelection"))) {
    console.log("  skip  CommanderSelection (table does not exist)");
  } else {
    const csColumns = [
      ["commanderPreferredPrintId",        "TEXT"],
      ["commanderPreferredPrintImage",      "TEXT"],
      ["commanderPreferredPrintArt",        "TEXT"],
      ["commanderPreferredPrintBackImage",  "TEXT"],
      ["commanderPreferredPrintBackArt",    "TEXT"],
      ["partnerPreferredPrintId",           "TEXT"],
      ["partnerPreferredPrintImage",        "TEXT"],
      ["partnerPreferredPrintArt",          "TEXT"],
      ["partnerPreferredPrintBackImage",    "TEXT"],
      ["partnerPreferredPrintBackArt",      "TEXT"],
      ["companionScryfallId",               "TEXT"],
      ["companionName",                     "TEXT"],
      ["companionTypeLine",                 "TEXT"],
      ["companionImage",                    "TEXT"],
      ["companionArtCrop",                  "TEXT"],
      ["companionPreferredPrintId",         "TEXT"],
      ["companionPreferredPrintImage",      "TEXT"],
      ["companionPreferredPrintArt",        "TEXT"],
      ["companionPreferredPrintBackImage",  "TEXT"],
      ["companionPreferredPrintBackArt",    "TEXT"],
    ];
    for (const [col, type] of csColumns) {
      await addColumnIfMissing("CommanderSelection", col, type);
    }
  }

  // ── User: add deckListImportPromptSeen ─────────────────────────────────────
  console.log("\nUser table:");
  await addColumnIfMissing("User", "deckListImportPromptSeen", "INTEGER NOT NULL DEFAULT 0");

  // ── Deck table ─────────────────────────────────────────────────────────────
  console.log("\nDeck table:");
  if (await tableExists("Deck")) {
    console.log("  Deck table already exists");
  } else {
    await db.execute(`
      CREATE TABLE Deck (
        id                  TEXT    PRIMARY KEY NOT NULL,
        userId              TEXT    NOT NULL,
        createdAt           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        name                TEXT,
        commanderScryfallId TEXT,
        commanderName       TEXT,
        commanderTypeLine   TEXT,
        commanderImage      TEXT,
        commanderArtCrop    TEXT,
        partnerScryfallId   TEXT,
        partnerName         TEXT,
        partnerTypeLine     TEXT,
        partnerImage        TEXT,
        partnerArtCrop      TEXT,
        partnerType         TEXT,
        companionScryfallId TEXT,
        companionName       TEXT,
        companionTypeLine   TEXT,
        companionImage      TEXT,
        companionArtCrop    TEXT,
        bracket             TEXT,
        tags                TEXT    NOT NULL DEFAULT '[]',
        favoriteTag         TEXT,
        archetype           TEXT,
        deckListUrl         TEXT,
        colorId             TEXT,
        FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
      )
    `);
    console.log("  created Deck table");
  }

  console.log("\nHikingMapData table:");
  if (await tableExists("HikingMapData")) {
    console.log("  HikingMapData table already exists");
  } else {
    await db.execute(`
      CREATE TABLE HikingMapData (
        id                        TEXT     PRIMARY KEY NOT NULL,
        userId                    TEXT,
        createdAt                 DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt                 DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        name                      TEXT     NOT NULL,
        waypoints                 TEXT     NOT NULL,
        routeCoords               TEXT     NOT NULL,
        routeSegments             TEXT     NOT NULL,
        routeWaypointDistancesKm  TEXT     NOT NULL,
        distanceKm                REAL     NOT NULL,
        FOREIGN KEY (userId) REFERENCES User(id) ON DELETE SET NULL
      )
    `);
    console.log("  created HikingMapData table");
  }

  console.log("\nHikingMapData indexes:");
  await db.execute(`
    CREATE INDEX IF NOT EXISTS HikingMapData_userId_createdAt_idx
    ON HikingMapData(userId, createdAt)
  `);
  console.log("  ensured HikingMapData_userId_createdAt_idx");

  console.log("\nDone.");
  db.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
