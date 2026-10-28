"use server";

import { and, desc, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, schema, type DB } from "@/db";
import { audit, fail, int, optStr, run, str, type ActionState } from "@/lib/action";
import { getMe, getUser, isTeamAdmin, type Team } from "@/lib/auth";
import { getActiveTx, getMatchRoster, getPlayers, indexById, paidByTx, type Match } from "@/lib/data";
import { computeFees, fmtMoney, parseMoney, type SplitMethod } from "@/lib/money";
import { teamAdmin } from "@/lib/team";
import { pname } from "@/lib/text";
import { fmtDM, todayVN } from "@/lib/time";

const { matches, attendances, votes, transactions, players, venues, schedulePlayers } = schema;

async function loadMatch(db: DB, id: number, teamId?: number): Promise<Match> {
  const [m] = await db.select().from(matches).where(eq(matches.id, id));
  if (!m || (teamId != null && m.teamId !== teamId)) fail("Không tìm thấy buổi đá.");
  return m;
}

async function readMatchForm(db: DB, fd: FormData, team: Team) {
  const v = {
    date: str(fd, "date"),
    startTime: str(fd, "startTime"),
    endTime: optStr(fd, "endTime"),
    venueId: int(fd, "venueId"),
    kind: ["internal", "friendly", "tournament"].includes(str(fd, "kind")) ? str(fd, "kind") : "internal",
    opponent: optStr(fd, "opponent"),
    note: optStr(fd, "note"),
    costField: parseMoney(fd.get("costField")),
    costWater: parseMoney(fd.get("costWater")),
    costReferee: parseMoney(fd.get("costReferee")),
    costOther: parseMoney(fd.get("costOther")),
  };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v.date)) fail("Chọn ngày đá.");
  if (!/^\d{2}:\d{2}$/.test(v.startTime)) fail("Nhập giờ bắt đầu.");
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

export async function createMatch(_: ActionState, fd: FormData) {
  return run(async () => {
    const { user, team } = await teamAdmin(fd);
    const db = await getDb();
    const v = await readMatchForm(db, fd, team);
    const [m] = await db
      .insert(matches)
      .values({ ...v, teamId: team.id })
      .returning();
    await audit(team.id, { admin: user }, "Tạo lịch lẻ", `${fmtDM(v.date)} ${v.startTime}`);
    redirect(`/doi/${team.slug}/tran/${m.id}`);
  });
}

export async function updateMatch(_: ActionState, fd: FormData) {
  return run(async () => {
    const { user, team } = await teamAdmin(fd);
    const db = await getDb();
    const m = await loadMatch(db, Number(str(fd, "id")), team.id);
    if (m.status !== "upcoming") fail("Buổi đã chốt hoặc đã huỷ. Mở lại trước khi sửa.");
    const v = await readMatchForm(db, fd, team);
    await db.update(matches).set(v).where(eq(matches.id, m.id));
    await audit(team.id, { admin: user }, "Sửa buổi đá", `${fmtDM(v.date)} ${v.startTime}`);
  });
}

export async function cancelMatch(_: ActionState, fd: FormData) {
  return run(async () => {
    const { user, team } = await teamAdmin(fd);
    const db = await getDb();
    const m = await loadMatch(db, Number(str(fd, "id")), team.id);
    if (m.status === "settled") fail("Buổi đã chốt tiền. Mở lại trận trước khi huỷ.");
    const reason = str(fd, "reason") || "Không ghi lý do";
    await db.update(matches).set({ status: "cancelled", cancelReason: reason }).where(eq(matches.id, m.id));
    await audit(team.id, { admin: user }, "Huỷ buổi đá", `${fmtDM(m.date)}: ${reason}`);
    return "Đã huỷ buổi";
  });
}

export async function restoreMatch(_: ActionState, fd: FormData) {
  return run(async () => {
    const { user, team } = await teamAdmin(fd);
    const db = await getDb();
    const m = await loadMatch(db, Number(str(fd, "id")), team.id);
    await db.update(matches).set({ status: "upcoming", cancelReason: null }).where(eq(matches.id, m.id));
    await audit(team.id, { admin: user }, "Khôi phục buổi đá", fmtDM(m.date));
    return "Đã khôi phục";
  });
}

