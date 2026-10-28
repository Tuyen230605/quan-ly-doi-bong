"use server";

import { and, eq, gte, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, schema } from "@/db";
import { audit, fail, int, run, str, type ActionState } from "@/lib/action";
import type { Team } from "@/lib/auth";
import { ensureScheduleMatches, type Schedule } from "@/lib/data";
import { parseMoney } from "@/lib/money";
import { teamAdmin } from "@/lib/team";
import { todayVN, weekDeadline, weekdayOf } from "@/lib/time";

const { schedules, schedulePlayers, matches, players, venues } = schema;

async function readSchedule(fd: FormData, team: Team) {
  const weekdays = fd
    .getAll("weekdays")
    .map(Number)
    .filter((n) => n >= 1 && n <= 7);
  const v = {
    name: str(fd, "name"),
    weekdays,
    startTime: str(fd, "startTime"),
    endTime: str(fd, "endTime") || null,
    venueId: int(fd, "venueId"),
    costField: parseMoney(fd.get("costField")),
    costWater: parseMoney(fd.get("costWater")),
    costReferee: parseMoney(fd.get("costReferee")),
    costOther: parseMoney(fd.get("costOther")),
    startDate: str(fd, "startDate") || todayVN(),
    endDate: str(fd, "endDate") || null,
    voteMode: str(fd, "voteMode") === "going" ? "going" : "absent",
    deadlineWeekday: int(fd, "deadlineWeekday") ?? 7,
    deadlineTime: str(fd, "deadlineTime") || "23:59",
  };
  if (!v.name) fail("Nhập tên lịch, VD “Tối thứ 4”.");
  if (!v.weekdays.length) fail("Chọn ít nhất 1 thứ trong tuần.");
  if (!/^\d{2}:\d{2}$/.test(v.startTime)) fail("Nhập giờ bắt đầu.");
  if (v.endDate && v.endDate < v.startDate) fail("Ngày kết thúc phải sau ngày bắt đầu.");
  const db = await getDb();
  const newVenue = str(fd, "newVenue");
  if (newVenue) {
    const [venue] = await db.insert(venues).values({ teamId: team.id, name: newVenue, fieldCost: v.costField }).returning();
    v.venueId = venue.id;
  } else if (v.venueId) {
    const [venue] = await db.select().from(venues).where(and(eq(venues.id, v.venueId), eq(venues.teamId, team.id)));
    if (!venue) v.venueId = null;
  }
  return v;
}

async function loadSchedule(id: number, team: Team) {
  const db = await getDb();
  const [s] = await db
    .select()
    .from(schedules)
    .where(and(eq(schedules.id, id), eq(schedules.teamId, team.id)));
  if (!s) fail("Không tìm thấy lịch.");
  return s;
}

export async function createSchedule(_: ActionState, fd: FormData) {
  return run(async () => {
    const { user, team } = await teamAdmin(fd);
    const db = await getDb();
    const v = await readSchedule(fd, team);
    const [s] = await db
      .insert(schedules)
      .values({ ...v, teamId: team.id })
      .returning();
    const members = await db
      .select({ id: players.id })
      .from(players)
      .where(and(eq(players.teamId, team.id), eq(players.type, "member"), eq(players.status, "active")));
    if (members.length) {
      await db.insert(schedulePlayers).values(members.map((m) => ({ scheduleId: s.id, playerId: m.id })));
    }
    await ensureScheduleMatches(team.id);
    await audit(team.id, { admin: user }, "Tạo lịch cố định", v.name);
    redirect(`/doi/${team.slug}/lich/co-dinh/${s.id}`);
  });
}

