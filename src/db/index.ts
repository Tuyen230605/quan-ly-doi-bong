import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import { seed } from "./seed";

export type DB = PostgresJsDatabase<typeof schema>;

const g = globalThis as unknown as { __footballDb?: Promise<DB> };

// Có DATABASE_URL (Neon, Supabase...) thì dùng Postgres thật.
// Không có thì dùng PGlite: Postgres chạy ngay trong Node, dữ liệu lưu ở thư mục .data/
async function connect(): Promise<DB> {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url && process.env.VERCEL) {
    throw new Error("Chưa cấu hình DATABASE_URL trên Vercel (Settings → Environment Variables).");
  }
  if (url) {
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const { default: postgres } = await import("postgres");
    // Serverless (Vercel): 1 kết nối mỗi instance để không vượt giới hạn kết nối của gói Postgres miễn phí.
    // prepare: false để chạy được qua connection pooler (Supabase/Neon).
    return drizzle(postgres(url, { prepare: false, max: 1 }), { schema });
  }

  const path = await import("node:path");
  const fs = await import("node:fs");
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const dir = process.env.PGLITE_DIR || path.join(process.cwd(), ".data", "pglite");
  fs.mkdirSync(path.dirname(dir), { recursive: true });
  const db = drizzle(new PGlite(dir), { schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return db as unknown as DB;
}

export function getDb(): Promise<DB> {
  if (!g.__footballDb) {
    g.__footballDb = connect().then(async (db) => {
      await seed(db);
      return db;
    });
    g.__footballDb.catch(() => {
      g.__footballDb = undefined;
    });
  }
  return g.__footballDb;
}

export { schema };
