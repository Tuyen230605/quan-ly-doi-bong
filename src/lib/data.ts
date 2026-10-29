import { and, desc, eq, gte } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { Player } from "./auth";
import { resultOf, type Result, type VoteChoice } from "./labels";
import { allocatePayments, type Fund } from "./money";
import { pname } from "./text";
import { addDays, todayVN, weekDeadline, weekdayOf } from "./time";

const {
  players,
  transactions,
  matches,
  schedules,
  schedulePlayers,
  votes,
  attendances,
  venues,
  funds,
  penaltyTypes,
  paymentRequests,
} = schema;

export type Tx = typeof transactions.$inferSelect;
export type Match = typeof matches.$inferSelect;
export type Schedule = typeof schedules.$inferSelect;
export type Venue = typeof venues.$inferSelect;
export type FundRow = typeof funds.$inferSelect;
export type PenaltyType = typeof penaltyTypes.$inferSelect;
export type Vote = typeof votes.$inferSelect;
export type PaymentRequest = typeof paymentRequests.$inferSelect;
export type { Result, VoteChoice };

export function byName(a: Player, b: Player) {
  return pname(a).localeCompare(pname(b), "vi");
}

export async function getPlayers(teamId: number): Promise<Player[]> {
  const db = await getDb();
  return (await db.select().from(players).where(eq(players.teamId, teamId))).sort(byName);
}

export function indexById<T extends { id: number }>(rows: T[]) {
  return new Map(rows.map((r) => [r.id, r]));
}

export async function getVenues(teamId: number): Promise<Venue[]> {
  const db = await getDb();
  return (await db.select().from(venues).where(eq(venues.teamId, teamId))).sort((a, b) => a.name.localeCompare(b.name, "vi"));
}

export async function getFunds(teamId: number): Promise<Record<Fund, FundRow>> {
  const db = await getDb();
  const rows = await db.select().from(funds).where(eq(funds.teamId, teamId));
  return Object.fromEntries(rows.map((r) => [r.code, r])) as Record<Fund, FundRow>;
}

export async function getPenaltyTypes(teamId: number): Promise<PenaltyType[]> {
  const db = await getDb();
  return (await db.select().from(penaltyTypes).where(eq(penaltyTypes.teamId, teamId))).sort((a, b) => a.id - b.id);
}

export async function getPaymentRequests(teamId: number): Promise<PaymentRequest[]> {
  const db = await getDb();
  return db.select().from(paymentRequests).where(eq(paymentRequests.teamId, teamId)).orderBy(desc(paymentRequests.id));
}

export async function getActiveTx(teamId: number): Promise<Tx[]> {
  const db = await getDb();
  return db
    .select()
    .from(transactions)
    .where(and(eq(transactions.teamId, teamId), eq(transactions.status, "active")));
}

export type Bal = { ball: number; penalty: number };

export function playerBalances(txs: Tx[]) {
  const m = new Map<number, Bal>();
  for (const t of txs) {
    if (t.playerId == null || !t.playerAmount) continue;
    const b = m.get(t.playerId) ?? { ball: 0, penalty: 0 };
    b[t.fund as Fund] += t.playerAmount;
    m.set(t.playerId, b);
  }
  return m;
}

/** Quỹ cá nhân: tiền của 1 người còn trong quỹ đội (âm = đang nợ). Gộp quỹ bóng + nợ phạt cũ chưa trừ. */
export function personal(b: Bal | undefined) {
  return b ? b.ball + b.penalty : 0;
}

export function fundCash(txs: Tx[], fund: Fund) {
  return txs.reduce((s, t) => (t.fund === fund ? s + t.cashAmount : s), 0);
}

/** Số tiền đã trả cho từng khoản nợ (key = id giao dịch nợ), tính cho mọi cầu thủ trong một quỹ. */
export function paidByTx(txs: Tx[], fund: Fund) {
  const byPlayer = new Map<number, Tx[]>();
  for (const t of txs) {
    if (t.fund !== fund || t.playerId == null || !t.playerAmount) continue;
    byPlayer.set(t.playerId, [...(byPlayer.get(t.playerId) ?? []), t]);
  }
  const out = new Map<number, number>();
  for (const list of byPlayer.values()) {
    const paid = allocatePayments(
      list.map((t) => ({ id: t.id, amount: t.playerAmount, date: t.date, type: t.type, matchId: t.matchId, refId: t.refId })),
    );
    for (const [id, v] of paid) out.set(id, v);
  }
  return out;
}

export function matchFromSchedule(s: Schedule, date: string) {
  return {
    teamId: s.teamId,
    scheduleId: s.id,
    date,
    startTime: s.startTime,
    endTime: s.endTime,
    venueId: s.venueId,
    costField: s.costField,
    costWater: s.costWater,
    costReferee: s.costReferee,
    costOther: s.costOther,
    voteMode: s.voteMode,
    voteDeadline: weekDeadline(s, date),
  };
}

