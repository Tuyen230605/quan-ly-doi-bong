import { chooseMe, forgetMe } from "@/actions/auth";
import { ActionForm } from "@/components/ActionForm";
import { Card, Field, PageTitle } from "@/components/ui";
import { getPlayers } from "@/lib/data";
import { viewCtx } from "@/lib/team";
import { pname } from "@/lib/text";

export default async function MePage({ params }: { params: Promise<{ slug: string }> }) {
  const ctx = await viewCtx(params);
  if (!ctx) return null;
  const { team, me } = ctx;
  const players = await getPlayers(team.id);
  const members = players.filter((p) => p.type === "member" && p.status !== "left");
  return (
    <>
      <PageTitle>Bạn là ai?</PageTitle>
      {me && (
        <Card>
          <p>
            Máy này đang là: <b>{pname(me)}</b>
          </p>
          <ActionForm action={forgetMe} className="mt-2" showOk={false}>
            <button className="btn btn-sm">Đổi người khác</button>
          </ActionForm>
        </Card>
      )}
      <Card>
        <p className="muted mb-3">Chọn tên của bạn một lần, web sẽ nhớ trên điện thoại này để bạn vote đi/nghỉ.</p>
        <ActionForm action={chooseMe} className="space-y-3" showOk={false}>
          <Field label="Tên của bạn">
            <select className="input" name="playerId" defaultValue={me?.id ?? ""} required>
              <option value="">— Chọn tên —</option>
              {members.map((p) => (
                <option key={p.id} value={p.id}>
                  {pname(p)}
                  {p.nickname ? ` (${p.fullName})` : ""}
                </option>
              ))}
            </select>
          </Field>
          {team.requirePin && (
            <Field label="Mã PIN (4 số)" hint="Lần đầu: tự đặt PIN mới. Quên PIN thì nhờ admin đặt lại.">
              <input className="input" name="pin" inputMode="numeric" pattern="\d{4}" maxLength={4} required />
            </Field>
          )}
          <button className="btn btn-primary w-full">Xác nhận</button>
        </ActionForm>
        <p className="mt-3 text-xs text-gray-500">Không thấy tên mình? Nhắn admin thêm vào danh sách đội.</p>
      </Card>
    </>
  );
}
