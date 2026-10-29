import Link from "next/link";
import { createPaymentRequest } from "@/actions/requests";
import { ActionForm } from "@/components/ActionForm";
import { Badge, Card, Empty, Field, PageTitle } from "@/components/ui";
import { getActiveTx, getFunds, getPaymentRequests, getPlayers } from "@/lib/data";
import { FUND_NAMES, fmtMoney, type Fund } from "@/lib/money";
import { viewCtx } from "@/lib/team";
import { fmtDate, vnParts } from "@/lib/time";

export default async function PayRequestsPage({ params }: { params: Promise<{ slug: string }> }) {
  const ctx = await viewCtx(params);
  if (!ctx) return null;
  const { team, admin, me, base } = ctx;
  const [requests, txs, funds, players] = await Promise.all([
    getPaymentRequests(team.id),
    getActiveTx(team.id),
    getFunds(team.id),
    getPlayers(team.id),
  ]);
  const paid = new Map<number, Set<number>>();
  for (const t of txs)
    if (t.requestId && t.type === "deposit" && t.playerId != null)
      paid.set(t.requestId, (paid.get(t.requestId) ?? new Set()).add(t.playerId));
  const memberCount = players.filter((p) => p.type === "member" && p.status === "active").length;
  const list = admin ? requests : requests.filter((r) => r.status === "open");
  const noAccount = (["ball", "penalty"] as Fund[]).filter((f) => !funds[f].bankBin || !funds[f].accountNo);

  return (
    <>
      <PageTitle>Link nộp tiền</PageTitle>
      {admin && (
        <Card title="Tạo link nộp tiền">
          <p className="muted mb-3">
            Gửi link vào nhóm Zalo. Thành viên bấm link, chọn tên mình, chọn app ngân hàng là chuyển được luôn: số tiền điền sẵn, nội
            dung là tên người nộp.
          </p>
          <ActionForm action={createPaymentRequest} className="space-y-3">
            <Field label="Nộp tiền gì">
              <input className="input" name="title" placeholder="VD: Quỹ tháng 11" maxLength={80} required />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Số tiền mỗi người">
                <input className="input" name="amount" inputMode="numeric" placeholder="VD: 200.000" required />
              </Field>
              <Field label="Vào quỹ">
                <select className="input" name="fund" defaultValue="ball">
                  <option value="ball">Quỹ cá nhân (quỹ bóng)</option>
                  <option value="penalty">Quỹ phạt</option>
                </select>
              </Field>
            </div>
            <Field label="Thêm vào nội dung (không bắt buộc)" hint="Nội dung chuyển khoản = tên người nộp + chữ này, VD: AN T11">
              <input className="input" name="note" placeholder="VD: T11" maxLength={12} />
            </Field>
            {noAccount.length > 0 && (
              <p className="text-xs text-amber-700">
                Chưa có số tài khoản cho {noAccount.map((f) => FUND_NAMES[f].toLowerCase()).join(", ")}: link sẽ không mở được app ngân
                hàng.{" "}
                <Link href={`${base}/cai-dat#tai-khoan`} className="underline">
                  Cài đặt
                </Link>
              </p>
            )}
            <button className="btn btn-primary w-full">Tạo link</button>
          </ActionForm>
        </Card>
      )}

      <Card title={admin ? "Các link đã tạo" : "Cần nộp"}>
        {list.length === 0 && <Empty>Chưa có link nộp tiền nào.</Empty>}
        <ul className="divide-y divide-gray-100">
          {list.map((r) => {
            const done = paid.get(r.id);
            return (
              <li key={r.id}>
                <Link href={`${base}/nop/${r.id}`} className="flex items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <div className="font-semibold">{r.title}</div>
                    <div className="text-xs text-gray-500">
                      {FUND_NAMES[r.fund as Fund]} · tạo {fmtDate(vnParts(r.createdAt).date)}
                      {admin ? ` · ${done?.size ?? 0}/${memberCount} đã nộp` : ""}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="font-semibold tabular-nums">{fmtMoney(r.amount)}</span>
                    {r.status === "closed" ? (
                      <Badge>Đã đóng</Badge>
                    ) : me && done?.has(me.id) ? (
                      <Badge tone="green">✅ Bạn đã nộp</Badge>
                    ) : (
                      <Badge tone="amber">Đang thu</Badge>
                    )}
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