export async function castVote(_: ActionState, fd: FormData) {
  return run(async () => {
    const db = await getDb();
    const m = await loadMatch(db, Number(str(fd, "matchId")));
    const user = await getUser();
    const admin = user && (await isTeamAdmin(m.teamId, user.id)) ? user : null;
    const me = await getMe(m.teamId);
    const onBehalf = !!admin && !!int(fd, "playerId");
    const playerId = onBehalf ? int(fd, "playerId")! : me?.id;
    if (!playerId) fail("Hãy chọn tên của bạn trước khi vote.");
    const choice = str(fd, "choice") === "absent" ? "absent" : "going";
    const reason = optStr(fd, "reason");
    if (m.status !== "upcoming" || !m.scheduleId) fail("Buổi này không còn nhận vote.");
    const [p] = await db
      .select()
      .from(players)
      .where(and(eq(players.id, playerId), eq(players.teamId, m.teamId)));
    if (!p) fail("Không tìm thấy cầu thủ.");
    if (!admin) {
      if (m.voteDeadline && m.voteDeadline <= new Date()) fail("Đã quá hạn vote. Nhắn admin nếu cần đổi.");
      const [inRoster] = await db
        .select()
        .from(schedulePlayers)
        .where(and(eq(schedulePlayers.scheduleId, m.scheduleId), eq(schedulePlayers.playerId, playerId)));
      if (!inRoster) fail("Bạn không có trong danh sách của lịch này. Nhắn admin để được thêm.");
    }
    const row = { choice, reason, updatedAt: new Date(), updatedByAdminId: onBehalf ? admin!.id : null };
    await db
      .insert(votes)
      .values({ matchId: m.id, playerId, ...row })
      .onConflictDoUpdate({ target: [votes.matchId, votes.playerId], set: row });
    const what = `${choice === "going" ? "ĐI" : "NGHỈ"} buổi ${fmtDM(m.date)}${reason ? ` (${reason})` : ""}`;
    await audit(m.teamId, onBehalf ? { admin } : { player: me }, onBehalf ? `Vote hộ ${pname(p)}` : "Vote", what);
    return choice === "going" ? "Đã vote ĐI" : "Đã vote NGHỈ";
  });
}

export type AttendanceItem = {
  playerId: number | null;
  newGuestName?: string;
  present: boolean;
  chargeToPlayerId: number | null;
  override?: number | null;
};

/** Lưu điểm danh. Người trong lịch mà giống mặc định (theo vote) thì không lưu, để vẫn đi theo vote. */
async function writeAttendance(db: DB, match: Match, items: AttendanceItem[]) {
  const ps = indexById(await getPlayers(match.teamId));
  const rows = new Map((await getMatchRoster(match, ps)).map((r) => [r.player.id, r]));
  const overrides = new Map<number, number>();
  for (const item of items) {
    const chargeTo = item.chargeToPlayerId && ps.has(item.chargeToPlayerId) ? item.chargeToPlayerId : null;
    let playerId = item.playerId;
    if (!playerId) {
      const name = item.newGuestName?.trim();
      if (!name || !item.present) continue;
      const [g] = await db
        .insert(players)
        .values({ teamId: match.teamId, fullName: name, type: "guest", hostPlayerId: chargeTo })
        .returning();
      playerId = g.id;
    } else if (!ps.has(playerId)) {
      continue;
    }
    if (item.override != null && item.present) overrides.set(playerId, item.override);
    const row = rows.get(playerId);
    const isDefault = row?.inRoster && item.present === (row.going === true) && !chargeTo;
    const where = and(eq(attendances.matchId, match.id), eq(attendances.playerId, playerId));
    if (isDefault || (!row?.inRoster && !item.present)) {
      await db.delete(attendances).where(where);
      continue;
    }
    const set = { present: item.present, chargeToPlayerId: chargeTo };
    await db
      .insert(attendances)
      .values({ matchId: match.id, playerId, ...set })
      .onConflictDoUpdate({ target: [attendances.matchId, attendances.playerId], set });
  }
  return overrides;
}

