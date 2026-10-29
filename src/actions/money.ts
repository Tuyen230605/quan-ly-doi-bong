"use server";

import { and, eq, inArray, or } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { audit, fail, int, optStr, run, str, type ActionState } from "@/lib/action";
import { getActiveTx, paidByTx } from "@/lib/data";
import { FUND_NAMES, fmtMoney, parseMoney, type Fund } from "@/lib/money";
import { teamAdmin } from "@/lib/team";
import { fmtDM, todayVN } from "@/lib/time";

const { transactions, matches, penaltyTypes, players, attendances } = schema;

function fundOf(fd: FormData): Fund {
  return str(fd, "fund") === "penalty" ? "penalty" : "ball";
}

function dateOf(fd: FormData) {
  const d = str(fd, "date");
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : todayVN();
}

function method(fd: FormData) {
  return str(fd, "method") === "cash" ? "cash" : "transfer";
}

function positive(fd: FormData, key = "amount") {
  const n = parseMoney(fd.get(key));
  if (n <= 0) fail("Nhập số tiền lớn hơn 0.");
  return n;
}

/** Chỉ giữ những cầu thủ thuộc đội. */
async function teamPlayerIds(teamId: number, ids: number[]) {
  if (!ids.length) return [];
  const db = await getDb();
  const rows = await db
    .select({ id: players.id })
    .from(players)
    .where(and(eq(players.teamId, teamId), inArray(players.id, ids)));
  return rows.map((r) => r.id);
}

/** Nộp tiền vào quỹ, cho 1 hoặc nhiều người cùng lúc (nộp gộp). */
export async function addDeposit(_: ActionState, fd: FormData) {
  return run(async () => {
    const { user, team } = await teamAdmin(fd);
    const db = await getDb();
    const fund = fundOf(fd);
    const amount = positive(fd);
    const ids = await teamPlayerIds(team.id, [...new Set(fd.getAll("playerIds").map(Number).filter(Boolean))]);
    if (!ids.length) fail("Chọn người nộp.");
    await db.insert(transactions).values(
      ids.map((playerId) => ({
        teamId: team.id,
        fund,
        type: "deposit",
        cashAmount: amount,
        playerAmount: amount,
        playerId,
        method: method(fd),
        date: dateOf(fd),
        note: optStr(fd, "note"),
        createdBy: user.id,
      })),
    );
    await audit(team.id, { admin: user }, `Ghi nộp ${FUND_NAMES[fund]}`, `${ids.length} người × ${fmtMoney(amount)}`);
    return `Đã ghi ${ids.length} khoản nộp`;
  });
}

export async function addExpense(_: ActionState, fd: FormData) {
  return run(async () => {
    const { user, team } = await teamAdmin(fd);
    const db = await getDb();
    const fund = fundOf(fd);
    const amount = positive(fd);
    const category = str(fd, "category") || "Khác";
    await db.insert(transactions).values({
      teamId: team.id,
      fund,
      type: "expense",
      cashAmount: -amount,
      category,
      method: method(fd),
      date: dateOf(fd),
      note: optStr(fd, "note"),
      createdBy: user.id,
    });
    await audit(team.id, { admin: user }, `Ghi chi ${FUND_NAMES[fund]}`, `${category}: ${fmtMoney(amount)}`);
    return "Đã ghi khoản chi";
  });
}

/** Thu khác: admin tự nhập nguồn (tài trợ, bán đồ cũ...) và số tiền. */
export async function addIncome(_: ActionState, fd: FormData) {
  return run(async () => {
    const { user, team } = await teamAdmin(fd);
    const db = await getDb();
    const fund = fundOf(fd);
    const amount = positive(fd);
    const source = str(fd, "source");
    if (!source) fail("Nhập nguồn thu.");
    await db.insert(transactions).values({
      teamId: team.id,
      fund,
      type: "income",
      cashAmount: amount,
      category: source,
      method: method(fd),
      date: dateOf(fd),
      note: optStr(fd, "note"),
      createdBy: user.id,
    });
    await audit(team.id, { admin: user }, `Ghi thu ${FUND_NAMES[fund]}`, `${source}: ${fmtMoney(amount)}`);
    return "Đã ghi khoản thu";
  });
}

