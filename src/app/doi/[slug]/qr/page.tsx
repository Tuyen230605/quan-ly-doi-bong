import Link from "next/link";
import { Qr } from "@/components/Qr";
import { Card, Field, PageTitle } from "@/components/ui";
import { getFunds, getPlayers, indexById } from "@/lib/data";
import { FUND_NAMES, fmtMoney, parseMoney, type Fund } from "@/lib/money";
import { viewCtx } from "@/lib/team";
import { compactName, pname } from "@/lib/text";
import { todayVN } from "@/lib/time";
import { defaultContent, fundQr } from "@/lib/views";

type SP = { fund?: string; player?: string; amount?: string; content?: string };

export default async function QrPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<SP> }) {
  const ctx = await viewCtx(params);
  if (!ctx) return null;
  const { team, admin, base } = ctx;
  const sp = await searchParams;
  const [players, funds] = await Promise.all([getPlayers(team.id), getFunds(team.id)]);
  const f: Fund = sp.fund === "penalty" ? "penalty" : "ball";
  const player = sp.player ? indexById(players).get(Number(sp.player)) : undefined;
  const amount = parseMoney(sp.amount) || null;
  const month = Number(todayVN().slice(5, 7));
  const content =
    sp.content?.trim() || defaultContent(f, player ? pname(player) : null, f === "ball" && !amount ? `T${month}` : undefined);
  const qr = fundQr(funds[f], { amount, content });
  const title = `${FUND_NAMES[f]}${player ? ` · ${pname(player)}` : ""}`;
  const members = players.filter((p) => p.status !== "left");

  return (
    <>
      <PageTitle>Tạo QR chuyển tiền</PageTitle>
      <Card>
        <form className="space-y-3" method="get">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Quỹ">
              <select className="input" name="fund" defaultValue={f}>
                <option value="ball">Quỹ bóng</option>
                <option value="penalty">Quỹ phạt</option>
              </select>
            </Field>
            <Field label="Người nộp">
              <select className="input" name="player" defaultValue={player?.id ?? ""}>
                <option value="">Cả đội (QR chung)</option>
                {members.map((p) => (
                  <option key={p.id} value={p.id}>
                    {pname(p)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Số tiền" hint="Để trống: người chuyển tự nhập">
              <input className="input" name="amount" inputMode="numeric" defaultValue={amount ? amount.toLocaleString("vi-VN") : ""} />
            </Field>
            <Field label="Nội dung" hint="Không dấu, tối đa 25 ký tự">
              <input className="input" name="content" defaultValue={sp.content ?? ""} placeholder={qr.content ?? ""} />
            </Field>
          </div>
          <button className="btn btn-primary w-full">Tạo QR</button>
        </form>
      </Card>

      <Card>
        {qr.payload ? (
          <Qr
            title={title}
            payload={qr.payload}
            lines={qr.lines}
            copies={qr.copies}
            fileName={`qr-${f}${player ? `-${compactName(pname(player))}` : ""}`}
          />
        ) : qr.image ? (
          <>
            <Qr title={title} payload={null} image={qr.image} lines={[...qr.lines, ...(amount ? [`Số tiền: ${fmtMoney(amount)}`] : [])]} copies={qr.copies} fileName={`qr-${f}`} />
            <p className="mt-2 text-center text-xs text-gray-500">
              Web chưa đọc được số tài khoản từ ảnh QR này nên không điền sẵn số tiền được. Admin có thể nhập ngân hàng + số tài khoản trong Cài đặt.
            </p>
          </>
        ) : (
          <p className="muted">
            Chưa cấu hình tài khoản nhận tiền cho {FUND_NAMES[f].toLowerCase()}.{" "}
            {admin && (
              <Link href={`${base}/cai-dat#tai-khoan`} className="text-green-700 underline">
                Vào Cài đặt
              </Link>
            )}
          </p>
        )}
        <p className="mt-3 text-center text-xs text-gray-500">
          Tạo QR không có nghĩa là đã thu tiền. Khi tiền về, admin bấm “Đã trả” để ghi nhận.
        </p>
      </Card>
    </>
  );
}
