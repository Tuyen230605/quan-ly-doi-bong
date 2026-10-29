import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { markRequestPaid, setPaymentRequestStatus, unmarkRequestPaid } from "@/actions/requests";
import { ActionForm } from "@/components/ActionForm";
import { ChooseMe } from "@/components/ChooseMe";
import { CopyButton } from "@/components/CopyButton";
import { Qr } from "@/components/Qr";
import { Badge, Card, Money, PageTitle } from "@/components/ui";
import { getDb, schema } from "@/db";
import { getActiveTx, getFunds, getPlayers, personal, playerBalances } from "@/lib/data";
import { FUND_NAMES, fmtMoney, type Fund } from "@/lib/money";
import { viewCtx } from "@/lib/team";
import { pname } from "@/lib/text";
import { bankName } from "@/lib/vietqr";
import { fundQr, requestContent, siteOrigin } from "@/lib/views";

/**
 * Trang nộp tiền theo link admin gửi. Thành viên phải chọn tên trước (nội dung chuyển khoản là tên họ),
 * rồi thấy ngay mã QR có sẵn số tiền + nội dung để quét bằng app ngân hàng.
 */
export default async function PayRequestPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const ctx = await viewCtx(params);
  if (!ctx) return null;
  const { team, admin, me, base } = ctx;
  const id = Number((await params).id);
  const db = await getDb();
  const [r] = await db
    .select()
    .from(schema.paymentRequests)
    .where(and(eq(schema.paymentRequests.id, id), eq(schema.paymentRequests.teamId, team.id)));
  if (!r) notFound();
  const [players, txs, funds, origin] = await Promise.all([getPlayers(team.id), getActiveTx(team.id), getFunds(team.id), siteOrigin()]);
  const fund = funds[r.fund as Fund];
  const paidIds = new Set(txs.filter((t) => t.requestId === r.id && t.type === "deposit").map((t) => t.playerId));
  const bal = playerBalances(txs);
  const members = players.filter((p) => p.type === "member" && p.status !== "left");
  const path = `${base}/nop/${r.id}`;
  const open = r.status === "open";

  const content = me ? requestContent(r.note, pname(me)) : "";
  const qr = me ? fundQr(fund, { amount: r.amount, content }) : null;
  const share = [
    `💳 ${team.name}: ${r.title} – ${fmtMoney(r.amount)}/người`,
    `Bấm link, chọn tên mình là hiện mã QR có sẵn số tiền, nội dung là tên bạn. Quét bằng app ngân hàng để chuyển:`,
    `${origin}${path}`,
  ].join("\n");

  return (
    <>
      <PageTitle right={<Link href={`${base}/nop`} className="btn btn-sm">← Link nộp tiền</Link>}>{r.title}</PageTitle>
      <Card>
        <div className="flex items-end justify-between gap-2">
          <div>
            <div className="text-sm text-gray-500">Số tiền</div>
            <div className="text-3xl font-bold tabular-nums">{fmtMoney(r.amount)}</div>
          </div>
          {open ? <Badge tone="amber">Đang thu</Badge> : <Badge>Đã đóng</Badge>}
        </div>
        <div className="mt-1 text-sm text-gray-600">Vào {r.fund === "ball" ? "quỹ cá nhân (quỹ bóng)" : FUND_NAMES.penalty.toLowerCase()}</div>
      </Card>

      {!open ? (
        <Card>
          <p className="muted">Link này đã đóng, không thu nữa.</p>
        </Card>
      ) : !me ? (
        <Card title="Chọn tên của bạn trước">
          <p className="muted mb-3">Nội dung chuyển khoản sẽ là tên của bạn để thủ quỹ biết ai đã nộp.</p>
          <ChooseMe members={members} me={null} requirePin={team.requirePin} next={path} />
        </Card>
      ) : paidIds.has(me.id) ? (
        <Card className="border-green-200 bg-green-50/60">
          <p className="font-semibold text-green-800">✅ {pname(me)} đã nộp. Thủ quỹ đã xác nhận.</p>
          <p className="mt-1 text-sm">
            Quỹ cá nhân của bạn: <Money v={personal(bal.get(me.id))} color className="font-semibold" />
          </p>
        </Card>
      ) : (
        <Card title={`Nộp cho ${pname(me)}`}>
          {qr?.configured ? (
            <Qr title={r.title} payload={qr.payload} image={qr.image} lines={qr.lines} fileName={`nop-${r.id}`} actions={false} caption={false} />
          ) : (
            <p className="text-sm text-amber-700">Admin chưa cài tài khoản nhận tiền cho quỹ này. Nhắn admin.</p>
          )}
          <dl className="mt-3 grid grid-cols-[6.5rem_1fr] gap-x-2 gap-y-1 rounded-xl bg-gray-50 p-3 text-sm">
            <dt className="text-gray-500">Số tiền</dt>
            <dd className="font-semibold tabular-nums">{fmtMoney(r.amount)}</dd>
            <dt className="text-gray-500">Nội dung</dt>
            <dd className="font-mono font-semibold" data-content>
              {content}
            </dd>
            {fund.accountNo && (
              <>
                <dt className="text-gray-500">Tài khoản nhận</dt>
                <dd>
                  {bankName(fund.bankBin)} · <span className="font-mono">{fund.accountNo}</span>
                  {fund.accountName && <span className="block text-xs text-gray-500">{fund.accountName}</span>}
                </dd>
              </>
            )}
          </dl>
          {qr && !qr.payload && qr.image && (
            <p className="mt-2 text-sm text-amber-700">Mã này chưa có sẵn số tiền: nhập số tiền và nội dung như trên khi chuyển.</p>
          )}
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-gray-700">
            <li>
              Mở app ngân hàng → <b>Quét QR</b> → quét mã trên.
            </li>
            <li>
              Đang xem bằng chính điện thoại này: <b>chụp màn hình</b> (hoặc nhấn giữ ảnh mã → Lưu ảnh), rồi trong app ngân hàng bấm Quét QR →
              chọn ảnh từ thư viện.
            </li>
            <li>Kiểm tra đúng số tiền, nội dung rồi chuyển. Thủ quỹ xác nhận khi tiền về.</li>
          </ol>
          <p className="mt-3 text-center text-xs text-gray-500">
            Không phải {pname(me)}?{" "}
            <Link href={`${base}/toi?next=${encodeURIComponent(path)}`} className="underline">
              Đổi tên
            </Link>
          </p>
        </Card>
      )}

      {admin && (
        <Card
          title={`Ai đã nộp (${members.filter((p) => paidIds.has(p.id)).length}/${members.length})`}
          right={<CopyButton text={share} label="Copy link gửi nhóm" className="btn btn-sm btn-primary" />}
        >
          <ul className="divide-y divide-gray-100">
            {members.map((p) => (
              <li key={p.id} data-player={pname(p)} className="flex items-center justify-between gap-2 py-2 text-sm">
                <div className="min-w-0">
                  <div className="font-medium">{pname(p)}</div>
                  <div className="text-xs text-gray-500">
                    ND: {requestContent(r.note, pname(p))} · quỹ <Money v={personal(bal.get(p.id))} color />
                  </div>
                </div>
                {paidIds.has(p.id) ? (
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge tone="green">✅ Đã nộp</Badge>
                    <ActionForm action={unmarkRequestPaid} showOk={false}>
                      <input type="hidden" name="requestId" value={r.id} />
                      <input type="hidden" name="playerId" value={p.id} />
                      <button className="text-xs text-gray-500 underline">Bỏ</button>
                    </ActionForm>
                  </div>
                ) : (
                  <ActionForm action={markRequestPaid} className="shrink-0" showOk={false}>
                    <input type="hidden" name="requestId" value={r.id} />
                    <input type="hidden" name="playerId" value={p.id} />
                    <button className="btn btn-sm btn-primary">Đã nhận</button>
                  </ActionForm>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-gray-500">
            Thấy tiền về tài khoản (nội dung là tên người nộp) thì bấm <b>Đã nhận</b>: tiền được cộng vào{" "}
            {r.fund === "ball" ? "quỹ cá nhân của người đó" : "quỹ phạt"}.
          </p>
          <ActionForm action={setPaymentRequestStatus} className="mt-3" showOk={false}>
            <input type="hidden" name="id" value={r.id} />
            <input type="hidden" name="status" value={open ? "closed" : "open"} />
            <button className="btn btn-sm">{open ? "Đóng link (thu xong)" : "Mở lại link"}</button>
          </ActionForm>
        </Card>
      )}
    </>
  );
}
