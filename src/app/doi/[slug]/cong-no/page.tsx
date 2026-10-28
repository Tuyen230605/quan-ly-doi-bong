import Link from "next/link";
import { addDeposit } from "@/actions/money";
import { ActionForm } from "@/components/ActionForm";
import { CopyButton } from "@/components/CopyButton";
import { Card, Empty, Money, PageTitle, Tabs } from "@/components/ui";
import { getActiveTx, getPlayers, playerBalances } from "@/lib/data";
import { FUND_NAMES, fmtMoney, type Fund } from "@/lib/money";
import { viewCtx } from "@/lib/team";
import { pname } from "@/lib/text";
import { fmtDM, todayVN } from "@/lib/time";
import { siteOrigin } from "@/lib/views";

export default async function DebtPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ f?: string }>;
}) {
  const ctx = await viewCtx(params);
  if (!ctx) return null;
  const { team, admin, base } = ctx;
  const f: Fund = (await searchParams).f === "penalty" ? "penalty" : "ball";
  const [players, txs, origin] = await Promise.all([getPlayers(team.id), getActiveTx(team.id), siteOrigin()]);
  const bal = playerBalances(txs);
  const debtors = players
    .map((p) => ({ p, debt: -(bal.get(p.id)?.[f] ?? 0) }))
    .filter((x) => x.debt > 0)
    .sort((a, b) => b.debt - a.debt);
  const total = debtors.reduce((s, x) => s + x.debt, 0);
  const reminder = [
    `📢 Công nợ ${FUND_NAMES[f].toLowerCase()} (đến ${fmtDM(todayVN())}):`,
    ...debtors.map((x) => `- ${pname(x.p)}: ${fmtMoney(x.debt)}`),
    `Tổng: ${fmtMoney(total)}. Xem & lấy QR chuyển khoản: ${origin}${base}/cong-no?f=${f}`,
  ].join("\n");

  return (
    <>
      <PageTitle right={admin && debtors.length > 0 && <CopyButton text={reminder} label="Copy tin nhắc nợ" />}>
        Công nợ
      </PageTitle>
      <Tabs
        items={[
          { href: `${base}/cong-no?f=ball`, label: "⚽ Quỹ bóng", active: f === "ball" },
          { href: `${base}/cong-no?f=penalty`, label: "🚨 Quỹ phạt", active: f === "penalty" },
        ]}
      />
      <Card title={`${debtors.length} người đang nợ`} right={<b className="text-red-600">{fmtMoney(total)}</b>}>
        {debtors.length === 0 && <Empty>Không ai nợ 🎉</Empty>}
        <ul className="divide-y divide-gray-100">
          {debtors.map(({ p, debt }) => (
            <li key={p.id} className="py-2">
              <div className="flex items-center justify-between gap-2">
                <Link href={`${base}/cau-thu/${p.id}`} className="font-medium">
                  {pname(p)}
                </Link>
                <Money v={-debt} color className="font-semibold" />
              </div>
              <div className="mt-1 flex flex-wrap items-center justify-end gap-1.5">
                <Link href={`${base}/qr?fund=${f}&player=${p.id}&amount=${debt}`} className="btn btn-sm">
                  QR {f === "ball" ? "trả nợ" : "nộp phạt"}
                </Link>
                {admin && (
                  <ActionForm action={addDeposit} className="flex items-center gap-1" showOk={false}>
                    <input type="hidden" name="fund" value={f} />
                    <input type="hidden" name="playerIds" value={p.id} />
                    <input className="input !w-28 !py-1 text-right !text-sm" name="amount" inputMode="numeric" defaultValue={debt.toLocaleString("vi-VN")} />
                    <select name="method" className="input !w-auto !py-1 !text-xs" defaultValue="transfer">
                      <option value="transfer">CK</option>
                      <option value="cash">Tiền mặt</option>
                    </select>
                    <button className="btn btn-sm btn-primary">Đã trả</button>
                  </ActionForm>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
