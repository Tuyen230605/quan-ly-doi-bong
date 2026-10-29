import type { NextRequest } from "next/server";
import { getActiveTx, getPlayers } from "@/lib/data";
import { balancesAt, getSettledAttendance, playerStats } from "@/lib/summary";
import { teamCtx } from "@/lib/team";
import { pname } from "@/lib/text";

export const dynamic = "force-dynamic";

const cell = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Bảng tổng kết theo thành viên dạng CSV (mở bằng Excel). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const ctx = await teamCtx((await params).slug);
  if (!ctx?.canView) return new Response("Không có quyền", { status: 403 });
  const teamId = ctx.team.id;
  const from = req.nextUrl.searchParams.get("from") ?? undefined;
  const to = req.nextUrl.searchParams.get("to") ?? undefined;
  const [players, txs, { atts, matches }] = await Promise.all([
    getPlayers(teamId),
    getActiveTx(teamId),
    getSettledAttendance(teamId),
  ]);
  const stats = playerStats(atts, matches, txs, from, to);
  const bal = balancesAt(txs, to);
  const header = [
    "Tên",
    "Họ tên",
    "Loại",
    "Buổi có vote",
    "Số buổi đi",
    "Nghỉ",
    "Vote đi mà không đến",
    "Không vote mà đi",
    "Chuyên cần %",
    "Tiền trận",
    "Đã đóng quỹ bóng",
    "Bị phạt",
    "Số lần phạt",
    "Đã nộp phạt",
    "Quỹ cá nhân",
    "Số dư quỹ bóng",
    "Số dư quỹ phạt",
  ];
  const lines = players
    .filter((p) => stats.has(p.id) || (p.type === "member" && p.status === "active"))
    .map((p) => {
      const s = stats.get(p.id);
      const b = bal.get(p.id);
      return [
        pname(p),
        p.fullName,
        p.type === "guest" ? "Khách" : "Thành viên",
        s?.scheduled ?? 0,
        s?.attended ?? 0,
        s?.rested ?? 0,
        s?.noshow ?? 0,
        s?.novoteCame ?? 0,
        s?.rate != null ? Math.round(s.rate * 100) : "",
        s?.matchFees ?? 0,
        s?.paidBall ?? 0,
        s?.fined ?? 0,
        s?.fineCount ?? 0,
        s?.paidPenalty ?? 0,
        (b?.ball ?? 0) + (b?.penalty ?? 0),
        b?.ball ?? 0,
        b?.penalty ?? 0,
      ]
        .map(cell)
        .join(",");
    });
  const csv = "﻿" + [header.map(cell).join(","), ...lines].join("\n");
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="tong-ket-${ctx.team.slug}-${from ?? "all"}-${to ?? "all"}.csv"`,
    },
  });
}