export async function transferFunds(_: ActionState, fd: FormData) {
  return run(async () => {
    const { user, team } = await teamAdmin(fd);
    const db = await getDb();
    const from = fundOf(fd);
    const to: Fund = from === "ball" ? "penalty" : "ball";
    const amount = positive(fd);
    const base = { teamId: team.id, date: dateOf(fd), note: optStr(fd, "note"), createdBy: user.id };
    await db.transaction(async (tx) => {
      const [out] = await tx
        .insert(transactions)
        .values({ ...base, fund: from, type: "transfer_out", cashAmount: -amount, category: `Chuyển sang ${FUND_NAMES[to]}` })
        .returning();
      const [inn] = await tx
        .insert(transactions)
        .values({ ...base, fund: to, type: "transfer_in", cashAmount: amount, category: `Từ ${FUND_NAMES[from]}`, refId: out.id })
        .returning();
      await tx.update(transactions).set({ refId: inn.id }).where(eq(transactions.id, out.id));
    });
    await audit(team.id, { admin: user }, "Chuyển quỹ", `${FUND_NAMES[from]} → ${FUND_NAMES[to]}: ${fmtMoney(amount)}`);
    return "Đã chuyển quỹ";
  });
}

/** Điều chỉnh / số dư ban đầu: sửa tiền quỹ thực có và/hoặc số dư của 1 cầu thủ. */
export async function adjust(_: ActionState, fd: FormData) {
  return run(async () => {
    const { user, team } = await teamAdmin(fd);
    const db = await getDb();
    const fund = fundOf(fd);
    const cashAmount = parseMoney(fd.get("cashAmount"));
    const playerAmount = parseMoney(fd.get("playerAmount"));
    const [playerId] = await teamPlayerIds(team.id, [int(fd, "playerId") ?? 0]);
    const note = str(fd, "note");
    if (!note) fail("Ghi lý do điều chỉnh.");
    if (!cashAmount && !playerAmount) fail("Nhập ít nhất 1 số tiền.");
    if (playerAmount && !playerId) fail("Chọn cầu thủ khi điều chỉnh số dư cầu thủ.");
    await db.insert(transactions).values({
      teamId: team.id,
      fund,
      type: "adjust",
      cashAmount,
      playerAmount: playerId ? playerAmount : 0,
      playerId: playerId ?? null,
      category: "Điều chỉnh",
      date: dateOf(fd),
      note,
      createdBy: user.id,
    });
    await audit(team.id, { admin: user }, `Điều chỉnh ${FUND_NAMES[fund]}`, `${note}: quỹ ${fmtMoney(cashAmount)}, cầu thủ ${fmtMoney(playerAmount)}`);
    return "Đã điều chỉnh";
  });
}

export type PenaltyItem = { playerId: number; typeId: number; amount: number; note?: string };

