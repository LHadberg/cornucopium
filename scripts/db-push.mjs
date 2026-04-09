import { execSync } from "child_process";
import { createClient } from "@libsql/client";
import { DatabaseSync } from "node:sqlite";
import { unlinkSync, existsSync } from "fs";

const dbUrl = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
const tmpDb = "./tmp_migration.db";

const client = createClient({ url: dbUrl, authToken });

// Mirror current Turso schema into a temp local SQLite so prisma can diff against it
const { rows } = await client.execute(
  "SELECT sql FROM sqlite_master WHERE type='table' AND sql IS NOT NULL ORDER BY name"
);

if (existsSync(tmpDb)) unlinkSync(tmpDb);
const localDb = new DatabaseSync(tmpDb);
for (const row of rows) localDb.exec(String(row.sql));
localDb.close();

try {
  const sql = execSync(
    `npx prisma migrate diff --from-url "file:${tmpDb}" --to-schema-datamodel prisma/schema.prisma --script`,
    { encoding: "utf8" }
  );

  if (sql.trim() === "-- This is an empty migration.") {
    console.log("Schema is already up to date.");
    process.exit(0);
  }

  console.log(sql);
  await client.executeMultiple(sql);
  console.log("Schema updated successfully.");
} finally {
  if (existsSync(tmpDb)) unlinkSync(tmpDb);
}
