"use server";

import { and, eq } from "drizzle-orm";
import { getDb, schema, type DB } from "@/db";
import { audit, fail, int, optStr, run, str, type ActionState } from "@/lib/action";
import { teamAdmin } from "@/lib/team";

const { players, schedules, schedulePlayers } = schema;

async function addToActiveSchedules(db: DB, teamId: number, playerIds: number[]) {
  if (!playerIds.length) return;
  const active = await db
    .select({ id: schedules.id })
    .from(schedules)
    .where(and(eq(schedules.teamId, teamId), eq(schedules.status, "active")));
  const rows = active.flatMap((s) => playerIds.map((playerId) => ({ scheduleId: s.id, playerId })));
  if (rows.length) await db.insert(schedulePlayers).values(rows).onConflictDoNothing();
}

export async function savePlayer(_: ActionState, fd: FormData) {
  return run(async () => {
    const { user, team } = await teamAdmin(fd);
    const db = await getDb();
    const id = int(fd, "id");
    const hostPlayerId = int(fd, "hostPlayerId");
    const values = {
      fullName: str(fd, "fullName"),
      nickname: optStr(fd, "nickname"),
      phone: optStr(fd, "phone"),
      jerseyNo: int(fd, "jerseyNo"),
      position: optStr(fd, "position"),
      type: str(fd, "type") === "guest" ? "guest" : "member",
      status: ["active", "paused", "left"].includes(str(fd, "status")) ? str(fd, "status") : "active",
      hostPlayerId: hostPlayerId && hostPlayerId !== id ? hostPlayerId : null,
      note: optStr(fd, "note"),
    };
    if (!values.fullName) fail("Nhập họ tên.");
    if (values.nickname) {
      const same = (
        await db
          .select()
          .from(players)
          .where(and(eq(players.teamId, team.id), eq(players.nickname, values.nickname)))
      ).filter((p) => p.id !== id && p.status === "active");
      if (same.length) fail(`Tên gọi "${values.nickname}" đã có người dùng.`);
    }
    if (id) {
      await db
        .update(players)
        .set(values)
        .where(and(eq(players.id, id), eq(players.teamId, team.id)));
      await audit(team.id, { admin: user }, "Sửa cầu thủ", values.fullName);
      return "Đã lưu";
    }
    const [p] = await db
      .insert(players)
      .values({ ...values, teamId: team.id })
      .returning();
    if (p.type === "member") await addToActiveSchedules(db, team.id, [p.id]);
    await audit(team.id, { admin: user }, "Thêm cầu thủ", values.fullName);
    return `Đã thêm ${values.fullName}`;
  });
}

/** Dán danh sách tên, mỗi dòng 1 người. */
export async function bulkAddPlayers(_: ActionState, fd: FormData) {
  return run(async () => {
    const { user, team } = await teamAdmin(fd);
    const names = str(fd, "names")
      .split("\n")
      .map((s) => s.replace(/^[\s\d.)\-•*]+/, "").trim())
      .filter(Boolean);
    if (!names.length) fail("Dán danh sách tên, mỗi dòng 1 người.");
    const db = await getDb();
    const type = str(fd, "type") === "guest" ? "guest" : "member";
    const created = await db
      .insert(players)
      .values(names.map((fullName) => ({ teamId: team.id, fullName, type })))
      .returning({ id: players.id });
    if (type === "member")
      await addToActiveSchedules(
        db,
        team.id,
        created.map((c) => c.id),
      );
    await audit(team.id, { admin: user }, "Thêm nhanh cầu thủ", names.join(", "));
    return `Đã thêm ${names.length} người`;
  });
}

export async function resetPin(_: ActionState, fd: FormData) {
  return run(async () => {
    const { user, team } = await teamAdmin(fd);
    const db = await getDb();
    const id = Number(str(fd, "id"));
    await db
      .update(players)
      .set({ pinHash: null })
      .where(and(eq(players.id, id), eq(players.teamId, team.id)));
    await audit(team.id, { admin: user }, "Đặt lại PIN", `Cầu thủ #${id}`);
    return "Đã xoá PIN. Lần vote tới người này sẽ đặt PIN mới.";
  });
}