/** Ghi danh sách phạt (của 1 buổi hoặc phạt lẻ). Tiền phạt chỉ vào quỹ phạt. */
export async function addPenalties(
  teamId: number,
  matchId: number | null,
  items: PenaltyItem[],
  skipped: { playerId: number; name: string; note: string }[] = [],
): Promise<ActionState> {
  return run(async () => {
    const { user, team } = await teamAdmin(teamId);
    const db = await getDb();
    const allowed = new Set(await teamPlayerIds(team.id, [...items, ...skipped].map((i) => i.playerId)));
    const valid = items.filter((i) => allowed.has(i.playerId) && i.amount > 0);
    const notes = skipped.filter((s) => allowed.has(s.playerId) && s.note.trim());
    if (!valid.length && !(matchId && notes.length)) fail("Chưa có ai trong danh sách phạt.");
    let date = todayVN();
    let label = "phạt lẻ";
    if (matchId) {
      const [m] = await db
        .select()
        .from(matches)
        .where(and(eq(matches.id, matchId), eq(matches.teamId, team.id)));
      if (!m) fail("Không tìm thấy buổi đá.");
      date = m.date;
      label = `buổi ${fmtDM(m.date)}`;
    }
    // Không phạt nhưng có ghi chú (VD không vote mà đi lần đầu): lưu vào điểm danh của buổi.
    if (matchId)
      for (const n of notes)
        await db
          .update(attendances)
          .set({ note: n.note.trim() })
          .where(and(eq(attendances.matchId, matchId), eq(attendances.playerId, n.playerId)));
    if (!valid.length) return `Đã lưu ${notes.length} ghi chú`;
    const types = new Map((await db.select().from(penaltyTypes).where(eq(penaltyTypes.teamId, team.id))).map((t) => [t.id, t]));
    await db.insert(transactions).values(
      valid.map((i) => {
        const typeName = types.get(i.typeId)?.name ?? "Phạt";
        return {
          teamId: team.id,
          fund: "penalty",
          type: "penalty",
          playerAmount: -Math.round(i.amount),
          playerId: i.playerId,
          matchId,
          penaltyTypeId: types.has(i.typeId) ? i.typeId : null,
          category: typeName,
          note: i.note?.trim() || `${typeName} ${label}`,
          date,
          createdBy: user.id,
        };
      }),
    );
    const total = valid.reduce((s, i) => s + i.amount, 0);
    await audit(team.id, { admin: user }, "Phạt", `${label}: ${valid.length} khoản, tổng ${fmtMoney(total)}`);
    if (skipped.length)
      await audit(team.id, { admin: user }, "Không phạt", `${label}: ${skipped.map((s) => `${s.name}${s.note ? ` (${s.note})` : ""}`).join(", ")}`);
    return `Đã phạt ${valid.length} khoản, cộng ${fmtMoney(total)} vào quỹ phạt`;
  });
}

/** Tích "đã nộp" cho 1 khoản phạt. */
export async function markPenaltyPaid(_: ActionState, fd: FormData) {
  return run(async () => {
    const { user, team } = await teamAdmin(fd);
    const db = await getDb();
    const id = Number(str(fd, "txId"));
    const txs = await getActiveTx(team.id);
    const debt = txs.find((t) => t.id === id && t.type === "penalty");
    if (!debt || debt.playerId == null) fail("Không tìm thấy khoản phạt.");
    const remaining = -debt.playerAmount - (paidByTx(txs, "penalty").get(id) ?? 0);
    if (remaining <= 0) fail("Khoản phạt này đã nộp đủ.");
    await db.insert(transactions).values({
      teamId: team.id,
      fund: "penalty",
      type: "deposit",
      cashAmount: remaining,
      playerAmount: remaining,
      playerId: debt.playerId,
      refId: id,
      method: method(fd),
      date: todayVN(),
      note: `Nộp phạt: ${debt.category ?? ""}`.trim(),
      createdBy: user.id,
    });
    await audit(team.id, { admin: user }, "Ghi nộp phạt", `Cầu thủ #${debt.playerId}: ${fmtMoney(remaining)}`);
    return `Đã ghi nộp ${fmtMoney(remaining)}`;
  });
}

const MATCH_LOCKED = ["match_fee", "match_cost", "advance"];

export async function cancelTx(_: ActionState, fd: FormData) {
  return run(async () => {
    const { user, team } = await teamAdmin(fd);
    const db = await getDb();
    const id = Number(str(fd, "id"));
    const reason = str(fd, "reason") || "Huỷ";
    const [t] = await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.teamId, team.id)));
    if (!t || t.status !== "active") fail("Giao dịch không tồn tại hoặc đã huỷ.");
    if (MATCH_LOCKED.includes(t.type)) fail("Khoản này sinh ra khi chốt trận. Hãy mở lại trận để sửa.");
    const ids = t.type.startsWith("transfer") && t.refId ? [t.id, t.refId] : [t.id];
    await db
      .update(transactions)
      .set({ status: "cancelled", cancelReason: reason })
      .where(and(eq(transactions.teamId, team.id), or(...ids.map((i) => eq(transactions.id, i)))));
    await audit(team.id, { admin: user }, "Huỷ giao dịch", `#${t.id} ${t.category ?? t.type} ${fmtMoney(t.cashAmount || t.playerAmount)}: ${reason}`);
    return "Đã huỷ giao dịch";
  });
}
