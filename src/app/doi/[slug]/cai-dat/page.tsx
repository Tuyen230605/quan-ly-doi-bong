import { eq } from "drizzle-orm";
import { saveFund, savePenaltyType, saveVenue } from "@/actions/settings";
import { addTeamAdmin, changeTeamPassword, removeTeamAdmin, saveTeamSettings } from "@/actions/teams";
import { ActionForm } from "@/components/ActionForm";
import { BankQrFields } from "@/components/BankQrFields";
import { CopyButton } from "@/components/CopyButton";
import { QrCard } from "@/components/QrCard";
import { Card, Field, Fold, PageTitle } from "@/components/ui";
import { getDb, schema } from "@/db";
import { getFunds, getPenaltyTypes, getVenues, type PenaltyType, type Venue } from "@/lib/data";
import { FUND_NAMES, SPLIT_METHODS, type Fund } from "@/lib/money";
import { viewCtx } from "@/lib/team";
import { fundQr, siteOrigin } from "@/lib/views";

const money = (v: number) => (v ? v.toLocaleString("vi-VN") : "");

function PenaltyTypeForm({ t }: { t?: PenaltyType }) {
  return (
    <ActionForm action={savePenaltyType} className="space-y-2" reset={!t}>
      {t && <input type="hidden" name="id" value={t.id} />}
      <div className="grid grid-cols-2 gap-2">
        <input className="input" name="name" defaultValue={t?.name ?? ""} placeholder="Tên lỗi" required />
        <select className="input" name="amountMode" defaultValue={t?.amountMode ?? "fixed"}>
          <option value="fixed">Mức cố định</option>
          <option value="match_fee">Bằng tiền trận mỗi người</option>
        </select>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <input className="input !w-32" name="defaultAmount" inputMode="numeric" defaultValue={money(t?.defaultAmount ?? 0)} placeholder="Mức phạt" />
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" name="isNoShow" defaultChecked={t?.isNoShow} className="accent-green-700" /> Dùng cho “vắng không báo”
        </label>
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" name="enabled" defaultChecked={t?.enabled ?? true} className="accent-green-700" /> Đang dùng
        </label>
        <button className="btn btn-sm btn-primary ml-auto">{t ? "Lưu" : "Thêm"}</button>
      </div>
    </ActionForm>
  );
}

function VenueForm({ v }: { v?: Venue }) {
  return (
    <ActionForm action={saveVenue} className="space-y-2" reset={!v}>
      {v && <input type="hidden" name="id" value={v.id} />}
      <div className="grid grid-cols-2 gap-2">
        <input className="input" name="name" defaultValue={v?.name ?? ""} placeholder="Tên sân" required />
        <input className="input" name="address" defaultValue={v?.address ?? ""} placeholder="Địa chỉ" />
      </div>
      <div className="flex gap-2">
        <input className="input" name="mapUrl" defaultValue={v?.mapUrl ?? ""} placeholder="Link Google Maps" />
        <button className="btn btn-sm btn-primary shrink-0">{v ? "Lưu" : "Thêm"}</button>
      </div>
    </ActionForm>
  );
}

