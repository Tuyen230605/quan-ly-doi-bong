import { eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { teamCtx } from "@/lib/team";
import { todayVN } from "@/lib/time";

export const dynamic = "force-dynamic";

/** Sao lưu toàn bộ dữ liệu của đội (trừ mật khẩu, PIN). Chỉ admin của đội. */
export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const ctx = await teamCtx((await params).slug);
  if (!ctx?.admin) return new Response("Chỉ admin của đội", { status: 403 });
  const teamId = ctx.team.id;
  const db = await getDb();
  const s = schema;
  const [players, venues, schedules, matches, funds, transactions, penaltyTypes, auditLogs, paymentRequests] = await Promise.all([
    db.select().from(s.players).where(eq(s.players.teamId, teamId)),
    db.select().from(s.venues).where(eq(s.venues.teamId, teamId)),
    db.select().from(s.schedules).where(eq(s.schedules.teamId, teamId)),
    db.select().from(s.matches).where(eq(s.matches.teamId, teamId)),
    db.select().from(s.funds).where(eq(s.funds.teamId, teamId)),
    db.select().from(s.transactions).where(eq(s.transactions.teamId, teamId)),
    db.select().from(s.penaltyTypes).where(eq(s.penaltyTypes.teamId, teamId)),
    db.select().from(s.auditLogs).where(eq(s.auditLogs.teamId, teamId)),
    db.select().from(s.paymentRequests).where(eq(s.paymentRequests.teamId, teamId)),
  ]);
  const matchIds = matches.map((m) => m.id);
  const scheduleIds = schedules.map((x) => x.id);
  const [votes, attendances, schedulePlayers] = await Promise.all([
    matchIds.length ? db.select().from(s.votes).where(inArray(s.votes.matchId, matchIds)) : [],
    matchIds.length ? db.select().from(s.attendances).where(inArray(s.attendances.matchId, matchIds)) : [],
    scheduleIds.length ? db.select().from(s.schedulePlayers).where(inArray(s.schedulePlayers.scheduleId, scheduleIds)) : [],
  ]);
  const { passwordHash: _hidden, ...team } = ctx.team;
  void _hidden;
  const data = {
    exportedAt: new Date().toISOString(),
    team,
    players: players.map((p) => ({ ...p, pinHash: undefined })),
    venues,
    schedules,
    schedulePlayers,
    matches,
    votes,
    attendances,
    funds,
    transactions,
    penaltyTypes,
    paymentRequests,
    auditLogs,
  };
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="${ctx.team.slug}-${todayVN()}.json"`,
    },
  });
}
