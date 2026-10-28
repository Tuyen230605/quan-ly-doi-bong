import Link from "next/link";
import { redirect } from "next/navigation";
import { createTeam } from "@/actions/teams";
import { ActionForm } from "@/components/ActionForm";
import { Field } from "@/components/ui";
import { getUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function CreateTeamPage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/tao-doi");
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-4 p-6">
      <div className="text-center">
        <div className="text-4xl">⚽</div>
        <h1 className="mt-2 text-xl font-bold">Tạo đội mới</h1>
        <p className="muted mt-1">Thành viên vào xem bằng tên đội + mật khẩu đội.</p>
      </div>
      <ActionForm action={createTeam} className="card space-y-3" showOk={false}>
        <Field label="Tên đội" hint="Không trùng với đội khác. Thành viên gõ tên này để vào đội.">
          <input className="input" name="name" placeholder="VD: FC Văn Phòng" required />
        </Field>
        <Field label="Khu vực (không bắt buộc)" hint="Để sau này tìm đối giao hữu gần nhau">
          <input className="input" name="area" placeholder="VD: Cầu Giấy, Hà Nội" />
        </Field>
        <Field label="Mật khẩu đội" hint="Gửi cho thành viên trong nhóm Zalo. Tối thiểu 4 ký tự.">
          <input className="input" name="password" required minLength={4} />
        </Field>
        <button className="btn btn-primary w-full">Tạo đội</button>
      </ActionForm>
      <Link href="/" className="text-center text-sm text-gray-500">
        ← Trang đầu
      </Link>
    </main>
  );
}
