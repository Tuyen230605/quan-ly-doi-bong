import { and, asc, desc, eq, gte, inArray, lt, or } from "drizzle-orm";
import Link from "next/link";
import { Badge, Card, Empty, PageTitle, Tabs } from "@/components/ui";
import { getDb, schema } from "@/db";
import { ensureScheduleMatches, getVenues, indexById, matchTotalCost } from "@/lib/data";
import { KIND_LABELS } from "@/lib/labels";
import { fmtMoney } from "@/lib/money";
import { viewCtx } from "@/lib/team";
import { fmtMatchDate, todayVN } from "@/lib/time";

const TABS = { sap: "Sắp tới", da: "Đã đá", huy: "Đã huỷ" } as const;

export default async function SchedulePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const ctx = await viewCtx(params);
  if (!ctx) return null;
  const { team, admin, base } = ctx;
  await ensureScheduleMatches(team.id);
  const tab = ((await searchParams).tab ?? "sap") as keyof typeof TABS;
  const db = await getDb();
  const vs = indexById(await getVenues(team.id));
  const scheds = indexById(await db.select().from(schema.schedules).where(eq(schema.schedules.teamId, team.id)));
  const m = schema.matches;
  const today = todayVN();
  const where =
    tab === "huy"
      ? eq(m.status, "cancelled")
      : tab === "da"
        ? or(eq(m.status, "settled"), and(eq(m.status, "upcoming"), lt(m.date, today)))
        : and(eq(m.status, "upcoming"), gte(m.date, today));
  const list = await db
    .select()
    .from(m)
    .where(and(eq(m.teamId, team.id), where))
    .orderBy(tab === "sap" ? asc(m.date) : desc(m.date), asc(m.startTime))
    .limit(100);
  const counts = new Map<number, number>();
  if (tab === "da") {
    const ids = list.map((x) => x.id);
    const att = ids.length
      ? await db
          .select()
          .from(schema.attendances)
          .where(and(inArray(schema.attendances.matchId, ids), eq(schema.attendances.present, true)))
      : [];
    for (const a of att) counts.set(a.matchId, (counts.get(a.matchId) ?? 0) + 1);
  }

  return (
    <>
      <PageTitle
        right={
          admin && (
            <div className="flex gap-2">
              <Link href={`${base}/lich/co-dinh`} className="btn btn-sm">
                Lịch cố định
              </Link>
              <Link href={`${base}/lich/moi`} className="btn btn-sm btn-primary">
                + Lịch lẻ
              </Link>
            </div>
          )
        }
      >
        Lịch đá
      </PageTitle>
      <Tabs items={Object.entries(TABS).map(([k, label]) => ({ href: `${base}/lich?tab=${k}`, label, active: tab === k }))} />
      <Card>
        {list.length === 0 && <Empty>Không có buổi nào.</Empty>}
        <ul className="divide-y divide-gray-100">
          {list.map((x) => {
            const pending = x.status === "upcoming" && x.date < today;
            return (
              <li key={x.id}>
                <Link href={`${base}/tran/${x.id}`} className="flex items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <div className="font-semibold">
                      {fmtMatchDate(x.date)} · {x.startTime}
                    </div>
                    <div className="truncate text-sm text-gray-600">
                      {x.scheduleId ? scheds.get(x.scheduleId)?.name : KIND_LABELS[x.kind]}
                      {x.opponent ? ` vs ${x.opponent}` : ""} · {x.venueId ? vs.get(x.venueId)?.name : "Chưa chọn sân"}
                    </div>
                    {x.status === "cancelled" && <div className="text-xs text-gray-500">Lý do: {x.cancelReason}</div>}
                  </div>
                  <div className="shrink-0 text-right">
                    {x.status === "settled" && (
                      <>
                        <Badge tone="green">Đã chốt</Badge>
                        <div className="mt-0.5 text-xs text-gray-500">
                          {counts.get(x.id) ?? 0} người · {fmtMoney(matchTotalCost(x))}
                        </div>
                      </>
                    )}
                    {pending && <Badge tone="amber">Chưa chốt tiền</Badge>}
                    {x.status === "upcoming" && !pending && <Badge tone="blue">Sắp đá</Badge>}
                    {x.status === "cancelled" && <Badge>Đã huỷ</Badge>}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </Card>
    </>
  );
}
