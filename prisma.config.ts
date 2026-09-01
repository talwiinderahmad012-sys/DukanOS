import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Load both .env and .env.local (Next.js precedence: values in .env.local
// override .env) so DATABASE_URL / AUTH_SECRET are consistent for the
// Prisma CLI, migrations and the seed command regardless of which file
// holds them. Without this, every `npx prisma ...` command dies with
// "Environment variable not found: DATABASE_URL".
config({ path: ".env" });
config({ path: ".env.local", override: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // Prisma 7 ignores package.json#prisma.seed — the seed command is
    // configured here instead and runs via `npx prisma db seed`.
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
