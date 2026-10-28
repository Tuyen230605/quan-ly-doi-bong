import { and, desc, eq, gte, ilike, lte, type SQL } from "drizzle-orm";
import { TxList } from "@/components/TxList";
import { Card, Empty, Field, PageTitle, Tabs } from "@/components/ui";
import { getDb, schema } from "@/db";
import { getPlayers, indexById } from "@/lib/data";
import { TX_TYPES } from "@/lib/money";
import { viewCtx } from "@/lib/team";
import { pname } from "@/lib/text";
import { fmtDateTime } from "@/lib/time";

type SP = { tab?: string; fund?: string; type?: string; player?: string; from?: string; to?: string; q?: string };

export default async function HistoryPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<SP> }) {
  const ctx = await viewCtx(params);
  if (!ctx) return null;
  const { team, admin, base } = ctx;
  const sp = await searchParams;
  const tab = sp.tab === "nk" ? "nk" : "gd";
  const db = await getDb();
  const players = await getPlayers(team.id);
  const t = schema.transactions;
  const where: SQL[] = [eq(t.teamId, team.id)];
  if (sp.fund === "ball" || sp.fund === "penalty") where.push(eq(t.fund, sp.fund));
  if (sp.type && sp.type in TX_TYPES) where.push(eq(t.type, sp.type));
  if (sp.player) where.push(eq(t.playerId, Number(sp.player)));
  if (sp.from) where.push(gte(t.date, sp.from));
  if (sp.to) where.push(lte(t.date, sp.to));
  if (sp.q) where.push(ilike(t.note, `%${sp.q}%`));

  const txs =
    tab === "gd"
      ? await db
          .select()
          .from(t)
          .where(and(...where))
          .orderBy(desc(t.date), desc(t.id))
          .limit(300)
      : [];
  const logs =
    tab === "nk"
      ? await db
          .select()
          .from(schema.auditLogs)
          .where(eq(schema.auditLogs.teamId, team.id))
          .orderBy(desc(schema.auditLogs.id))
          .limit(300)
      : [];

  return (
    <>
      <PageTitle>Lịch sử</PageTitle>
      <Tabs
        items={[
          { href: `${base}/lich-su`, label: "Giao dịch", active: tab === "gd" },
          { href: `${base}/lich-su?tab=nk`, label: "Nhật ký thao tác", active: tab === "nk" },
        ]}
      />
      {tab === "gd" ? (
        <>
          <Card>
            <form method="get" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Field label="Quỹ">
                <select className="input" name="fund" defaultValue={sp.fund ?? ""}>
                  <option value="">Cả 2 quỹ</option>
                  <option value="ball">Quỹ bóng</option>
                  <option value="penalty">Quỹ phạt</option>
                </select>
              </Field>
              <Field label="Loại">
                <select className="input" name="type" defaultValue={sp.type ?? ""}>
                  <option value="">Tất cả</option>
                  {Object.entries(TX_TYPES).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Cầu thủ">
                <select className="input" name="player" defaultValue={sp.player ?? ""}>
                  <option value="">Tất cả</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {pname(p)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Từ ngày">
                <input className="input" type="date" name="from" defaultValue={sp.from ?? ""} />
              </Field>
              <Field label="Đến ngày">
                <input className="input" type="date" name="to" defaultValue={sp.to ?? ""} />
              </Field>
              <Field label="Ghi chú có chữ">
                <input className="input" name="q" defaultValue={sp.q ?? ""} />
              </Field>
              <button className="btn btn-primary col-span-2 sm:col-span-3">Lọc</button>
            </form>
          </Card>
          <Card title={`${txs.length}${txs.length === 300 ? "+" : ""} giao dịch`}>
            <TxList txs={txs} players={indexById(players)} admin={!!admin} showFund />
          </Card>
        </>
      ) : (
        <Card>
          {logs.length === 0 && <Empty>Chưa có thao tác nào.</Empty>}
          <ul className="divide-y divide-gray-100">
            {logs.map((l) => (
              <li key={l.id} className="py-2 text-sm">
                <div>
                  <b>{l.actorName}</b>
                  {l.actorType === "admin" && <span className="text-xs text-gray-400"> (admin)</span>} · {l.action}
                </div>
                <div className="text-xs text-gray-500">
                  {fmtDateTime(l.createdAt)}
                  {l.detail ? ` · ${l.detail}` : ""}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
