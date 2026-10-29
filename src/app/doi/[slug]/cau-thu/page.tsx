import Link from "next/link";
import { bulkAddPlayers, savePlayer } from "@/actions/players";
import { ActionForm } from "@/components/ActionForm";
import { PlayerFields } from "@/components/forms";
import { Badge, Card, Empty, Field, Fold, Money, PageTitle, Tabs } from "@/components/ui";
import { getActiveTx, getPlayers, personal, playerBalances } from "@/lib/data";
import { POSITIONS } from "@/lib/labels";
import { getSettledAttendance, playerStats } from "@/lib/summary";
import { viewCtx } from "@/lib/team";
import { pname } from "@/lib/text";

const TABS = { tv: "Thành viên", khach: "Khách", nghi: "Đã nghỉ" } as const;

export default async function PlayersPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const ctx = await viewCtx(params);
  if (!ctx) return null;
  const { team, admin, base } = ctx;
  const tab = ((await searchParams).tab ?? "tv") as keyof typeof TABS;
  const [players, txs, { atts, matches }] = await Promise.all([
    getPlayers(team.id),
    getActiveTx(team.id),
    getSettledAttendance(team.id),
  ]);
  const bal = playerBalances(txs);
  const stats = playerStats(atts, matches, txs);
  const list = players.filter((p) =>
    tab === "khach" ? p.type === "guest" && p.status !== "left" : tab === "nghi" ? p.status === "left" : p.type === "member" && p.status !== "left",
  );
  const members = players.filter((p) => p.type === "member" && p.status !== "left");

  return (
    <>
      <PageTitle>Cầu thủ</PageTitle>
      <Tabs items={Object.entries(TABS).map(([k, label]) => ({ href: `${base}/cau-thu?tab=${k}`, label, active: tab === k }))} />
      <Card>
        {list.length === 0 && <Empty>Chưa có ai.</Empty>}
        <ul className="divide-y divide-gray-100">
          {list.map((p) => {
            const b = bal.get(p.id) ?? { ball: 0, penalty: 0 };
            const s = stats.get(p.id);
            return (
              <li key={p.id}>
                <Link href={`${base}/cau-thu/${p.id}`} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <div className="font-semibold">
                      {p.jerseyNo != null && <span className="mr-1 text-gray-400">#{p.jerseyNo}</span>}
                      {pname(p)}
                      {p.status === "paused" && (
                        <span className="ml-1.5">
                          <Badge tone="amber">Tạm nghỉ</Badge>
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {p.nickname ? `${p.fullName} · ` : ""}
                      {p.position ? `${POSITIONS[p.position]} · ` : ""}
                      {s?.attended ?? 0} trận
                      {s?.rate != null ? ` · chuyên cần ${Math.round(s.rate * 100)}%` : ""}
                      {s?.noshow ? ` · vote đi không đến ${s.noshow}` : ""}
                      {s?.novoteCame ? ` · không vote mà đi ${s.novoteCame}` : ""}
                    </div>
                  </div>
                  <div className="shrink-0 text-right text-sm">
                    <div className="text-xs text-gray-500">Quỹ cá nhân</div>
                    <Money v={personal(b)} color className="font-semibold" />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-xs text-gray-500">
          Quỹ cá nhân = tiền đã nộp − tiền trận − tiền phạt. Âm (đỏ) là đang nợ, dương (xanh) là còn tiền trong quỹ.
        </p>
      </Card>

      {admin && (
        <>
          <Fold summary="+ Thêm cầu thủ">
            <ActionForm action={savePlayer} className="space-y-3" reset>
              <PlayerFields members={members} />
              <button className="btn btn-primary w-full">Thêm</button>
            </ActionForm>
          </Fold>
          <Fold summary="+ Thêm nhanh nhiều người">
            <ActionForm action={bulkAddPlayers} className="space-y-3" reset>
              <Field label="Danh sách tên" hint="Mỗi dòng 1 người. Có thể copy thẳng từ nhóm Zalo.">
                <textarea className="input min-h-40" name="names" placeholder={"Nguyễn Văn An\nTrần Bình\nLê Cường"} />
              </Field>
              <Field label="Loại">
                <select className="input" name="type" defaultValue="member">
                  <option value="member">Thành viên</option>
                  <option value="guest">Khách</option>
                </select>
              </Field>
              <button className="btn btn-primary w-full">Thêm tất cả</button>
            </ActionForm>
          </Fold>
        </>
      )}
    </>
  );
}
