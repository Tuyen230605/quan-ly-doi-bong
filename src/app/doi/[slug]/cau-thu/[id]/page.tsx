import { and, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { resetPin, savePlayer } from "@/actions/players";
import { ActionForm } from "@/components/ActionForm";
import { PlayerFields } from "@/components/forms";
import { Badge, Card, Empty, Fold, Money, PageTitle, ResultBadge, Stat } from "@/components/ui";
import { getDb, schema } from "@/db";
import { getActiveTx, getPlayers, indexById, personal, playerBalances } from "@/lib/data";
import { POSITIONS, type Result } from "@/lib/labels";
import { FUND_NAMES, fmtMoney, TX_TYPES, type Fund } from "@/lib/money";
import { getSettledAttendance, playerStats } from "@/lib/summary";
import { viewCtx } from "@/lib/team";
import { pname } from "@/lib/text";
import { addMonths, fmtDate, fmtMatchDate, fmtMonth, monthRange, todayVN } from "@/lib/time";

export default async function PlayerPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const ctx = await viewCtx(params);
  if (!ctx) return null;
  const { team, admin, base } = ctx;
  const id = Number((await params).id);
  const db = await getDb();
  const [players, txs, allTx, { atts, matches }] = await Promise.all([
    getPlayers(team.id),
    getActiveTx(team.id),
    db
      .select()
      .from(schema.transactions)
      .where(and(eq(schema.transactions.playerId, id), eq(schema.transactions.teamId, team.id)))
      .orderBy(desc(schema.transactions.date), desc(schema.transactions.id)),
    getSettledAttendance(team.id),
  ]);
  const p = indexById(players).get(id);
  if (!p) notFound();
  const b = playerBalances(txs).get(id) ?? { ball: 0, penalty: 0 };
  const all = playerStats(atts, matches, txs).get(id);
  const thisMonth = todayVN().slice(0, 7);
  const months = Array.from({ length: 6 }, (_, i) => addMonths(thisMonth, -i));
  const myAtts = atts
    .filter((a) => a.playerId === id)
    .map((a) => ({ a, m: matches.get(a.matchId)! }))
    .sort((x, y) => (x.m.date < y.m.date ? 1 : -1));
  const members = players.filter((x) => x.type === "member" && x.status !== "left");

  // Phạt đã trừ quỹ cá nhân: chỉ hiện 1 dòng "Phạt" thay vì thêm 2 dòng chuyển tiền giữa 2 quỹ.
  const deducted = new Set(allTx.filter((t) => t.type === "fine_pay" && t.status === "active").map((t) => t.refId));
  const history = allTx.filter((t) => t.type !== "fine_pay");
  const debtLink = (fund: Fund, amount: number) => `${base}/qr?fund=${fund}&player=${id}&amount=${amount}`;

  return (
    <>
      <PageTitle right={<Link href={`${base}/cau-thu`} className="btn btn-sm">← Cầu thủ</Link>}>
        {p.jerseyNo != null && <span className="mr-1 text-gray-400">#{p.jerseyNo}</span>}
        {pname(p)}
      </PageTitle>
      <div className="flex flex-wrap gap-1.5 text-sm text-gray-600">
        {p.nickname && <span>{p.fullName}</span>}
        <Badge tone={p.type === "guest" ? "blue" : "green"}>{p.type === "guest" ? "Khách" : "Thành viên"}</Badge>
        {p.status !== "active" && <Badge tone="amber">{p.status === "paused" ? "Tạm nghỉ" : "Đã rời đội"}</Badge>}
        {p.position && <Badge>{POSITIONS[p.position]}</Badge>}
        {admin && p.phone && <a href={`tel:${p.phone}`} className="underline">{p.phone}</a>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat
          label="Quỹ cá nhân"
          value={<Money v={personal(b)} color />}
          sub={
            (personal(b) < 0 ? "đang nợ, cần nộp thêm" : "còn trong quỹ") + (b.penalty < 0 ? ` · gồm nợ phạt cũ ${fmtMoney(-b.penalty)}` : "")
          }
        />
        <Stat label="Số trận đã đá" value={all?.attended ?? 0} />
        <Stat
          label="Chuyên cần"
          value={all?.rate != null ? `${Math.round(all.rate * 100)}%` : "—"}
          sub={all?.scheduled ? `${all.attendedScheduled}/${all.scheduled} buổi có vote` : ""}
        />
        <Stat
          label="Vote đi mà không đến"
          value={all?.noshow ?? 0}
          sub={`Không vote mà đi: ${all?.novoteCame ?? 0} · Nghỉ: ${all?.rested ?? 0}`}
        />
        <Stat label="Bị phạt" value={fmtMoney(all?.fined ?? 0)} sub={`${all?.fineCount ?? 0} lần`} />
        <Stat label="Đã đóng quỹ bóng" value={fmtMoney(all?.paidBall ?? 0)} />
        <Stat label="Tiền trận đã tính" value={fmtMoney(all?.matchFees ?? 0)} />
      </div>
      {(b.ball < 0 || b.penalty < 0) && (
        <div className="flex flex-wrap gap-2">
          {b.ball < 0 && (
            <Link href={debtLink("ball", -b.ball)} className="btn btn-primary">
              QR trả nợ quỹ bóng {fmtMoney(-b.ball)}
            </Link>
          )}
          {b.penalty < 0 && (
            <Link href={debtLink("penalty", -b.penalty)} className="btn btn-primary">
              QR nộp phạt {fmtMoney(-b.penalty)}
            </Link>
          )}
        </div>
      )}

      <Card title="Theo tháng">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Tháng</th>
                <th className="text-right">Đi</th>
                <th className="text-right">Nghỉ</th>
                <th className="text-right">Vote đi không đến</th>
                <th className="text-right">Đã đóng</th>
                <th className="text-right">Bị phạt</th>
              </tr>
            </thead>
            <tbody>
              {months.map((ym) => {
                const { from, to } = monthRange(ym);
                const s = playerStats(atts, matches, txs, from, to).get(id);
                return (
                  <tr key={ym}>
                    <td>
                      <Link href={`${base}/tong-ket?m=${ym}`} className="underline">
                        {fmtMonth(ym)}
                      </Link>
                    </td>
                    <td className="text-right">
                      {s?.attended ?? 0}
                      {s?.scheduled ? <span className="text-gray-400">/{s.scheduled}</span> : null}
                    </td>
                    <td className="text-right">{s?.rested ?? 0}</td>
                    <td className="text-right">{s?.noshow ?? 0}</td>
                    <td className="text-right tabular-nums">{fmtMoney(s?.paidBall ?? 0)}</td>
                    <td className="text-right tabular-nums">{fmtMoney(s?.fined ?? 0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Các buổi gần đây">
        {myAtts.length === 0 && <Empty>Chưa có buổi nào.</Empty>}
        <ul className="divide-y divide-gray-100">
          {myAtts.slice(0, 30).map(({ a, m }) => (
            <li key={a.matchId}>
              <Link href={`${base}/tran/${m.id}`} className="flex items-center justify-between py-1.5 text-sm">
                <span>{fmtMatchDate(m.date)}</span>
                <span className="flex items-center gap-2">
                  <ResultBadge result={a.result as Result | null} />
                  {a.present && <span className="tabular-nums text-gray-600">{fmtMoney(a.fee ?? 0)}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Lịch sử tiền">
        {history.length === 0 && <Empty>Chưa có giao dịch.</Empty>}
        <ul className="divide-y divide-gray-100">
          {history.map((t) => (
            <li key={t.id} className={`flex justify-between gap-2 py-1.5 text-sm ${t.status !== "active" ? "text-gray-400 line-through" : ""}`}>
              <div className="min-w-0">
                <div>
                  {TX_TYPES[t.type]}
                  {t.category && t.type === "penalty" ? `: ${t.category}` : ""} ·{" "}
                  <span className="text-gray-500">{deducted.has(t.id) ? "trừ quỹ cá nhân" : FUND_NAMES[t.fund as Fund]}</span>
                </div>
                <div className="truncate text-xs text-gray-500">
                  {fmtDate(t.date)}
                  {t.note ? ` · ${t.note}` : ""}
                </div>
              </div>
              <Money v={t.playerAmount} color={t.status === "active"} className="shrink-0" />
            </li>
          ))}
        </ul>
      </Card>

      {admin && (
        <>
          <Fold summary="Sửa thông tin">
            <ActionForm action={savePlayer} className="space-y-3">
              <PlayerFields p={p} members={members.filter((x) => x.id !== id)} />
              <button className="btn btn-primary w-full">Lưu</button>
            </ActionForm>
          </Fold>
          {p.pinHash && (
            <ActionForm action={resetPin} confirm="Xoá PIN của người này?">
              <input type="hidden" name="id" value={id} />
              <button className="btn btn-sm">Đặt lại mã PIN vote</button>
            </ActionForm>
          )}
        </>
      )}
    </>
  );
}
