import { and, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { addDeposit, addExpense, addIncome, adjust, transferFunds } from "@/actions/money";
import { ActionForm } from "@/components/ActionForm";
import { PenaltyForm } from "@/components/PenaltyForm";
import { QrCard } from "@/components/QrCard";
import { TxList } from "@/components/TxList";
import { Card, Field, Fold, Money, PageTitle, Stat, Tabs } from "@/components/ui";
import { getDb, schema } from "@/db";
import { fundCash, getActiveTx, getFunds, getPenaltyTypes, getPlayers, indexById, playerBalances } from "@/lib/data";
import { EXPENSE_CATEGORIES, FUND_NAMES, fmtMoney, type Fund } from "@/lib/money";
import { fundSummary } from "@/lib/summary";
import { viewCtx } from "@/lib/team";
import { pname } from "@/lib/text";
import { fmtMonth, monthRange, todayVN } from "@/lib/time";
import { fundQr } from "@/lib/views";

function DateMethod() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label="Ngày">
        <input className="input" type="date" name="date" defaultValue={todayVN()} />
      </Field>
      <Field label="Hình thức">
        <select className="input" name="method" defaultValue="transfer">
          <option value="transfer">Chuyển khoản</option>
          <option value="cash">Tiền mặt</option>
        </select>
      </Field>
    </div>
  );
}

