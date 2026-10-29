import { and, asc, eq, gte } from "drizzle-orm";
import Link from "next/link";
import { saveRules } from "@/actions/teams";
import { getDb, schema } from "@/db";
import { ActionForm } from "@/components/ActionForm";
import { MemberTable, memberRows, memberSort, sortMemberRows } from "@/components/MemberTable";
import { Badge, Card, Empty, Fold, Money, Stat } from "@/components/ui";
import {
  ensureScheduleMatches,
  fundCash,
  getActiveTx,
  getMatchRoster,
  getPaymentRequests,
  getPenaltyTypes,
  getPlayers,
  getVenues,
  indexById,
  personal,
  playerBalances,
  type PenaltyType,
} from "@/lib/data";
import { fmtMoney } from "@/lib/money";
import { getSettledAttendance, playerStats } from "@/lib/summary";
import { viewCtx } from "@/lib/team";
import { pname } from "@/lib/text";
import { fmtDateTime, fmtMatchDate, fmtMonth, monthRange, timeLeft, todayVN } from "@/lib/time";
import { voteCounts } from "@/lib/views";

/** Mẫu quy định cho admin sửa, lấy từ các mức phạt đang dùng. */
function rulesTemplate(types: PenaltyType[]) {
  const fines = types
    .filter((t) => t.enabled)
    .map((t) => `- ${t.name}: ${t.amountMode === "match_fee" ? "bằng tiền trận mỗi người" : fmtMoney(t.defaultAmount)}`);
  return [
    "1. Vote đi/nghỉ trước hạn chót.",
    "2. Tiền trận trừ vào quỹ cá nhân sau mỗi buổi. Quỹ cá nhân âm thì nộp thêm.",
    "3. Tiền phạt trừ vào quỹ cá nhân, chuyển sang quỹ phạt:",
    ...fines,
  ].join("\n");
}

