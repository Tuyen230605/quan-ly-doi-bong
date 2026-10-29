import Link from "next/link";
import type { Player } from "@/lib/auth";
import { personal, playerBalances, type Tx } from "@/lib/data";
import { fmtMoney } from "@/lib/money";
import { emptyStats, type PlayerStats } from "@/lib/summary";
import { pname } from "@/lib/text";
import { Card, Empty, Money } from "./ui";

/** 1 dòng bảng thành viên: s = số liệu trong kỳ, now = quỹ cá nhân hiện tại. */
export type MemberRow = { p: Player; s: PlayerStats; now: number };

export const MEMBER_SORTS = {
  fund: "Quỹ cá nhân",
  attended: "Đi nhiều",
  rate: "Chuyên cần",
  noshow: "Vắng không báo",
  fined: "Bị phạt",
  paid: "Đã đóng",
  name: "Tên",
} as const;

export type MemberSort = keyof typeof MEMBER_SORTS;

export function memberSort(v: string | undefined): MemberSort {
  return v && v in MEMBER_SORTS ? (v as MemberSort) : "fund";
}

export function sortMemberRows<T extends MemberRow>(rows: T[], key: MemberSort): T[] {
  const by: Record<MemberSort, (a: T, b: T) => number> = {
    fund: (a, b) => a.now - b.now,
    attended: (a, b) => b.s.attended - a.s.attended || (b.s.rate ?? -1) - (a.s.rate ?? -1),
    rate: (a, b) => (b.s.rate ?? -1) - (a.s.rate ?? -1) || a.s.noshow - b.s.noshow || b.s.attended - a.s.attended,
    noshow: (a, b) => b.s.noshow - a.s.noshow,
    paid: (a, b) => b.s.paidBall - a.s.paidBall,
    fined: (a, b) => b.s.fined - a.s.fined,
    name: (a, b) => pname(a.p).localeCompare(pname(b.p), "vi"),
  };
  return [...rows].sort(by[key]);
}

/** Thành viên đang đá + ai có số liệu trong kỳ (kể cả khách, người đã nghỉ). */
export function memberRows(players: Player[], stats: Map<number, PlayerStats>, txs: Tx[]): MemberRow[] {
  const bal = playerBalances(txs);
  return players
    .filter((p) => stats.has(p.id) || (p.type === "member" && p.status === "active"))
    .map((p) => ({ p, s: stats.get(p.id) ?? emptyStats(), now: personal(bal.get(p.id)) }));
}

/** Bảng từng thành viên: quỹ cá nhân hiện tại + số buổi đi lên trước, cột tên dính bên trái khi kéo ngang. */
export function MemberTable({
  rows,
  sort,
  sortHref,
  base,
  label,
  title,
  right,
  meId,
  id,
}: {
  rows: MemberRow[];
  sort: MemberSort;
  sortHref: (key: MemberSort) => string;
  base: string;
  label: string; // kỳ tính số liệu, VD "tháng 11/2026"
  title?: React.ReactNode;
  right?: React.ReactNode;
  meId?: number; // tô đậm dòng của người đang dùng máy
  id?: string;
}) {
  return (
    <Card title={title} right={right} id={id}>
      <div className="mb-2 flex flex-wrap items-center gap-1 text-xs">
        Sắp xếp:
        {Object.entries(MEMBER_SORTS).map(([k, v]) => (
          <Link
            key={k}
            href={sortHref(k as MemberSort)}
            scroll={false}
            className={`chip ${sort === k ? "bg-green-700 text-white" : "bg-gray-100 text-gray-700"}`}
          >
            {v}
          </Link>
        ))}
      </div>
      {rows.length === 0 ? (
        <Empty>Chưa có dữ liệu.</Empty>
      ) : (
        <div className="-mx-4 overflow-x-auto">
          <table className="table min-w-[44rem]">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-white pl-4">Tên</th>
                <th className="text-right">Quỹ cá nhân</th>
                <th className="text-right">Đi/buổi</th>
                <th>Chuyên cần</th>
                <th className="text-right">Nghỉ</th>
                <th className="text-right">Vote đi không đến</th>
                <th className="text-right">Không vote mà đi</th>
                <th className="text-right">Bị phạt</th>
                <th className="text-right">Tiền trận</th>
                <th className="text-right pr-4">Đã đóng</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ p, s, now }) => {
                const bg = p.id === meId ? "bg-green-50" : "bg-white";
                return (
                  <tr key={p.id} className={bg}>
                    <td className={`sticky left-0 z-10 whitespace-nowrap pl-4 ${bg}`}>
                      <Link href={`${base}/cau-thu/${p.id}`} className="font-medium">
                        {pname(p)}
                      </Link>
                      {p.type === "guest" && <span className="ml-1 text-xs text-gray-400">khách</span>}
                      {p.id === meId && <span className="ml-1 text-xs text-green-700">(bạn)</span>}
                    </td>
                    <td className="text-right font-semibold whitespace-nowrap">
                      <Money v={now} color />
                    </td>
                    <td className="text-right font-semibold">
                      {s.attended}
                      {s.scheduled ? <span className="font-normal text-gray-400">/{s.scheduled}</span> : ""}
                    </td>
                    <td>
                      {s.rate != null && (
                        <div className="flex items-center gap-1.5">
                          <div className="h-2 w-14 overflow-hidden rounded-full bg-gray-100">
                            <div className="h-full bg-green-600" style={{ width: `${Math.round(s.rate * 100)}%` }} />
                          </div>
                          <span className="text-xs">{Math.round(s.rate * 100)}%</span>
                        </div>
                      )}
                    </td>
                    <td className="text-right">{s.rested || ""}</td>
                    <td className={`text-right ${s.noshow ? "font-semibold text-red-600" : ""}`}>{s.noshow || ""}</td>
                    <td className={`text-right ${s.novoteCame ? "font-semibold text-amber-700" : ""}`}>{s.novoteCame || ""}</td>
                    <td className="text-right tabular-nums whitespace-nowrap">{s.fined ? `${fmtMoney(s.fined)} (${s.fineCount})` : ""}</td>
                    <td className="text-right tabular-nums">{s.matchFees ? fmtMoney(s.matchFees) : ""}</td>
                    <td className="text-right tabular-nums pr-4">{s.paidBall ? fmtMoney(s.paidBall) : ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-2 text-xs text-gray-500">
        <b>Quỹ cá nhân</b>: số tiền hiện tại của mỗi người trong quỹ đội, âm (đỏ) là đang nợ. Các cột khác tính trong {label}, chỉ các buổi
        đã chốt tiền. “Đi/buổi”: số buổi đi / số buổi có vote mà người đó thuộc danh sách.
      </p>
    </Card>
  );
}
