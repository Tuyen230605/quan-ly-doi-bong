import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { getDb, schema } from "@/db";
import type { Player, User } from "./auth";
import { pname } from "./text";

export type ActionState = { error?: string; ok?: string; at?: number } | null;

/** Chạy một thao tác ghi dữ liệu, trả lỗi về form thay vì làm sập trang. */
export async function run(fn: () => Promise<string | void>): Promise<ActionState> {
  try {
    const ok = await fn();
    return { ok: ok || "Đã lưu", at: Date.now() };
  } catch (e) {
    unstable_rethrow(e);
    if (!(e instanceof UserError)) console.error(e);
    return { error: e instanceof Error ? e.message : "Có lỗi xảy ra", at: Date.now() };
  } finally {
    revalidatePath("/", "layout");
  }
}

/** Lỗi do người dùng nhập sai: báo lên form, không ghi log như lỗi hệ thống. */
class UserError extends Error {}

export function fail(message: string): never {
  throw new UserError(message);
}

export async function audit(
  teamId: number,
  actor: { admin?: User | null; player?: Player | null },
  action: string,
  detail?: string,
) {
  const db = await getDb();
  const a = actor.admin;
  const p = actor.player;
  await db.insert(schema.auditLogs).values({
    teamId,
    actorType: a ? "admin" : "player",
    actorId: a ? a.id : (p?.id ?? null),
    actorName: a ? a.displayName : p ? pname(p) : "?",
    action,
    detail: detail ?? null,
  });
}

export function str(fd: FormData, key: string) {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export function optStr(fd: FormData, key: string) {
  return str(fd, key) || null;
}

export function int(fd: FormData, key: string) {
  const n = parseInt(str(fd, key), 10);
  return Number.isFinite(n) ? n : null;
}
