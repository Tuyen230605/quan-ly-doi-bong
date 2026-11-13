import Link from "next/link";
import { OUTCOMES, type Outcome } from "@/lib/labels";
import type { TeamRecord } from "@/lib/record";
import { fmtMatchDate } from "@/lib/time";
import { Card, Empty, Stat } from "./ui";

const FORM_STYLE: Record<Outcome, { letter: string; cls: string }> = {
  win: { letter: "T", cls: "bg-green-600 text-white" },
  draw: { letter: "H", cls: "bg-amber-500 text-white" },
  loss: { letter: "B", cls: "bg-red-600 text-white" },
};

const STREAK_TEXT: Record<Outcome, string> = { win: "thắng", draw: "hoà", loss: "thua" };

/** Thống kê trận của đội ở trang chủ: thắng/hoà/thua, tỉ lệ thắng, chuỗi, phong độ, số người. */
export function TeamStats({
  r,
  missing,
  base,
  admin,
}: {
  r: TeamRecord;
  missing: { id: number; date: string }[]; // buổi đã chốt chưa nhập kết quả, mới nhất trước (admin điền)
  base: string;
  admin: boolean;
}) {
  const total = r.total;
  if (!total) return null;
  const pct = r.winRate != null ? Math.round(r.winRate * 100) : null;
  return (
    <Card title="📈 Thống kê trận" id="thong-ke" right={<Link href={`${base}/lich?tab=da`} className="text-sm text-green-700">Các trận →</Link>}>
      {r.played === 0 ? (
        <Empty>Chưa có trận nào nhập kết quả thắng/hoà/thua.</Empty>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-2 text-center">
            {(
              [
                ["Trận", r.played, "text-gray-900"],
                ["Thắng", r.win, "text-green-700"],
                ["Hoà", r.draw, "text-amber-600"],
                ["Thua", r.loss, "text-red-600"],
              ] as const
            ).map(([label, v, cls]) => (
              <div key={label} className="rounded-xl border border-gray-200 bg-gray-50 py-2">
                <div className={`text-xl font-bold ${cls}`}>{v}</div>
                <div className="text-xs text-gray-500">{label}</div>
              </div>
            ))}
          </div>

          <div className="mt-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tỉ lệ thắng</span>
              <b>{pct}%</b>
            </div>
            <div className="mt-1 flex h-2.5 overflow-hidden rounded-full bg-gray-100">
              <div className="bg-green-600" style={{ width: `${(r.win / r.played) * 100}%` }} />
              <div className="bg-amber-400" style={{ width: `${(r.draw / r.played) * 100}%` }} />
              <div className="bg-red-500" style={{ width: `${(r.loss / r.played) * 100}%` }} />
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 text-sm">
            <span className="text-gray-600">Phong độ gần nhất</span>
            <span className="flex gap-1" aria-label="5 trận gần nhất, mới nhất bên trái">
              {r.form.map((o, i) => (
                <span key={i} title={OUTCOMES[o]} className={`grid size-6 place-items-center rounded-md text-xs font-bold ${FORM_STYLE[o].cls}`}>
                  {FORM_STYLE[o].letter}
                </span>
              ))}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <Stat
              label="Chuỗi hiện tại"
              value={r.current ? `${r.current.length} trận ${STREAK_TEXT[r.current.outcome]}` : "—"}
              sub="tính từ trận gần nhất"
            />
            <Stat label="Chuỗi thắng dài nhất" value={`${r.longestWin} trận`} sub={`bất bại dài nhất: ${r.longestUnbeaten} trận`} />
            {r.scored > 0 && (
              <Stat
                label="Bàn thắng – bàn thua"
                value={`${r.goalsFor} – ${r.goalsAgainst}`}
                sub={`hiệu số ${r.goalsFor - r.goalsAgainst > 0 ? "+" : ""}${r.goalsFor - r.goalsAgainst} (${r.scored} trận có tỉ số)`}
              />
            )}
            <Stat
              label="Số người mỗi buổi"
              value={r.avgPeople != null ? `TB ${Math.round(r.avgPeople * 10) / 10}` : "—"}
              sub={`đông nhất ${r.maxPeople} người · ${total} buổi đã đá`}
            />
          </div>
        </>
      )}

      {admin && missing.length > 0 && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
          <p>
            Còn <b>{missing.length}</b> buổi đã đá chưa nhập kết quả (đá nội bộ thì bỏ qua):
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {missing.slice(0, 6).map((m) => (
              <Link key={m.id} href={`${base}/tran/${m.id}#ket-qua`} className="btn btn-sm">
                {fmtMatchDate(m.date)}
              </Link>
            ))}
            {missing.length > 6 && (
              <Link href={`${base}/lich?tab=da`} className="btn btn-sm">
                +{missing.length - 6} buổi
              </Link>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
