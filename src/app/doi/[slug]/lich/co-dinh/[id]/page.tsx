import { and, asc, eq, gte } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { saveRoster, setScheduleStatus, updateSchedule } from "@/actions/schedules";
import { ActionForm } from "@/components/ActionForm";
import { ScheduleFields } from "@/components/forms";
import { Badge, Card, Fold, PageTitle } from "@/components/ui";
import { getDb, schema } from "@/db";
import { getPlayers, getVenues } from "@/lib/data";
import { viewCtx } from "@/lib/team";
import { pname } from "@/lib/text";
import { fmtDateTime, fmtMatchDate, todayVN, WEEKDAY_NAMES } from "@/lib/time";

export default async function ScheduleDetailPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const ctx = await viewCtx(params);
  if (!ctx) return null;
  const { team, admin, base } = ctx;
  const id = Number((await params).id);
  const db = await getDb();
  const [s] = await db
    .select()
    .from(schema.schedules)
    .where(and(eq(schema.schedules.id, id), eq(schema.schedules.teamId, team.id)));
  if (!s) notFound();
  const [venues, players, roster, upcoming] = await Promise.all([
    getVenues(team.id),
    getPlayers(team.id),
    db.select().from(schema.schedulePlayers).where(eq(schema.schedulePlayers.scheduleId, id)),
    db
      .select()
      .from(schema.matches)
      .where(and(eq(schema.matches.scheduleId, id), gte(schema.matches.date, todayVN())))
      .orderBy(asc(schema.matches.date))
      .limit(8),
  ]);
  const inRoster = new Set(roster.map((r) => r.playerId));
  const members = players.filter((p) => p.type === "member" && p.status !== "left");

  return (
    <>
      <PageTitle right={<Link href={`${base}/lich/co-dinh`} className="btn btn-sm">← Lịch cố định</Link>}>{s.name}</PageTitle>
      <Card>
        <p className="text-sm">
          {s.voteMode === "going" ? "Vote đi" : "Vote nghỉ"} · hạn chót {WEEKDAY_NAMES[s.deadlineWeekday]} {s.deadlineTime} ·{" "}
          {inRoster.size} thành viên
        </p>
        <h3 className="mt-3 text-sm font-semibold text-gray-700">Các buổi sắp tới</h3>
        <ul className="mt-1 divide-y divide-gray-100 text-sm">
          {upcoming.map((m) => (
            <li key={m.id}>
              <Link href={`${base}/tran/${m.id}`} className="flex justify-between py-1.5">
                <span>
                  {fmtMatchDate(m.date)} · {m.startTime}
                </span>
                <span className="text-gray-500">
                  {m.status === "cancelled" ? (
                    <Badge>Huỷ</Badge>
                  ) : m.voteDeadline ? (
                    `vote đến ${fmtDateTime(m.voteDeadline)}`
                  ) : (
                    ""
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Card>

      {admin && (
        <>
          <Fold summary={`Thành viên của lịch (${inRoster.size})`}>
            <ActionForm action={saveRoster} className="space-y-3">
              <input type="hidden" name="id" value={s.id} />
              <p className="muted">Những người được tick phải vote cho lịch này và được xét phạt khi vắng không báo.</p>
              <div className="grid grid-cols-2 gap-1.5">
                {members.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm has-[:checked]:bg-green-50">
                    <input type="checkbox" name="playerIds" value={p.id} defaultChecked={inRoster.has(p.id)} className="size-4 accent-green-700" />
                    {pname(p)}
                    {p.status === "paused" && <span className="text-xs text-gray-400">(tạm nghỉ)</span>}
                  </label>
                ))}
              </div>
              <button className="btn btn-primary w-full">Lưu danh sách</button>
            </ActionForm>
          </Fold>

          <Fold summary="Sửa lịch">
            <ActionForm action={updateSchedule} className="space-y-4">
              <ScheduleFields s={s} venues={venues} />
              <p className="text-xs text-gray-500">Chỉ áp dụng cho các buổi chưa chốt; phiếu vote đã khoá giữ nguyên hạn cũ.</p>
              <button className="btn btn-primary w-full">Lưu thay đổi</button>
            </ActionForm>
          </Fold>

          <Card title="Trạng thái lịch">
            <div className="flex flex-wrap gap-2">
              {s.status !== "active" && (
                <ActionForm action={setScheduleStatus}>
                  <input type="hidden" name="id" value={s.id} />
                  <button name="status" value="active" className="btn btn-primary">
                    ▶ Tiếp tục lịch
                  </button>
                </ActionForm>
              )}
              {s.status === "active" && (
                <ActionForm action={setScheduleStatus} confirm="Tạm dừng lịch? Các buổi sắp tới chưa chốt sẽ bị huỷ.">
                  <input type="hidden" name="id" value={s.id} />
                  <button name="status" value="paused" className="btn">
                    ⏸ Tạm dừng
                  </button>
                </ActionForm>
              )}
              {s.status !== "ended" && (
                <ActionForm action={setScheduleStatus} confirm="Kết thúc lịch? Các buổi sắp tới chưa chốt sẽ bị huỷ.">
                  <input type="hidden" name="id" value={s.id} />
                  <button name="status" value="ended" className="btn btn-danger">
                    ⏹ Kết thúc lịch
                  </button>
                </ActionForm>
              )}
            </div>
          </Card>
        </>
      )}
    </>
  );
}
