import Link from "next/link";
import { redirect } from "next/navigation";
import { changePassword, logout } from "@/actions/auth";
import { ActionForm } from "@/components/ActionForm";
import { Card, Field } from "@/components/ui";
import { getMyTeams, getUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/tai-khoan");
  const teams = await getMyTeams(user.id);
  return (
    <main className="mx-auto max-w-md space-y-4 p-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Tài khoản</h1>
        <Link href="/" className="btn btn-sm">
          ← Trang đầu
        </Link>
      </div>
      <Card>
        <p>
          <b>{user.displayName}</b> <span className="text-gray-500">@{user.username}</span>
        </p>
        <ActionForm action={logout} className="mt-3" showOk={false}>
          <button className="btn btn-sm">Đăng xuất</button>
        </ActionForm>
      </Card>
      <Card title={`Đội bạn quản lý (${teams.length})`} right={<Link href="/tao-doi" className="btn btn-sm btn-primary">+ Tạo đội</Link>}>
        <ul className="divide-y divide-gray-100">
          {teams.map(({ team, role }) => (
            <li key={team.id}>
              <Link href={`/doi/${team.slug}`} className="flex justify-between py-2">
                <span className="font-medium">{team.name}</span>
                <span className="text-xs text-gray-500">{role === "owner" ? "Người tạo" : "Quản trị"}</span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-gray-500">
          Muốn quản lý cùng người khác? Họ đăng ký tài khoản, rồi bạn thêm tên đăng nhập của họ trong Cài đặt của đội.
        </p>
      </Card>
      <Card title="Đổi mật khẩu">
        <ActionForm action={changePassword} className="space-y-3" reset>
          <Field label="Mật khẩu hiện tại">
            <input className="input" name="current" type="password" required />
          </Field>
          <Field label="Mật khẩu mới">
            <input className="input" name="password" type="password" minLength={6} required />
          </Field>
          <button className="btn btn-primary w-full">Đổi mật khẩu</button>
        </ActionForm>
      </Card>
    </main>
  );
}
