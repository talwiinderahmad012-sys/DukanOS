import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Load both .env and .env.local so DATABASE_URL / AUTH_SECRET are consistent
// for the Prisma CLI and migrations regardless of which file holds them.
config({ path: ".env" });
config({ path: ".env.local", override: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
