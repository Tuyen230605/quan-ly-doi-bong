import { chooseMe } from "@/actions/auth";
import type { Player } from "@/lib/auth";
import { pname } from "@/lib/text";
import { ActionForm } from "./ActionForm";
import { Field } from "./ui";

/** Chọn "tôi là ai" trong đội. next: chọn xong quay về trang này (mặc định trang vote). */
export function ChooseMe({
  members,
  me,
  requirePin,
  next,
}: {
  members: Player[];
  me: Player | null;
  requirePin: boolean;
  next?: string;
}) {
  return (
    <ActionForm action={chooseMe} className="space-y-3" showOk={false}>
      {next && <input type="hidden" name="next" value={next} />}
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
      {requirePin && (
        <Field label="Mã PIN (4 số)" hint="Lần đầu: tự đặt PIN mới. Quên PIN thì nhờ admin đặt lại.">
          <input className="input" name="pin" inputMode="numeric" pattern="\d{4}" maxLength={4} required />
        </Field>
      )}
      <button className="btn btn-primary w-full">Xác nhận</button>
    </ActionForm>
  );
}