export async function saveAttendance(matchId: number, items: AttendanceItem[]): Promise<ActionState> {
  return run(async () => {
    const db = await getDb();
    const m = await loadMatch(db, matchId);
    const { user } = await teamAdmin(m.teamId);
    if (m.status !== "upcoming") fail("Buổi đã chốt. Mở lại trận để sửa điểm danh.");
    await writeAttendance(db, m, items);
    await audit(m.teamId, { admin: user }, "Lưu điểm danh", `Buổi ${fmtDM(m.date)}: ${items.filter((i) => i.present).length} người có đá`);
    return "Đã lưu điểm danh";
  });
}

export type SettleInput = {
  matchId: number;
  attendance: AttendanceItem[];
  costs: { field: number; water: number; referee: number; other: number };
  method: SplitMethod;
  step: number;
  fixedFee: number;
  guestFee: number;
  payerPlayerId: number | null;
};

export async function settleMatch(input: SettleInput): Promise<ActionState> {
  return run(async () => {
    const db = await getDb();
    const m = await loadMatch(db, input.matchId);
    const { user } = await teamAdmin(m.teamId);
    if (m.status !== "upcoming") fail("Buổi này đã chốt hoặc đã huỷ.");
    const overrides = await writeAttendance(db, m, input.attendance);
    const ps = indexById(await getPlayers(m.teamId));
    const rows = await getMatchRoster(m, ps);
    const present = rows.filter((r) => r.present);
    if (!present.length) fail("Chưa có ai “Có đá”.");
    const payerId = input.payerPlayerId && ps.has(input.payerPlayerId) ? input.payerPlayerId : null;

    const c = input.costs;
    const total = c.field + c.water + c.referee + c.other;
    const calc = computeFees({
      total,
      method: input.method,
      step: input.step,
      fixedFee: input.fixedFee,
      guestFee: input.guestFee,
      people: present.map((r) => ({
        playerId: r.player.id,
        isGuest: r.player.type === "guest",
        override: overrides.get(r.player.id) ?? null,
      })),
    });
    const dm = fmtDM(m.date);
    const base = { teamId: m.teamId, matchId: m.id, date: m.date, createdBy: user.id };
    const txRows: (typeof transactions.$inferInsert)[] = [];
    for (const r of present) {
      const fee = calc.fees.get(r.player.id) ?? 0;
      if (fee <= 0) continue;
      const payer = r.chargeToPlayerId ?? r.player.id;
      txRows.push({
        ...base,
        fund: "ball",
        type: "match_fee",
        playerAmount: -fee,
        playerId: payer,
        note: payer !== r.player.id ? `Tiền trận ${dm} (khách ${pname(r.player)})` : `Tiền trận ${dm}`,
      });
    }
    if (payerId) {
      if (total > 0)
        txRows.push({
          ...base,
          fund: "ball",
          type: "advance",
          playerAmount: total,
          playerId: payerId,
          category: "Tiền sân",
          note: `Trả hộ chi phí trận ${dm}`,
        });
    } else {
      const parts: [string, number][] = [
        ["Tiền sân", c.field],
        ["Nước", c.water],
        ["Trọng tài", c.referee],
        ["Khác", c.other],
      ];
      for (const [category, amount] of parts)
        if (amount > 0)
          txRows.push({ ...base, fund: "ball", type: "match_cost", cashAmount: -amount, category, note: `Chi phí trận ${dm}` });
    }

    await db.transaction(async (tx) => {
      await tx
        .update(matches)
        .set({
          costField: c.field,
          costWater: c.water,
          costReferee: c.referee,
          costOther: c.other,
          splitMethod: input.method,
          roundingStep: input.step,
          fixedFee: input.fixedFee,
          guestFee: input.guestFee,
          payerPlayerId: payerId,
          memberFee: calc.memberFee,
          status: "settled",
          settledAt: new Date(),
        })
        .where(eq(matches.id, m.id));
      await tx.delete(attendances).where(eq(attendances.matchId, m.id));
      await tx.insert(attendances).values(
        rows.map((r) => ({
          matchId: m.id,
          playerId: r.player.id,
          present: r.present,
          chargeToPlayerId: r.chargeToPlayerId,
          feeOverride: overrides.get(r.player.id) ?? null,
          inRoster: r.inRoster,
          voteChoice: r.voteChoice,
          result: r.result,
          fee: r.present ? (calc.fees.get(r.player.id) ?? 0) : null,
        })),
      );
      if (txRows.length) await tx.insert(transactions).values(txRows);
    });
    await audit(
      m.teamId,
      { admin: user },
      "Chốt tiền trận",
      `${dm}: ${present.length} người, chi phí ${fmtMoney(total)}, ${fmtMoney(calc.memberFee)}/người`,
    );
    return `Đã chốt: ${present.length} người, ${fmtMoney(calc.memberFee)}/người`;
  });
}

