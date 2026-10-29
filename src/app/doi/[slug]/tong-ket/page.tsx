import Link from "next/link";
import { CopyButton } from "@/components/CopyButton";
import { MemberTable, memberRows, memberSort, sortMemberRows, type MemberRow, type MemberSort } from "@/components/MemberTable";
import { Card, PageTitle, Stat, Tabs } from "@/components/ui";
import { getActiveTx, getPlayers, matchTotalCost } from "@/lib/data";
import { fmtK, fmtMoney } from "@/lib/money";
import { balancesAt, fundSummary, getSettledAttendance, inRange, playerStats } from "@/lib/summary";
import { viewCtx } from "@/lib/team";
import { pname } from "@/lib/text";
import { addMonths, fmtMonth, monthRange, todayVN } from "@/lib/time";

// ball/penalty: số dư cuối kỳ (cho xếp hạng "đang nợ"); now: quỹ cá nhân hiện tại.
type Row = MemberRow & { ball: number; penalty: number };

function sortRows(rows: Row[], key: MemberSort | "debt") {
  return key === "debt" ? [...rows].sort((a, b) => a.ball + a.penalty - (b.ball + b.penalty)) : sortMemberRows(rows, key);
}

export default async function SummaryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ m?: string; y?: string; sort?: string; tab?: string }>;
}) {
  const ctx = await viewCtx(params);
  if (!ctx) return null;
  const { team, base } = ctx;
  const sp = await searchParams;
  const ym = /^\d{4}-\d{2}$/.test(sp.m ?? "") ? sp.m! : todayVN().slice(0, 7);
  const year = /^\d{4}$/.test(sp.y ?? "") ? sp.y : undefined;
  const { from, to } = year ? { from: `${year}-01-01`, to: `${year}-12-31` } : monthRange(ym);
  const label = year ? `năm ${year}` : `tháng ${fmtMonth(ym)}`;
  const sort = memberSort(sp.sort);
  const tab = sp.tab === "tv" ? "tv" : "chung";
  const q = year ? `y=${year}` : `m=${ym}`;

  const [players, txs, { atts, matches }] = await Promise.all([
    getPlayers(team.id),
    getActiveTx(team.id),
    getSettledAttendance(team.id),
  ]);
  const stats = playerStats(atts, matches, txs, from, to);
  const bal = balancesAt(txs, to);
  const rows: Row[] = memberRows(players, stats, txs).map((r) => ({
    ...r,
    ball: bal.get(r.p.id)?.ball ?? 0,
    penalty: bal.get(r.p.id)?.penalty ?? 0,
  }));

  const top = (list: Row[], fmt: (r: Row) => string, n = 3) => list.slice(0, n).map(fmt).join(", ") || "—";
  const members = rows.filter((r) => r.p.type === "member");
  const ranks = {
    rate: top(sortRows(members.filter((r) => r.s.scheduled > 0), "rate"), (r) => `${pname(r.p)} ${r.s.attendedScheduled}/${r.s.scheduled}`),
    rested: top(
      members.filter((r) => r.s.scheduled - r.s.attendedScheduled > 0).sort((a, b) => b.s.scheduled - b.s.attendedScheduled - (a.s.scheduled - a.s.attendedScheduled)),
      (r) => `${pname(r.p)} nghỉ ${r.s.scheduled - r.s.attendedScheduled}/${r.s.scheduled}`,
    ),
    noshow: top(sortRows(rows.filter((r) => r.s.noshow > 0), "noshow"), (r) => `${pname(r.p)} ${r.s.noshow} lần`),
    fined: top(sortRows(rows.filter((r) => r.s.fined > 0), "fined"), (r) => `${pname(r.p)} ${fmtK(r.s.fined)}`),
    paid: top(sortRows(rows.filter((r) => r.s.paidBall > 0), "paid"), (r) => `${pname(r.p)} ${fmtK(r.s.paidBall)}`),
    debt: top(sortRows(rows.filter((r) => r.ball + r.penalty < 0), "debt"), (r) => `${pname(r.p)} ${fmtK(-(r.ball + r.penalty))}`),
  };

  const ball = fundSummary(txs, "ball", from, to);
  const pen = fundSummary(txs, "penalty", from, to);
  const periodMatches = [...matches.values()].filter((m) => inRange(m.date, from, to));
  const presentBy = new Map<number, number>();
  for (const a of atts) if (a.present) presentBy.set(a.matchId, (presentBy.get(a.matchId) ?? 0) + 1);
  const avgPeople = periodMatches.length ? periodMatches.reduce((s, m) => s + (presentBy.get(m.id) ?? 0), 0) / periodMatches.length : 0;
  const avgCost = periodMatches.length ? periodMatches.reduce((s, m) => s + matchTotalCost(m), 0) / periodMatches.length : 0;

  const text = [
    `📊 ${team.name.toUpperCase()} – TỔNG KẾT ${label.toUpperCase()}`,
    `Số buổi: ${periodMatches.length} · Trung bình ${Math.round(avgPeople)} người/buổi`,
    `🏅 Chuyên cần: ${ranks.rate}`,
    `😴 Nghỉ nhiều: ${ranks.rested}`,
    `🚨 Vote đi mà không đến: ${ranks.noshow}`,
    `💸 Bị phạt nhiều: ${ranks.fined}`,
    `💰 Đóng quỹ nhiều: ${ranks.paid}`,
    `📌 Đang nợ: ${ranks.debt}`,
    `⚽ Quỹ bóng: đầu kỳ ${fmtMoney(ball.opening)} → cuối kỳ ${fmtMoney(ball.closing)}`,
    `⚖️ Quỹ phạt: phát sinh ${fmtMoney(pen.fined)}, đã thu ${fmtMoney(pen.deposits)}, còn nợ ${fmtMoney(pen.debtEnd)}, đang có ${fmtMoney(pen.closing)}`,
  ].join("\n");

  const t = tab === "tv" ? "&tab=tv" : "";
  const nav = (target: string, text: string) => (
    <Link href={`${target}${t}`} className="btn btn-sm">
      {text}
    </Link>
  );

  return (
    <>
      <PageTitle right={<CopyButton text={text} label="Copy tổng kết" />}>Tổng kết {label}</PageTitle>
      <div className="flex flex-wrap gap-2">
        {nav(`${base}/tong-ket?m=${addMonths(ym, -1)}`, "← Tháng trước")}
        {nav(`${base}/tong-ket?m=${todayVN().slice(0, 7)}`, "Tháng này")}
        {!year && nav(`${base}/tong-ket?m=${addMonths(ym, 1)}`, "Tháng sau →")}
        {nav(`${base}/tong-ket?y=${(year ?? ym).slice(0, 4)}`, `Cả năm ${(year ?? ym).slice(0, 4)}`)}
        <a href={`${base}/api/tong-ket?from=${from}&to=${to}`} className="btn btn-sm">
          ⬇ Excel (CSV)
        </a>
      </div>
      <Tabs
        items={[
          { href: `${base}/tong-ket?${q}`, label: "📊 Tổng quan", active: tab === "chung" },
          { href: `${base}/tong-ket?${q}&tab=tv`, label: `👥 Từng thành viên (${rows.length})`, active: tab === "tv" },
        ]}
      />

      {tab === "tv" ? (
        <MemberTable
          rows={sortRows(rows, sort)}
          sort={sort}
          sortHref={(k) => `${base}/tong-ket?${q}&tab=tv&sort=${k}`}
          base={base}
          label={label}
          meId={ctx.me?.id}
        />
      ) : (
        <>
          <Card title="Xếp hạng">
            <dl className="space-y-1.5 text-sm">
              {(
                [
                  ["🏅 Chuyên cần nhất", ranks.rate],
                  ["😴 Nghỉ nhiều nhất", ranks.rested],
                  ["🚨 Vote đi mà không đến", ranks.noshow],
                  ["💸 Bị phạt nhiều nhất", ranks.fined],
                  ["💰 Đóng quỹ nhiều nhất", ranks.paid],
                  ["📌 Đang nợ nhiều nhất", ranks.debt],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="grid grid-cols-[10rem_1fr] gap-2">
                  <dt className="text-gray-500">{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            {(
              [
                ["⚽ Quỹ bóng", ball],
                ["🚨 Quỹ phạt", pen],
              ] as const
            ).map(([name, s]) => (
              <Card key={name} title={name}>
                <div className="grid grid-cols-2 gap-2">
                  <Stat label="Đầu kỳ" value={fmtMoney(s.opening)} />
                  <Stat label="Cuối kỳ" value={fmtMoney(s.closing)} />
                  <Stat label="Tổng thu" value={fmtMoney(s.totalIncome)} />
                  <Stat label="Tổng chi" value={fmtMoney(s.totalExpense)} />
                  {s === pen && <Stat label="Phạt phát sinh" value={fmtMoney(s.fined)} sub={`còn nợ ${fmtMoney(s.debtEnd)}`} />}
                  {s === ball && (
                    <Stat
                      label="Số buổi đã đá"
                      value={periodMatches.length}
                      sub={`TB ${Math.round(avgPeople)} người, ${fmtMoney(Math.round(avgCost))}/buổi`}
                    />
                  )}
                </div>
                {s.income.length > 0 && (
                  <>
                    <h3 className="mt-3 text-sm font-semibold text-gray-700">Thu</h3>
                    <ul className="text-sm">
                      {s.income.map(([k, v]) => (
                        <li key={k} className="flex justify-between py-0.5">
                          <span>{k}</span>
                          <span className="tabular-nums text-green-700">{fmtMoney(v)}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                {s.expense.length > 0 && (
                  <>
                    <h3 className="mt-3 text-sm font-semibold text-gray-700">Chi</h3>
                    <ul className="text-sm">
                      {s.expense.map(([k, v]) => (
                        <li key={k} className="flex justify-between py-0.5">
                          <span>{k}</span>
                          <span className="tabular-nums text-red-600">{fmtMoney(v)}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </Card>
            ))}
          </div>
        </>
      )}
    </>
  );
}