export default async function FundPage({
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
  const other: Fund = f === "ball" ? "penalty" : "ball";
  const db = await getDb();
  const [players, txs, funds, penaltyTypes, ledger] = await Promise.all([
    getPlayers(team.id),
    getActiveTx(team.id),
    getFunds(team.id),
    getPenaltyTypes(team.id),
    db
      .select()
      .from(schema.transactions)
      .where(and(eq(schema.transactions.teamId, team.id), eq(schema.transactions.fund, f)))
      .orderBy(desc(schema.transactions.date), desc(schema.transactions.id))
      .limit(150),
  ]);
  const ps = indexById(players);
  const ym = todayVN().slice(0, 7);
  const { from, to } = monthRange(ym);
  const month = fundSummary(txs, f, from, to);
  const bal = [...playerBalances(txs).values()].map((b) => b[f]);
  const owed = -bal.filter((v) => v < 0).reduce((s, v) => s + v, 0);
  const prepaid = bal.filter((v) => v > 0).reduce((s, v) => s + v, 0);
  const qr = fundQr(funds[f], { content: f === "ball" ? "QB" : "PHAT" });
  const active = players.filter((p) => p.status !== "left");

  return (
    <>
      <PageTitle>Quỹ</PageTitle>
      <Tabs
        items={[
          { href: `${base}/quy?f=ball`, label: "⚽ Quỹ bóng", active: f === "ball" },
          { href: `${base}/quy?f=penalty`, label: "🚨 Quỹ phạt", active: f === "penalty" },
        ]}
      />
      <Card>
        <div className="text-sm text-gray-500">Tiền {FUND_NAMES[f].toLowerCase()} đang có</div>
        <div className="text-3xl font-bold">
          <Money v={fundCash(txs, f)} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Stat label={`Thu tháng ${fmtMonth(ym)}`} value={fmtMoney(month.totalIncome)} />
          <Stat label={`Chi tháng ${fmtMonth(ym)}`} value={fmtMoney(month.totalExpense)} />
          {f === "penalty" ? (
            <>
              <Stat
                label={`Phạt phát sinh tháng ${fmtMonth(ym)}`}
                value={fmtMoney(month.fined)}
                sub={`đã thu ${fmtMoney(month.deposits)}`}
              />
              <Stat label="Còn nợ phạt (tất cả)" value={fmtMoney(owed)} href={`${base}/cong-no?f=penalty`} />
            </>
          ) : (
            <>
              <Stat label="Thành viên đang nợ" value={fmtMoney(owed)} href={`${base}/cong-no?f=ball`} />
              <Stat label="Thành viên nộp trước" value={fmtMoney(prepaid)} />
            </>
          )}
        </div>
        <Link href={`${base}/tong-ket?m=${ym}`} className="mt-3 block text-center text-sm text-green-700">
          Xem tổng kết tháng →
        </Link>
      </Card>

      {qr.configured ? (
        <Card title="QR chuyển tiền">
          <QrCard
            title={FUND_NAMES[f]}
            payload={qr.payload}
            image={qr.image}
            lines={qr.lines}
            copies={qr.copies}
            fileName={`qr-${f}`}
            size="sm"
          />
        </Card>
      ) : (
        admin && (
          <Card>
            <p className="muted">
              Chưa có tài khoản nhận tiền cho quỹ này.{" "}
              <Link href={`${base}/cai-dat#tai-khoan`} className="text-green-700 underline">
                Cài đặt
              </Link>
            </p>
          </Card>
        )
      )}

      {admin && (
        <div className="space-y-2">
          <Fold summary="+ Ghi nộp tiền" id="nop">
            <ActionForm action={addDeposit} className="space-y-3" reset>
              <input type="hidden" name="fund" value={f} />
              <div>
                <p className="label">Người nộp (chọn nhiều người nếu nộp gộp cùng mức)</p>
                <div className="grid max-h-64 grid-cols-2 gap-1 overflow-y-auto rounded-xl border border-gray-200 p-2">
                  {active.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm has-[:checked]:bg-green-50">
                      <input type="checkbox" name="playerIds" value={p.id} className="size-4 accent-green-700" />
                      {pname(p)}
                      {p.type === "guest" && <span className="text-xs text-gray-400">(khách)</span>}
                    </label>
                  ))}
                </div>
              </div>
              <Field label="Số tiền mỗi người">
                <input className="input" name="amount" inputMode="numeric" placeholder="VD: 200.000" required />
              </Field>
              <DateMethod />
              <Field label="Ghi chú">
                <input className="input" name="note" placeholder="VD: Quỹ tháng 11" />
              </Field>
              <p className="text-xs text-gray-500">Tiền nộp sẽ tự trả cho các trận/khoản phạt đang nợ cũ nhất trước.</p>
              <button className="btn btn-primary w-full">Ghi nộp</button>
            </ActionForm>
          </Fold>

          {f === "penalty" && (
            <Fold summary="+ Phạt (ngoài buổi đá)" id="phat">
              <PenaltyForm
                matchId={null}
                suggestions={[]}
                types={penaltyTypes.filter((t) => t.enabled)}
                players={active.map((p) => ({ id: p.id, name: pname(p) }))}
                memberFee={null}
              />
            </Fold>
          )}

          <Fold summary="+ Ghi khoản chi" id="chi">
            <ActionForm action={addExpense} className="space-y-3" reset>
              <input type="hidden" name="fund" value={f} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Hạng mục">
                  <select className="input" name="category" defaultValue={f === "penalty" ? "Liên hoan" : "Tiền sân"}>
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Số tiền">
                  <input className="input" name="amount" inputMode="numeric" required />
                </Field>
              </div>
              <DateMethod />
              <Field label="Ghi chú">
                <input className="input" name="note" placeholder="VD: Mua 2 quả bóng" />
              </Field>
              <button className="btn btn-primary w-full">Ghi chi</button>
            </ActionForm>
          </Fold>

          <Fold summary="+ Ghi khoản thu khác (tự nhập nguồn)" id="thu">
            <ActionForm action={addIncome} className="space-y-3" reset>
              <input type="hidden" name="fund" value={f} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nguồn thu">
                  <input className="input" name="source" placeholder="VD: Tài trợ, bán áo cũ" required />
                </Field>
                <Field label="Số tiền">
                  <input className="input" name="amount" inputMode="numeric" required />
                </Field>
              </div>
              <DateMethod />
              <Field label="Ghi chú">
                <input className="input" name="note" />
              </Field>
              <button className="btn btn-primary w-full">Ghi thu</button>
            </ActionForm>
          </Fold>

          <Fold summary={`Chuyển tiền sang ${FUND_NAMES[other].toLowerCase()}`}>
            <ActionForm action={transferFunds} className="space-y-3" reset>
              <input type="hidden" name="fund" value={f} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Số tiền">
                  <input className="input" name="amount" inputMode="numeric" required />
                </Field>
                <Field label="Ngày">
                  <input className="input" type="date" name="date" defaultValue={todayVN()} />
                </Field>
              </div>
              <Field label="Ghi chú">
                <input className="input" name="note" placeholder={`VD: Lấy ${FUND_NAMES[f].toLowerCase()} bù ${FUND_NAMES[other].toLowerCase()}`} />
              </Field>
              <button className="btn btn-primary w-full">Chuyển</button>
            </ActionForm>
          </Fold>

          <Fold summary="Điều chỉnh / nhập số dư ban đầu">
            <ActionForm action={adjust} className="space-y-3" reset>
              <input type="hidden" name="fund" value={f} />
              <p className="muted">
                Dùng khi mới bắt đầu dùng web (nhập tiền quỹ đang có, ai đang nợ / đã nộp trước) hoặc khi sổ lệch với thực tế. Nhập số âm
                để trừ.
              </p>
              <Field label="Tiền quỹ thực có thay đổi" hint="VD: 1.500.000 khi quỹ đang có sẵn 1,5 triệu">
                <input className="input" name="cashAmount" inputMode="numeric" placeholder="0" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Cầu thủ (nếu có)">
                  <select className="input" name="playerId" defaultValue="">
                    <option value="">—</option>
                    {active.map((p) => (
                      <option key={p.id} value={p.id}>
                        {pname(p)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Số dư cầu thủ thay đổi" hint="Âm = đang nợ">
                  <input className="input" name="playerAmount" inputMode="numeric" placeholder="VD: -55.000" />
                </Field>
              </div>
              <Field label="Lý do (bắt buộc)">
                <input className="input" name="note" placeholder="VD: Số dư từ sổ cũ" required />
              </Field>
              <button className="btn btn-primary w-full">Lưu điều chỉnh</button>
            </ActionForm>
          </Fold>
        </div>
      )}

      <Card title={`Sổ thu chi ${FUND_NAMES[f].toLowerCase()}`}>
        <TxList txs={ledger} players={ps} admin={!!admin} />
        <Link href={`${base}/lich-su?fund=${f}`} className="mt-2 block text-center text-sm text-green-700">
          Xem toàn bộ, lọc theo ngày →
        </Link>
      </Card>
    </>
  );
}