export async function reopenMatch(_: ActionState, fd: FormData) {
  return run(async () => {
    const { user, team } = await teamAdmin(fd);
    const db = await getDb();
    const m = await loadMatch(db, Number(str(fd, "id")), team.id);
    if (m.status !== "settled") fail("Buổi này chưa chốt.");
    await db.transaction(async (tx) => {
      await tx
        .update(transactions)
        .set({ status: "cancelled", cancelReason: "Mở lại trận" })
        .where(
          and(
            eq(transactions.matchId, m.id),
            eq(transactions.status, "active"),
            inArray(transactions.type, ["match_fee", "match_cost", "advance"]),
          ),
        );
      await tx.update(matches).set({ status: "upcoming", settledAt: null, memberFee: null }).where(eq(matches.id, m.id));
    });
    await audit(team.id, { admin: user }, "Mở lại trận", fmtDM(m.date));
    return "Đã mở lại. Sửa xong thì chốt lại.";
  });
}

/** Tích "Đã trả" cho tiền trận của 1 người: ghi khoản nộp đúng số còn thiếu của trận đó. */
export async function markPaid(_: ActionState, fd: FormData) {
  return run(async () => {
    const { user, team } = await teamAdmin(fd);
    const db = await getDb();
    const m = await loadMatch(db, Number(str(fd, "matchId")), team.id);
    const playerId = Number(str(fd, "playerId"));
    const txs = await getActiveTx(team.id);
    const paid = paidByTx(txs, "ball");
    const fees = txs.filter((t) => t.type === "match_fee" && t.matchId === m.id && t.playerId === playerId);
    const remaining = fees.reduce((s, t) => s + -t.playerAmount - (paid.get(t.id) ?? 0), 0);
    if (remaining <= 0) fail("Người này đã trả đủ tiền trận.");
    await db.insert(transactions).values({
      teamId: team.id,
      fund: "ball",
      type: "deposit",
      cashAmount: remaining,
      playerAmount: remaining,
      playerId,
      matchId: m.id,
      method: str(fd, "method") === "cash" ? "cash" : "transfer",
      date: todayVN(),
      note: `Trả tiền trận ${fmtDM(m.date)}`,
      createdBy: user.id,
    });
    await audit(team.id, { admin: user }, "Tích đã trả", `Cầu thủ #${playerId}, trận ${fmtDM(m.date)}: ${fmtMoney(remaining)}`);
    return `Đã ghi nhận ${fmtMoney(remaining)}`;
  });
}

export async function unmarkPaid(_: ActionState, fd: FormData) {
  return run(async () => {
    const { user, team } = await teamAdmin(fd);
    const db = await getDb();
    const matchId = Number(str(fd, "matchId"));
    const playerId = Number(str(fd, "playerId"));
    const [last] = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.teamId, team.id),
          eq(transactions.matchId, matchId),
          eq(transactions.playerId, playerId),
          eq(transactions.type, "deposit"),
          eq(transactions.status, "active"),
        ),
      )
      .orderBy(desc(transactions.id))
      .limit(1);
    if (!last) fail("Không có khoản nộp nào gắn với trận này để bỏ.");
    await db
      .update(transactions)
      .set({ status: "cancelled", cancelReason: "Bỏ tích đã trả" })
      .where(eq(transactions.id, last.id));
    await audit(team.id, { admin: user }, "Bỏ tích đã trả", `Cầu thủ #${playerId}, trận #${matchId}: ${fmtMoney(last.cashAmount)}`);
    return "Đã bỏ tích";
  });
}
