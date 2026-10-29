import { and, asc, eq, gte, isNotNull } from "drizzle-orm";
import Link from "next/link";
import { castVote } from "@/actions/matches";
import { ActionForm } from "@/components/ActionForm";
import { CopyButton } from "@/components/CopyButton";
import { Badge, Card, Empty, PageTitle } from "@/components/ui";
import { getDb, schema } from "@/db";
import { KIND_LABELS } from "@/lib/labels";
import { ensureScheduleMatches, getMatchRoster, getPlayers, getVenues, indexById, type Match, type RosterRow } from "@/lib/data";
import { viewCtx } from "@/lib/team";
import { pname } from "@/lib/text";
import { addDays, fmtDateTime, fmtDM, fmtMatchDate, mondayOf, timeLeft, todayVN } from "@/lib/time";
import { siteOrigin, voteCounts } from "@/lib/views";

const names = (ps: { nickname: string | null; fullName: string }[]) => ps.map(pname).join(", ") || "—";

export default async function VotePage({ params }: { params: Promise<{ slug: string }> }) {
  const ctx = await viewCtx(params);
  if (!ctx) return null;
  const { team, admin, me, base } = ctx;
  await ensureScheduleMatches(team.id);
  const db = await getDb();
  const [players, venues, origin] = await Promise.all([getPlayers(team.id), getVenues(team.id), siteOrigin()]);
  const ps = indexById(players);
  const vs = indexById(venues);
  const now = new Date();
  const list = await db
    .select()
    .from(schema.matches)
    .where(
      and(
        eq(schema.matches.teamId, team.id),
        eq(schema.matches.status, "upcoming"),
        isNotNull(schema.matches.voteMode),
        gte(schema.matches.date, todayVN()),
      ),
    )
    .orderBy(asc(schema.matches.date), asc(schema.matches.startTime));
  const scheds = indexById(await db.select().from(schema.schedules).where(eq(schema.schedules.teamId, team.id)));
  const rosters = await Promise.all(list.map((m) => getMatchRoster(m, ps)));

  const groups = new Map<string, { monday: string; schedName: string; deadline: Date | null; mode: string; items: { m: Match; rows: RosterRow[] }[] }>();
  list.forEach((m, i) => {
    // Lịch cố định: gom theo tuần. Lịch lẻ: mỗi buổi 1 phiếu.
    const key = m.scheduleId ? `${m.scheduleId}:${mondayOf(m.date)}` : `m${m.id}`;
    if (!groups.has(key))
      groups.set(key, {
        monday: m.scheduleId ? mondayOf(m.date) : "",
        schedName: m.scheduleId
          ? (scheds.get(m.scheduleId)?.name ?? "Lịch cố định")
          : `${KIND_LABELS[m.kind]}${m.opponent ? ` vs ${m.opponent}` : ""}`,
        deadline: m.voteDeadline,
        mode: m.voteMode ?? "absent",
        items: [],
      });
    groups.get(key)!.items.push({ m, rows: rosters[i] });
  });

  return (
    <>
      <PageTitle>Vote đi / nghỉ</PageTitle>
      {!me && !admin && (
        <Card className="border-amber-200 bg-amber-50">
          <p className="text-sm">Chọn tên của bạn để vote.</p>
          <Link href={`${base}/toi?next=${base}/vote`} className="btn btn-primary mt-2">
            Chọn tên
          </Link>
        </Card>
      )}
      {groups.size === 0 && (
        <Card>
          <Empty>Chưa có phiếu vote nào.</Empty>
        </Card>
      )}
      {[...groups.values()].map((g) => {
        const open = !!g.deadline && g.deadline > now;
        const modeText = g.mode === "going" ? "Ai ĐI thì vote, không vote = KHÔNG ĐI." : "Ai NGHỈ thì vote, không vote = ĐI.";
        const reminder = [
          g.monday
            ? `⚽ Vote ${g.schedName} tuần ${fmtDM(g.monday)}–${fmtDM(addDays(g.monday, 6))}`
            : `⚽ Vote ${g.schedName} ${fmtMatchDate(g.items[0].m.date)}`,
          ...g.items.map(({ m }) => `• ${fmtMatchDate(m.date)} ${m.startTime}${m.venueId ? `, ${vs.get(m.venueId)?.name ?? ""}` : ""}`),
          g.deadline ? `Hạn: ${fmtDateTime(g.deadline)}. ${modeText}` : modeText,
          ...g.items.map(({ m, rows }) => {
            const c = voteCounts(rows);
            return g.mode === "going"
              ? `${fmtDM(m.date)} đang đi (${c.going.length}): ${names(c.going)}`
              : `${fmtDM(m.date)} đang nghỉ (${c.absent.length}): ${names(c.absent)}`;
          }),
          `Vote tại: ${origin}${base}/vote (đội “${team.name}”, mật khẩu hỏi admin)`,
        ].join("\n");
        return (
          <section key={`${g.schedName}${g.monday}${g.items[0].m.id}`} className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-bold">
                  {g.schedName}
                  {g.monday ? ` · tuần ${fmtDM(g.monday)}–${fmtDM(addDays(g.monday, 6))}` : ""}
                </h2>
                <p className="text-xs text-gray-600">
                  {g.deadline ? `Hạn chót ${fmtDateTime(g.deadline)} · ` : ""}
                  {modeText}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={open ? "amber" : "gray"}>{g.deadline ? timeLeft(g.deadline) : "không hạn"}</Badge>
                {admin && <CopyButton text={reminder} label="Copy nhắc vote" />}
              </div>
            </div>
            {g.items.map(({ m, rows }) => {
              const c = voteCounts(rows);
              const mine = me ? rows.find((r) => r.player.id === me.id && r.inRoster) : undefined;
              const absentRows = rows.filter((r) => r.inRoster && r.voteChoice === "absent");
              return (
                <Card key={m.id}>
                  <Link href={`${base}/tran/${m.id}`} className="block">
                    <div className="font-semibold">
                      {fmtMatchDate(m.date)} · {m.startTime}
                    </div>
                    <div className="text-sm text-gray-600">{m.venueId ? vs.get(m.venueId)?.name : "Chưa chọn sân"}</div>
                  </Link>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-center text-sm">
                    <div className="rounded-lg bg-green-50 py-1.5">
                      Đi <b className="block text-lg">{c.going.length}</b>
                    </div>
                    <div className="rounded-lg bg-amber-50 py-1.5">
                      Nghỉ <b className="block text-lg">{c.absent.length}</b>
                    </div>
                    <div className="rounded-lg bg-gray-50 py-1.5">
                      Chưa vote <b className="block text-lg">{c.noVote.length}</b>
                    </div>
                  </div>
                  <details className="mt-2 text-sm">
                    <summary className="cursor-pointer text-green-700">Xem tên</summary>
                    <p className="mt-1">
                      <b>Đi:</b> {names(c.going)}
                    </p>
                    <p className="mt-1">
                      <b>Nghỉ:</b>{" "}
                      {absentRows.length
                        ? absentRows.map((r) => `${pname(r.player)}${r.vote?.reason ? ` (${r.vote.reason})` : ""}`).join(", ")
                        : "—"}
                    </p>
                    <p className="mt-1 text-gray-600">
                      <b>Chưa vote:</b> {names(c.noVote)}
                    </p>
                  </details>
                  {me && !mine && <p className="mt-2 text-xs text-gray-500">Bạn không có trong danh sách vote của buổi này.</p>}
                  {mine && open && (
                    <ActionForm action={castVote} className="mt-3 space-y-2">
                      <input type="hidden" name="matchId" value={m.id} />
                      <input className="input !text-sm" name="reason" placeholder="Lý do (không bắt buộc)" defaultValue={mine.vote?.reason ?? ""} />
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          name="choice"
                          value="going"
                          className={`btn ${mine.vote?.choice === "going" ? "btn-primary" : ""}`}
                        >
                          ✅ ĐI
                        </button>
                        <button
                          name="choice"
                          value="absent"
                          className={`btn ${mine.vote?.choice === "absent" ? "!border-amber-500 !bg-amber-500 !text-white" : ""}`}
                        >
                          ❌ NGHỈ
                        </button>
                      </div>
                      <p className="text-xs text-gray-500">
                        Bạn đang: <b>{mine.going ? "ĐI" : "NGHỈ"}</b>
                        {!mine.vote && " (chưa vote, tính theo mặc định)"}
                      </p>
                    </ActionForm>
                  )}
                  {mine && !open && (
                    <p className="mt-2 text-sm">
                      Bạn: <b>{mine.going ? "ĐI" : "NGHỈ"}</b> · Phiếu đã khoá, nhắn admin nếu cần đổi.
                    </p>
                  )}
                </Card>
              );
            })}
          </section>
        );
      })}
    </>
  );
}
