import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/infra/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgresql://propatch_user:propatch_secret_2026@127.0.0.1:5434/propatch_db",
  },
});
