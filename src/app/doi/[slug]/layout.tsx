import Link from "next/link";
import { notFound } from "next/navigation";
import { joinTeam } from "@/actions/auth";
import { ActionForm } from "@/components/ActionForm";
import { BottomNav } from "@/components/BottomNav";
import { CurrentPath } from "@/components/CurrentPath";
import { TeamProvider } from "@/components/TeamContext";
import { Field } from "@/components/ui";
import { teamCtx } from "@/lib/team";
import { pname } from "@/lib/text";

export const dynamic = "force-dynamic";

export default async function TeamLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const ctx = await teamCtx((await params).slug);
  if (!ctx) notFound();
  const { team, admin, me, base, canView } = ctx;

  if (!canView) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-4 p-6">
        <div className="text-center">
          <div className="text-5xl">⚽</div>
          <h1 className="mt-2 text-xl font-bold">{team.name}</h1>
          {team.area && <p className="muted">{team.area}</p>}
        </div>
        <ActionForm action={joinTeam} className="card space-y-3" showOk={false}>
          <input type="hidden" name="team" value={team.slug} />
          <CurrentPath />
          <Field label="Mật khẩu đội" hint="Hỏi đội trưởng / thủ quỹ trong nhóm Zalo">
            <input className="input" name="password" type="password" autoComplete="current-password" required autoFocus />
          </Field>
          <button className="btn btn-primary w-full">Vào đội</button>
        </ActionForm>
        <div className="flex justify-between text-sm text-gray-500">
          <Link href="/">← Trang đầu</Link>
          <Link href={`/login?next=${base}`}>Đăng nhập quản trị</Link>
        </div>
      </main>
    );
  }

  return (
    <TeamProvider teamId={team.id}>
      <div className="mx-auto min-h-dvh max-w-2xl pb-24">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-2 bg-green-800 px-4 py-3 text-white shadow">
          <Link href={base} className="truncate font-bold">
            ⚽ {team.name}
          </Link>
          <div className="shrink-0 text-xs">
            {admin ? (
              <Link href={`${base}/them`} className="rounded-full bg-white/15 px-2.5 py-1">
                Admin: {admin.displayName}
              </Link>
            ) : me ? (
              <Link href={`${base}/toi`} className="rounded-full bg-white/15 px-2.5 py-1">
                Bạn: {pname(me)}
              </Link>
            ) : (
              <Link href={`${base}/toi`} className="rounded-full bg-amber-400 px-2.5 py-1 font-semibold text-amber-950">
                Chọn tên bạn
              </Link>
            )}
          </div>
        </header>
        <main className="space-y-4 px-4 py-4">{children}</main>
        <BottomNav base={base} />
      </div>
    </TeamProvider>
  );
}
