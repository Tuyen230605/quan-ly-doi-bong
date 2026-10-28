import Link from "next/link";
import { createSchedule } from "@/actions/schedules";
import { ActionForm } from "@/components/ActionForm";
import { ScheduleFields } from "@/components/forms";
import { Badge, Card, Empty, Fold, PageTitle } from "@/components/ui";
import { getDb, schema } from "@/db";
import { eq } from "drizzle-orm";
import { getVenues, indexById } from "@/lib/data";
import { viewCtx } from "@/lib/team";
import { WEEKDAY_NAMES, WEEKDAY_SHORT } from "@/lib/time";

const STATUS = { active: ["green", "Đang chạy"], paused: ["amber", "Tạm dừng"], ended: ["gray", "Đã kết thúc"] } as const;

export default async function SchedulesPage({ params }: { params: Promise<{ slug: string }> }) {
  const ctx = await viewCtx(params);
  if (!ctx) return null;
  const { team, admin, base } = ctx;
  const db = await getDb();
  const [venues, list] = await Promise.all([
    getVenues(team.id),
    db.select().from(schema.schedules).where(eq(schema.schedules.teamId, team.id)),
  ]);
  const vs = indexById(venues);
  return (
    <>
      <PageTitle>Lịch cố định</PageTitle>
      <Card>
        {list.length === 0 && <Empty>Chưa có lịch cố định.</Empty>}
        <ul className="divide-y divide-gray-100">
          {list.map((s) => {
            const [tone, label] = STATUS[s.status as keyof typeof STATUS] ?? STATUS.active;
            return (
              <li key={s.id}>
                <Link href={`${base}/lich/co-dinh/${s.id}`} className="flex items-center justify-between gap-2 py-2.5">
                  <div>
                    <div className="font-semibold">{s.name}</div>
                    <div className="text-sm text-gray-600">
                      {[...s.weekdays].sort().map((w) => WEEKDAY_SHORT[w]).join(", ")} · {s.startTime} ·{" "}
                      {s.venueId ? vs.get(s.venueId)?.name : "Chưa chọn sân"}
                    </div>
                    <div className="text-xs text-gray-500">
                      {s.voteMode === "going" ? "Vote đi" : "Vote nghỉ"} · hạn {WEEKDAY_NAMES[s.deadlineWeekday]} {s.deadlineTime}
                    </div>
                  </div>
                  <Badge tone={tone}>{label}</Badge>
                </Link>
              </li>
            );
          })}
        </ul>
      </Card>
      {admin && (
        <Fold summary="+ Tạo lịch cố định mới" open={list.length === 0}>
          <ActionForm action={createSchedule} className="space-y-4" showOk={false}>
            <ScheduleFields venues={venues} />
            <p className="text-xs text-gray-500">Mặc định mọi thành viên đang đá thuộc lịch này; sửa được sau khi tạo.</p>
            <button className="btn btn-primary w-full">Tạo lịch</button>
          </ActionForm>
        </Fold>
      )}
    </>
  );
}