/** Áp thay đổi của lịch cho các buổi tương lai chưa chốt; phiếu vote đã khoá thì giữ hạn cũ. */
async function propagate(s: Schedule, reason: string) {
  const db = await getDb();
  const future = await db
    .select()
    .from(matches)
    .where(and(eq(matches.scheduleId, s.id), eq(matches.status, "upcoming"), gte(matches.date, todayVN())));
  const now = new Date();
  for (const m of future) {
    const outside =
      !s.weekdays.includes(weekdayOf(m.date)) || m.date < s.startDate || (s.endDate != null && m.date > s.endDate);
    if (outside) {
      await db.update(matches).set({ status: "cancelled", cancelReason: reason }).where(eq(matches.id, m.id));
      continue;
    }
    const locked = m.voteDeadline != null && m.voteDeadline <= now;
    await db
      .update(matches)
      .set({
        startTime: s.startTime,
        endTime: s.endTime,
        venueId: s.venueId,
        costField: s.costField,
        costWater: s.costWater,
        costReferee: s.costReferee,
        costOther: s.costOther,
        ...(locked ? {} : { voteMode: s.voteMode, voteDeadline: weekDeadline(s, m.date) }),
      })
      .where(eq(matches.id, m.id));
  }
}

export async function updateSchedule(_: ActionState, fd: FormData) {
  return run(async () => {
    const { user, team } = await teamAdmin(fd);
    const db = await getDb();
    const old = await loadSchedule(Number(str(fd, "id")), team);
    const [s] = await db
      .update(schedules)
      .set(await readSchedule(fd, team))
      .where(eq(schedules.id, old.id))
      .returning();
    await propagate(s, "Đổi lịch cố định");
    await ensureScheduleMatches(team.id);
    await audit(team.id, { admin: user }, "Sửa lịch cố định", s.name);
    return "Đã lưu. Các buổi chưa chốt đã được cập nhật.";
  });
}

export async function saveRoster(_: ActionState, fd: FormData) {
  return run(async () => {
    const { user, team } = await teamAdmin(fd);
    const db = await getDb();
    const s = await loadSchedule(Number(str(fd, "id")), team);
    const wanted = [...new Set(fd.getAll("playerIds").map(Number))];
    const ids = wanted.length
      ? (
          await db
            .select({ id: players.id })
            .from(players)
            .where(and(eq(players.teamId, team.id), inArray(players.id, wanted)))
        ).map((p) => p.id)
      : [];
    await db.delete(schedulePlayers).where(eq(schedulePlayers.scheduleId, s.id));
    if (ids.length) await db.insert(schedulePlayers).values(ids.map((playerId) => ({ scheduleId: s.id, playerId })));
    await audit(team.id, { admin: user }, "Sửa danh sách thành viên của lịch", `${s.name}: ${ids.length} người`);
    return `Đã lưu ${ids.length} thành viên`;
  });
}

export async function setScheduleStatus(_: ActionState, fd: FormData) {
  return run(async () => {
    const { user, team } = await teamAdmin(fd);
    const db = await getDb();
    const s = await loadSchedule(Number(str(fd, "id")), team);
    const status = str(fd, "status");
    if (!["active", "paused", "ended"].includes(status)) fail("Trạng thái không hợp lệ.");
    await db.update(schedules).set({ status }).where(eq(schedules.id, s.id));
    const future = and(eq(matches.scheduleId, s.id), gte(matches.date, todayVN()));
    if (status === "active") {
      await db
        .update(matches)
        .set({ status: "upcoming", cancelReason: null })
        .where(and(future, eq(matches.status, "cancelled"), eq(matches.cancelReason, "Tạm dừng lịch")));
      await ensureScheduleMatches(team.id);
    } else {
      await db
        .update(matches)
        .set({ status: "cancelled", cancelReason: status === "paused" ? "Tạm dừng lịch" : "Kết thúc lịch" })
        .where(and(future, eq(matches.status, "upcoming")));
    }
    const label = { active: "Tiếp tục", paused: "Tạm dừng", ended: "Kết thúc" }[status];
    await audit(team.id, { admin: user }, `${label} lịch cố định`, s.name);
    return `Đã ${label?.toLowerCase()} lịch`;
  });
}