export default async function SettingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const ctx = await viewCtx(params);
  if (!ctx) return null;
  const { team, admin, base } = ctx;
  if (!admin) return <Card>Chỉ admin của đội xem được trang này.</Card>;
  const db = await getDb();
  const [funds, penaltyTypes, venues, admins, origin] = await Promise.all([
    getFunds(team.id),
    getPenaltyTypes(team.id),
    getVenues(team.id),
    db
      .select({ user: schema.users, role: schema.teamAdmins.role })
      .from(schema.teamAdmins)
      .innerJoin(schema.users, eq(schema.users.id, schema.teamAdmins.userId))
      .where(eq(schema.teamAdmins.teamId, team.id)),
    siteOrigin(),
  ]);
  const invite = `⚽ Đội ${team.name}\nVào xem lịch, vote, quỹ: ${origin}${base}\nMật khẩu đội: (admin gửi riêng)`;

  return (
    <>
      <PageTitle>Cài đặt đội</PageTitle>

      <Card title="🔑 Thành viên vào đội">
        <p className="muted">
          Thành viên vào trang đầu, gõ tên đội <b>{team.name}</b> và mật khẩu đội. Hoặc mở thẳng link dưới đây rồi nhập mật khẩu.
        </p>
        <div className="mt-2 break-all rounded-lg bg-gray-50 p-2 font-mono text-sm">
          {origin}
          {base}
        </div>
        <div className="mt-2">
          <CopyButton text={invite} label="Copy lời mời gửi Zalo" className="btn btn-primary btn-sm" />
        </div>
        <ActionForm action={changeTeamPassword} className="mt-4 flex gap-2" reset confirm="Đổi mật khẩu đội? Mọi người phải nhập mật khẩu mới.">
          <input className="input" name="password" placeholder="Mật khẩu đội mới" minLength={4} required />
          <button className="btn shrink-0">Đổi mật khẩu</button>
        </ActionForm>
        <p className="mt-1 text-xs text-gray-500">Đổi khi lộ mật khẩu hoặc có người rời đội. Mọi máy đã vào sẽ phải nhập lại.</p>
      </Card>

      <Card title="⚙️ Đội & tiền trận mặc định">
        <ActionForm action={saveTeamSettings} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tên đội">
              <input className="input" name="name" defaultValue={team.name} required />
            </Field>
            <Field label="Khu vực">
              <input className="input" name="area" defaultValue={team.area ?? ""} placeholder="VD: Cầu Giấy, Hà Nội" />
            </Field>
          </div>
          <Field label="Cách chia tiền trận mặc định">
            <select className="input" name="splitMethod" defaultValue={team.splitMethod}>
              {Object.entries(SPLIT_METHODS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Làm tròn lên">
              <select className="input" name="roundingStep" defaultValue={team.roundingStep}>
                <option value={0}>Không</option>
                <option value={1000}>1.000đ</option>
                <option value={5000}>5.000đ</option>
                <option value={10000}>10.000đ</option>
              </select>
            </Field>
            <Field label="Giá cố định">
              <input className="input" name="fixedFee" inputMode="numeric" defaultValue={money(team.fixedFee)} />
            </Field>
            <Field label="Giá khách">
              <input className="input" name="guestFee" inputMode="numeric" defaultValue={money(team.guestFee)} />
            </Field>
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="requirePin" defaultChecked={team.requirePin} className="mt-1 accent-green-700" />
            <span>
              <b>Yêu cầu mã PIN khi vote</b>: mỗi thành viên tự đặt PIN 4 số lần đầu, để không ai vote hộ người khác.
            </span>
          </label>
          <p className="text-xs text-gray-500">Đổi tên đội thì link đội cũng đổi theo, thành viên gõ tên mới để vào.</p>
          <button className="btn btn-primary w-full">Lưu</button>
        </ActionForm>
      </Card>

      <Card title="🏦 Tài khoản nhận tiền" id="tai-khoan">
        <p className="muted mb-3">
          Tải lên ảnh QR chụp từ app ngân hàng. Web tự đọc ngân hàng + số tài khoản trong ảnh để tạo QR có sẵn số tiền và nội dung.
        </p>
        <div className="space-y-3">
          {(["ball", "penalty"] as Fund[]).map((code) => {
            const fund = funds[code];
            const qr = fundQr(fund, { content: code === "ball" ? "QB" : "PHAT" });
            return (
              <Fold key={code} summary={`${FUND_NAMES[code]}${fund.accountNo ? ` · ${fund.accountNo}` : fund.qrImage ? " · ảnh QR" : " · chưa cài"}`}>
                <ActionForm action={saveFund} className="space-y-3">
                  <input type="hidden" name="code" value={code} />
                  <BankQrFields
                    initial={{ bankBin: fund.bankBin, accountNo: fund.accountNo, accountName: fund.accountName, qrImage: fund.qrImage }}
                  />
                  <button className="btn btn-primary w-full">Lưu</button>
                </ActionForm>
                {qr.configured && (
                  <div className="mt-4">
                    <p className="label text-center">Xem thử (quét bằng app ngân hàng để kiểm tra)</p>
                    <QrCard title={FUND_NAMES[code]} payload={qr.payload} image={qr.image} lines={qr.lines} fileName={`qr-${code}`} size="sm" />
                  </div>
                )}
              </Fold>
            );
          })}
        </div>
      </Card>

      <Card title="🚨 Các loại lỗi phạt">
        <p className="muted mb-3">
          Lỗi “vắng không báo” mặc định phạt <b>bằng tiền trận mỗi người</b> của buổi đó, vào quỹ phạt. Sửa được từng người khi phạt.
        </p>
        <div className="space-y-4 divide-y divide-gray-100">
          {penaltyTypes.map((t) => (
            <div key={t.id} className="pt-3 first:pt-0">
              <PenaltyTypeForm t={t} />
            </div>
          ))}
        </div>
        <div className="mt-4 border-t border-gray-200 pt-3">
          <p className="label">Thêm loại lỗi</p>
          <PenaltyTypeForm />
        </div>
      </Card>

      <Card title="🏟️ Sân">
        <div className="space-y-4 divide-y divide-gray-100">
          {venues.map((v) => (
            <div key={v.id} className="pt-3 first:pt-0">
              <VenueForm v={v} />
            </div>
          ))}
        </div>
        <div className="mt-4 border-t border-gray-200 pt-3">
          <p className="label">Thêm sân</p>
          <VenueForm />
        </div>
      </Card>

      <Card title="👤 Quản trị viên của đội">
        <ul className="divide-y divide-gray-100">
          {admins.map(({ user: u, role }) => (
            <li key={u.id} className="flex items-center justify-between py-1.5 text-sm">
              <span>
                <b>{u.displayName}</b> <span className="text-gray-500">@{u.username}</span>
                {role === "owner" && <span className="text-xs text-gray-400"> · người tạo đội</span>}
                {u.id === admin.id && <span className="text-xs text-gray-400"> (bạn)</span>}
              </span>
              {u.id !== admin.id && role !== "owner" && (
                <ActionForm action={removeTeamAdmin} confirm={`Bỏ quyền quản trị của ${u.displayName}?`} showOk={false}>
                  <input type="hidden" name="userId" value={u.id} />
                  <button className="btn btn-sm btn-danger">Bỏ quyền</button>
                </ActionForm>
              )}
            </li>
          ))}
        </ul>
        <ActionForm action={addTeamAdmin} className="mt-3 flex gap-2" reset>
          <input className="input" name="username" placeholder="Tên đăng nhập của người đó" required />
          <button className="btn btn-primary shrink-0">Thêm</button>
        </ActionForm>
        <p className="mt-1 text-xs text-gray-500">Người đó cần đăng ký tài khoản trước (trang đầu → Đăng ký).</p>
      </Card>

      <Card title="💾 Dữ liệu">
        <p className="muted">Nên tải bản sao lưu mỗi tháng một lần.</p>
        <a href={`${base}/api/export`} className="btn mt-2">
          ⬇ Tải toàn bộ dữ liệu của đội (JSON)
        </a>
      </Card>
    </>
  );
}
