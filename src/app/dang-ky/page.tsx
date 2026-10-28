import Link from "next/link";
import { register } from "@/actions/auth";
import { ActionForm } from "@/components/ActionForm";
import { Field } from "@/components/ui";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-4 p-6">
      <div className="text-center">
        <h1 className="text-xl font-bold">⚽ Đăng ký tài khoản quản trị</h1>
        <p className="muted mt-1">Dành cho đội trưởng / thủ quỹ. Thành viên chỉ cần tên đội + mật khẩu đội, không cần đăng ký.</p>
      </div>
      <ActionForm action={register} className="card space-y-3" showOk={false}>
        <input type="hidden" name="next" value={next ?? ""} />
        <Field label="Tên của bạn">
          <input className="input" name="displayName" placeholder="VD: Hùng" required />
        </Field>
        <Field label="Tên đăng nhập" hint="Chữ không dấu, số, dấu . _ -">
          <input className="input" name="username" autoComplete="username" autoCapitalize="none" required />
        </Field>
        <Field label="Mật khẩu" hint="Tối thiểu 6 ký tự">
          <input className="input" name="password" type="password" autoComplete="new-password" minLength={6} required />
        </Field>
        <button className="btn btn-primary w-full">Đăng ký</button>
      </ActionForm>
      <div className="flex justify-between text-sm text-gray-500">
        <Link href="/">← Trang đầu</Link>
        <Link href="/login">Đã có tài khoản? Đăng nhập</Link>
      </div>
    </main>
  );
}