/** Sinh sẵn các buổi đá (và phiếu vote) của 4 tuần tới cho mọi lịch cố định đang chạy của đội. */
export async function ensureScheduleMatches(teamId: number) {
  const db = await getDb();
  const today = todayVN();
  const horizon = addDays(today, 27);
  const list = await db
    .select()
    .from(schedules)
    .where(and(eq(schedules.teamId, teamId), eq(schedules.status, "active")));
  for (const s of list) {
    const from = s.startDate > today ? s.startDate : today;
    const to = s.endDate && s.endDate < horizon ? s.endDate : horizon;
    const dates: string[] = [];
    for (let d = from; d <= to; d = addDays(d, 1)) if (s.weekdays.includes(weekdayOf(d))) dates.push(d);
    if (!dates.length) continue;
    const existing = await db
      .select({ date: matches.date })
      .from(matches)
      .where(and(eq(matches.scheduleId, s.id), gte(matches.date, from)));
    const have = new Set(existing.map((r) => r.date));
    const rows = dates.filter((d) => !have.has(d)).map((d) => matchFromSchedule(s, d));
    if (rows.length) await db.insert(matches).values(rows).onConflictDoNothing();
  }
}

export type RosterRow = {
  player: Player;
  inRoster: boolean;
  vote: Vote | null;
  voteChoice: VoteChoice | null;
  going: boolean | null;
  present: boolean;
  explicit: boolean;
  chargeToPlayerId: number | null;
  feeOverride: number | null;
  fee: number | null;
  result: Result | null;
  note: string | null;
};

/**
 * Danh sách người của một buổi: người được vote (kèm vote) + người admin thêm vào (khách, ngoài danh sách).
 * Người được vote: thành viên của lịch cố định; với lịch lẻ có bật vote là mọi thành viên đang đá.
 * Trước khi chốt, ai không bị admin sửa thì "có đá" hay không đi theo vote.
 */
export async function getMatchRoster(match: Match, playersById: Map<number, Player>): Promise<RosterRow[]> {
  const db = await getDb();
  const settled = match.status === "settled";
  const [atts, vts, roster] = await Promise.all([
    db.select().from(attendances).where(eq(attendances.matchId, match.id)),
    db.select().from(votes).where(eq(votes.matchId, match.id)),
    match.scheduleId && !settled
      ? db.select().from(schedulePlayers).where(eq(schedulePlayers.scheduleId, match.scheduleId))
      : Promise.resolve([]),
  ]);
  const attBy = new Map(atts.map((a) => [a.playerId, a]));
  const voteBy = new Map(vts.map((v) => [v.playerId, v]));
  const hasVote = match.voteMode != null;
  const activeMember = (id: number) => {
    const p = playersById.get(id);
    return !!p && p.type === "member" && p.status === "active";
  };
  const rosterIds = settled
    ? atts.filter((a) => a.inRoster).map((a) => a.playerId)
    : match.scheduleId
      ? roster.map((r) => r.playerId).filter(activeMember)
      : hasVote
        ? [...playersById.keys()].filter(activeMember)
        : [];
  const rosterSet = new Set(rosterIds);

  const rows: RosterRow[] = [];
  for (const id of new Set([...rosterIds, ...atts.map((a) => a.playerId)])) {
    const player = playersById.get(id);
    if (!player) continue;
    const att = attBy.get(id);
    const vote = voteBy.get(id) ?? null;
    const inRoster = rosterSet.has(id);
    const voteChoice = ((settled ? att?.voteChoice : vote?.choice) ?? null) as VoteChoice | null;
    const going = hasVote && inRoster ? (voteChoice ? voteChoice === "going" : match.voteMode !== "going") : null;
    const present = att ? att.present : going === true;
    const result =
      (settled ? (att?.result as Result | null) : null) ??
      resultOf({ hasVote, inRoster, voteMode: match.voteMode, voteChoice, present });
    rows.push({
      player,
      inRoster,
      vote,
      voteChoice,
      going,
      present,
      explicit: !!att,
      chargeToPlayerId: att?.chargeToPlayerId ?? null,
      feeOverride: att?.feeOverride ?? null,
      fee: att?.fee ?? null,
      result,
      note: att?.note ?? null,
    });
  }
  return rows.sort((a, b) => Number(b.inRoster) - Number(a.inRoster) || byName(a.player, b.player));
}

export function matchTotalCost(m: Pick<Match, "costField" | "costWater" | "costReferee" | "costOther">) {
  return m.costField + m.costWater + m.costReferee + m.costOther;
}
