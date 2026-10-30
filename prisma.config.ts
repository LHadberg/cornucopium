import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // Keep CLI schema operations separate from the runtime Turso adapter URL.
  // Generation does not require a configured database; DB commands still do.
  datasource: { url: process.env.DATABASE_URL },
});
