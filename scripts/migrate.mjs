// Chạy trước `next build`: tạo/cập nhật bảng trên Postgres thật (Neon, Supabase...).
// Khi chạy trên máy không có DATABASE_URL thì bỏ qua, app tự dùng PGlite.
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) {
  if (process.env.VERCEL) {
    console.error("[migrate] Chưa cấu hình DATABASE_URL trên Vercel. Tạo database (Neon/Supabase) rồi deploy lại.");
    process.exit(1);
  }
  console.log("[migrate] Không có DATABASE_URL, bỏ qua.");
  process.exit(0);
}

const client = postgres(url, { max: 1, prepare: false, onnotice: () => {} });
await migrate(drizzle(client), { migrationsFolder: "drizzle" });
await client.end();
console.log("[migrate] Đã cập nhật cơ sở dữ liệu.");
