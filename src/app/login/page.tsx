import Link from "next/link";
import { login } from "@/actions/auth";
import { ActionForm } from "@/components/ActionForm";
import { Field } from "@/components/ui";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-4 p-6">
      <h1 className="text-center text-xl font-bold">⚽ Đăng nhập quản trị</h1>
      <ActionForm action={login} className="card space-y-3" showOk={false}>
        <input type="hidden" name="next" value={next ?? ""} />
        <Field label="Tên đăng nhập">
          <input className="input" name="username" autoComplete="username" required />
        </Field>
        <Field label="Mật khẩu">
          <input className="input" name="password" type="password" autoComplete="current-password" required />
        </Field>
        <button className="btn btn-primary w-full">Đăng nhập</button>
      </ActionForm>
      <div className="flex justify-between text-sm text-gray-500">
        <Link href="/">← Trang đầu</Link>
        <Link href={`/dang-ky${next ? `?next=${encodeURIComponent(next)}` : ""}`}>Chưa có tài khoản? Đăng ký</Link>
      </div>
    </main>
  );
}
