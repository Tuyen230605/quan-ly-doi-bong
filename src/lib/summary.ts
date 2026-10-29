import { and, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { Match, Tx } from "./data";
import { TX_TYPES, type Fund } from "./money";

export type Att = typeof schema.attendances.$inferSelect;

export type PlayerStats = {
  scheduled: number; // số buổi có vote mà người đó thuộc danh sách được vote
  attendedScheduled: number;
  attended: number; // mọi buổi có đá
  rested: number; // nghỉ có báo / không vote không đến
  noshow: number; // vote đi (hoặc mặc định đi) mà không đến
  novoteCame: number; // không vote mà vẫn đến
  rate: number | null;
  matchFees: number;
  paidBall: number;
  fined: number;
  fineCount: number;
  paidPenalty: number;
};

export const emptyStats = (): PlayerStats => ({
  scheduled: 0,
  attendedScheduled: 0,
  attended: 0,
  rested: 0,
  noshow: 0,
  novoteCame: 0,
  rate: null,
  matchFees: 0,
  paidBall: 0,
  fined: 0,
  fineCount: 0,
  paidPenalty: 0,
});

/** Dữ liệu điểm danh của các buổi đã chốt (ảnh chụp lúc chốt). */
export async function getSettledAttendance(teamId: number) {
  const db = await getDb();
  const settled = await db
    .select()
    .from(schema.matches)
    .where(and(eq(schema.matches.teamId, teamId), eq(schema.matches.status, "settled")));
  const byId = new Map(settled.map((m) => [m.id, m]));
  const atts = settled.length
    ? await db.select().from(schema.attendances).where(inArray(schema.attendances.matchId, [...byId.keys()]))
    : [];
  return { matches: byId, atts };
}

export function inRange(date: string, from?: string, to?: string) {
  return (!from || date >= from) && (!to || date <= to);
}

export function playerStats(
  atts: Att[],
  matches: Map<number, Match>,
  txs: Tx[],
  from?: string,
  to?: string,
): Map<number, PlayerStats> {
  const out = new Map<number, PlayerStats>();
  const get = (id: number) => {
    if (!out.has(id)) out.set(id, emptyStats());
    return out.get(id)!;
  };
  for (const a of atts) {
    const m = matches.get(a.matchId);
    if (!m || !inRange(m.date, from, to)) continue;
    const s = get(a.playerId);
    if (a.present) s.attended++;
    if (a.inRoster) {
      s.scheduled++;
      if (a.present) s.attendedScheduled++;
    }
    if (a.result === "noshow") s.noshow++;
    if (a.result === "novote_came") s.novoteCame++;
    if (a.result === "excused" || a.result === "novote") s.rested++;
  }
  for (const t of txs) {
    if (t.playerId == null || !inRange(t.date, from, to)) continue;
    const s = get(t.playerId);
    if (t.type === "match_fee") s.matchFees += -t.playerAmount;
    if (t.type === "penalty") {
      s.fined += -t.playerAmount;
      s.fineCount++;
    }
    if (t.type === "deposit") {
      if (t.fund === "ball") s.paidBall += t.playerAmount;
      else s.paidPenalty += t.playerAmount;
    }
    if (t.type === "fine_pay" && t.fund === "penalty") s.paidPenalty += t.playerAmount;
  }
  for (const s of out.values()) s.rate = s.scheduled ? s.attendedScheduled / s.scheduled : null;
  return out;
}

export function balancesAt(txs: Tx[], to?: string) {
  const m = new Map<number, { ball: number; penalty: number }>();
  for (const t of txs) {
    if (t.playerId == null || !t.playerAmount || (to && t.date > to)) continue;
    const b = m.get(t.playerId) ?? { ball: 0, penalty: 0 };
    b[t.fund as Fund] += t.playerAmount;
    m.set(t.playerId, b);
  }
  return m;
}

function txLabel(t: Tx) {
  if (t.type === "deposit") return "Thành viên nộp";
  if (t.type === "income") return `Thu khác: ${t.category ?? ""}`;
  if (t.type === "match_cost" || t.type === "expense") return t.category ?? TX_TYPES[t.type];
  if (t.type.startsWith("transfer") || t.type === "fine_pay") return t.category ?? TX_TYPES[t.type];
  return TX_TYPES[t.type] ?? t.type;
}

function group(list: Tx[], value: (t: Tx) => number) {
  const m = new Map<string, number>();
  for (const t of list) m.set(txLabel(t), (m.get(txLabel(t)) ?? 0) + value(t));
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

export function fundSummary(txs: Tx[], fund: Fund, from: string, to: string) {
  const f = txs.filter((t) => t.fund === fund);
  const period = f.filter((t) => inRange(t.date, from, to));
  const opening = f.filter((t) => t.date < from).reduce((s, t) => s + t.cashAmount, 0);
  const closing = f.filter((t) => t.date <= to).reduce((s, t) => s + t.cashAmount, 0);
  const income = group(period.filter((t) => t.cashAmount > 0), (t) => t.cashAmount);
  const expense = group(period.filter((t) => t.cashAmount < 0), (t) => -t.cashAmount);
  const fined = period.filter((t) => t.type === "penalty").reduce((s, t) => s - t.playerAmount, 0);
  // Đã thu: thành viên nộp + phạt trừ thẳng vào quỹ cá nhân.
  const deposits = period
    .filter((t) => t.type === "deposit" || (t.type === "fine_pay" && t.cashAmount > 0))
    .reduce((s, t) => s + t.cashAmount, 0);
  let debtEnd = 0;
  for (const b of balancesAt(f, to).values()) debtEnd += Math.min(0, b[fund]);
  return {
    opening,
    closing,
    income,
    expense,
    totalIncome: income.reduce((s, [, v]) => s + v, 0),
    totalExpense: expense.reduce((s, [, v]) => s + v, 0),
    fined,
    deposits,
    debtEnd: -debtEnd,
  };
}
