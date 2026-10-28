import { and, asc, eq, gte } from "drizzle-orm";
import Link from "next/link";
import { getDb, schema } from "@/db";
import { QrCard } from "@/components/QrCard";
import { Badge, Card, Empty, Money, Stat } from "@/components/ui";
import {
  ensureScheduleMatches,
  fundCash,
  getActiveTx,
  getFunds,
  getMatchRoster,
  getPlayers,
  getVenues,
  indexById,
  playerBalances,
} from "@/lib/data";
import { viewCtx } from "@/lib/team";
import { pname } from "@/lib/text";
import { fmtDateTime, fmtMatchDate, timeLeft, todayVN } from "@/lib/time";
import { fundQr, voteCounts } from "@/lib/views";

export default async function HomePage({ params }: { params: Promise<{ slug: string }> }) {
  const ctx = await viewCtx(params);
  if (!ctx) return null;
  const { team, admin, me, base } = ctx;
  await ensureScheduleMatches(team.id);
  const db = await getDb();
  const [players, txs, funds, venues] = await Promise.all([
    getPlayers(team.id),
    getActiveTx(team.id),
    getFunds(team.id),
    getVenues(team.id),
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
  const voteMatch = upcoming.find((m) => m.scheduleId && m.voteDeadline && m.voteDeadline > now);
  const nextRoster = next ? await getMatchRoster(next, ps) : [];
  const voteRoster = voteMatch ? (voteMatch.id === next?.id ? nextRoster : await getMatchRoster(voteMatch, ps)) : [];
  const nextCount = nextRoster.filter((r) => r.present).length;
  const vc = voteCounts(voteRoster);
  const myVote = me ? voteRoster.find((r) => r.player.id === me.id) : undefined;

  const bal = playerBalances(txs);
  const debtors = players
    .map((p) => ({ p, b: bal.get(p.id) ?? { ball: 0, penalty: 0 } }))
    .map((x) => ({ ...x, debt: Math.min(0, x.b.ball) + Math.min(0, x.b.penalty) }))
    .filter((x) => x.debt < 0)
    .sort((a, b) => a.debt - b.debt)
    .slice(0, 5);
  const qrBall = fundQr(funds.ball, { content: "QB" });
  const qrPenalty = fundQr(funds.penalty, { content: "PHAT" });
  const venue = next?.venueId ? vs.get(next.venueId) : undefined;

  return (
    <>
      {voteMatch && (
        <Card
          title="🗳️ Vote tuần này"
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

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Quỹ bóng" value={<Money v={fundCash(txs, "ball")} />} href={`${base}/quy?f=ball`} />
        <Stat label="Quỹ phạt" value={<Money v={fundCash(txs, "penalty")} />} href={`${base}/quy?f=penalty`} />
      </div>

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
          </div>
        </Card>
      )}

      <Card title="Đang nợ nhiều nhất" right={<Link href={`${base}/cong-no`} className="text-sm text-green-700">Công nợ →</Link>}>
        {debtors.length ? (
          <ul className="divide-y divide-gray-100">
            {debtors.map(({ p, debt }) => (
              <li key={p.id} className="flex justify-between py-1.5 text-sm">
                <Link href={`${base}/cau-thu/${p.id}`}>{pname(p)}</Link>
                <Money v={debt} color />
              </li>
            ))}
          </ul>
        ) : (
          <Empty>Không ai nợ 🎉</Empty>
        )}
      </Card>

      {(qrBall.configured || qrPenalty.configured) && (
        <Card title="Chuyển tiền">
          <div className="grid gap-4 sm:grid-cols-2">
            {(
              [
                ["Quỹ bóng", qrBall],
                ["Quỹ phạt", qrPenalty],
              ] as const
            )
              .filter(([, q]) => q.configured)
              .map(([title, q]) => (
                <QrCard
                  key={title}
                  title={title}
                  payload={q.payload}
                  image={q.image}
                  lines={q.lines}
                  copies={q.copies}
                  fileName={`qr-${title}`}
                  size="sm"
                />
              ))}
          </div>
          <p className="mt-2 text-center text-xs text-gray-500">
            Muốn QR có sẵn số tiền? <Link href={`${base}/qr`} className="underline">Tạo QR</Link>
          </p>
        </Card>
      )}
    </>
  );
}