export default async function HomePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string }>;
}) {
  const ctx = await viewCtx(params);
  if (!ctx) return null;
  const { team, admin, me, base } = ctx;
  const sort = memberSort((await searchParams).sort);
  await ensureScheduleMatches(team.id);
  const db = await getDb();
  const [players, txs, venues, requests, penaltyTypes, { atts, matches }] = await Promise.all([
    getPlayers(team.id),
    getActiveTx(team.id),
    getVenues(team.id),
    getPaymentRequests(team.id),
    getPenaltyTypes(team.id),
    getSettledAttendance(team.id),
  ]);
  const ps = indexById(players);
  const vs = indexById(venues);
  const now = new Date();
  const today = todayVN();

  const upcoming = await db
    .select()
    .from(schema.matches)
    .where(and(eq(schema.matches.teamId, team.id), eq(schema.matches.status, "upcoming"), gte(schema.matches.date, today)))
    .orderBy(asc(schema.matches.date), asc(schema.matches.startTime))
    .limit(10);
  const next = upcoming[0];
  const voteMatch = upcoming.find((m) => m.voteMode && m.voteDeadline && m.voteDeadline > now);
  const nextRoster = next ? await getMatchRoster(next, ps) : [];
  const voteRoster = voteMatch ? (voteMatch.id === next?.id ? nextRoster : await getMatchRoster(voteMatch, ps)) : [];
  const nextCount = nextRoster.filter((r) => r.present).length;
  const vc = voteCounts(voteRoster);
  const myVote = me ? voteRoster.find((r) => r.player.id === me.id) : undefined;

  const myFund = me ? personal(playerBalances(txs).get(me.id)) : 0;
  const openRequests = requests.filter((r) => r.status === "open").slice(0, 3);
  const myPaid = new Set(txs.filter((t) => me && t.playerId === me.id && t.requestId).map((t) => t.requestId));
  const ym = today.slice(0, 7);
  const { from, to } = monthRange(ym);
  const members = sortMemberRows(memberRows(players, playerStats(atts, matches, txs, from, to), txs), sort);
  const venue = next?.venueId ? vs.get(next.venueId) : undefined;

  return (
    <>
      {voteMatch && (
        <Card
          title="🗳️ Vote buổi sắp tới"
          right={<Badge tone="amber">Hạn {fmtDateTime(voteMatch.voteDeadline!)}</Badge>}
          className="border-amber-200 bg-amber-50/60"
        >
          <p className="text-sm">
            {fmtMatchDate(voteMatch.date)} · {voteMatch.startTime} · <b>{timeLeft(voteMatch.voteDeadline!)}</b>
          </p>
          <p className="mt-1 text-sm text-gray-700">
            Đi <b>{vc.going.length}</b> · Nghỉ <b>{vc.absent.length}</b> · Chưa vote <b>{vc.noVote.length}</b>
          </p>
          {me && myVote && (
            <p className="mt-1 text-sm">
              Bạn: {myVote.vote ? <b>{myVote.vote.choice === "going" ? "ĐI" : "NGHỈ"}</b> : <i>chưa vote</i>}
            </p>
          )}
          <Link href={`${base}/vote`} className="btn btn-primary mt-3 w-full">
            {me ? "Vote ngay" : "Xem / vote"}
          </Link>
        </Card>
      )}

      <Card title="⚽ Buổi đá tiếp theo" right={<Link href={`${base}/lich`} className="text-sm text-green-700">Lịch →</Link>}>
        {next ? (
          <Link href={`${base}/tran/${next.id}`} className="block">
            <div className="text-lg font-bold">{fmtMatchDate(next.date)}</div>
            <div className="text-sm text-gray-700">
              {next.startTime}
              {next.endTime ? `–${next.endTime}` : ""} · {venue?.name ?? "Chưa chọn sân"}
            </div>
            <div className="mt-1 text-sm text-gray-600">Dự kiến {nextCount} người</div>
          </Link>
        ) : (
          <Empty>Chưa có lịch. {admin && <Link href={`${base}/lich/co-dinh`} className="text-green-700 underline">Tạo lịch cố định</Link>}</Empty>
        )}
        {venue?.mapUrl && (
          <a href={venue.mapUrl} target="_blank" rel="noreferrer" className="btn btn-sm mt-2">
            📍 Bản đồ
          </a>
        )}
      </Card>

      <div className="grid grid-cols-3 gap-2">
        <Stat compact label="Quỹ bóng" value={<Money v={fundCash(txs, "ball")} fit />} href={`${base}/quy?f=ball`} />
        <Stat compact label="Quỹ phạt" value={<Money v={fundCash(txs, "penalty")} fit />} href={`${base}/quy?f=penalty`} />
        {me ? (
          <Stat
            compact
            label="Quỹ cá nhân"
            value={<Money v={myFund} color fit />}
            sub={pname(me)}
            href={`${base}/cau-thu/${me.id}`}
            className={myFund < 0 ? "!border-red-200 !bg-red-50" : "!border-green-200 !bg-green-50"}
          />
        ) : (
          <Stat compact label="Quỹ cá nhân" value="—" sub="Chọn tên →" href={`${base}/toi?next=${base}`} className="!border-amber-300 !bg-amber-50" />
        )}
      </div>

      {openRequests.length > 0 && (
        <Card title="💳 Nộp tiền" right={<Link href={`${base}/nop`} className="text-sm text-green-700">Tất cả →</Link>}>
          <ul className="divide-y divide-gray-100">
            {openRequests.map((r) => (
              <li key={r.id}>
                <Link href={`${base}/nop/${r.id}`} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <span className="font-medium">{r.title}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="tabular-nums">{fmtMoney(r.amount)}</span>
                    {myPaid.has(r.id) ? <Badge tone="green">✅ Đã nộp</Badge> : <span className="btn btn-sm btn-primary">Nộp</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {admin && (
        <Card title="Thao tác nhanh">
          <div className="grid grid-cols-2 gap-2">
            {next?.date === today && (
              <Link href={`${base}/tran/${next.id}#diem-danh`} className="btn btn-primary col-span-2">
                ✅ Điểm danh buổi hôm nay
              </Link>
            )}
            <Link href={`${base}/quy?f=ball#nop`} className="btn">
              + Ghi nộp tiền
            </Link>
            <Link href={`${base}/quy?f=ball#chi`} className="btn">
              + Ghi khoản chi
            </Link>
            <Link href={`${base}/quy?f=penalty#phat`} className="btn">
              + Phạt
            </Link>
            <Link href={`${base}/lich/moi`} className="btn">
              + Lịch lẻ
            </Link>
            <Link href={`${base}/nop`} className="btn col-span-2">
              🔳 Tạo link / QR nộp tiền
            </Link>
          </div>
        </Card>
      )}

      {(team.rules || admin) && (
        <Card title="📜 Quy định của đội" id="quy-dinh">
          {team.rules ? (
            <div className="text-sm leading-relaxed whitespace-pre-wrap">{team.rules}</div>
          ) : (
            <p className="muted">Chưa có quy định. Viết quy định (tiền phạt, giờ giấc…) để cả đội cùng xem.</p>
          )}
          {admin && (
            <div className="mt-3">
              <Fold summary={team.rules ? "Sửa quy định" : "Viết quy định"}>
                <ActionForm action={saveRules} className="space-y-2">
                  <textarea
                    className="input min-h-48 !text-sm"
                    name="rules"
                    maxLength={5000}
                    defaultValue={team.rules ?? rulesTemplate(penaltyTypes)}
                  />
                  <p className="text-xs text-gray-500">Mỗi dòng một ý. Mức phạt khi phạt sau trận vẫn sửa được từng người.</p>
                  <button className="btn btn-primary w-full">Lưu quy định</button>
                </ActionForm>
              </Fold>
            </div>
          )}
        </Card>
      )}

      <MemberTable
        id="thanh-vien"
        title={`👥 Bảng thành viên tháng ${fmtMonth(ym)}`}
        right={
          <Link href={`${base}/tong-ket?tab=tv`} className="text-sm text-green-700">
            Tháng khác →
          </Link>
        }
        rows={members}
        sort={sort}
        sortHref={(k) => `${base}?sort=${k}#thanh-vien`}
        base={base}
        label={`tháng ${fmtMonth(ym)}`}
        meId={me?.id}
      />
    </>
  );
}
