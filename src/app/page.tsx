import Link from "next/link";
import { joinTeam } from "@/actions/auth";
import { ActionForm } from "@/components/ActionForm";
import { Card, Field } from "@/components/ui";
import { getMyTeams, getUser, getVisitedTeams } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const [user, visited] = await Promise.all([getUser(), getVisitedTeams()]);
  const mine = user ? await getMyTeams(user.id) : [];
  const mineIds = new Set(mine.map((m) => m.team.id));
  const others = visited.filter((t) => !mineIds.has(t.id));

  return (
    <main className="mx-auto max-w-md space-y-4 p-5">
      <div className="pt-6 pb-2 text-center">
        <div className="text-5xl">⚽</div>
        <h1 className="mt-2 text-2xl font-bold">Quản lý đội bóng</h1>
        <p className="muted mt-1">Lịch đá, vote, điểm danh, quỹ bóng, quỹ phạt</p>
      </div>

      {mine.length > 0 && (
        <Card title="Đội bạn quản lý">
          <ul className="divide-y divide-gray-100">
            {mine.map(({ team, role }) => (
              <li key={team.id}>
                <Link href={`/doi/${team.slug}`} className="flex items-center justify-between py-2.5">
                  <span className="font-semibold">{team.name}</span>
                  <span className="text-xs text-gray-500">{role === "owner" ? "Người tạo" : "Quản trị"} →</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {others.length > 0 && (
        <Card title="Đội đã vào trên máy này">
          <ul className="divide-y divide-gray-100">
            {others.map((t) => (
              <li key={t.id}>
                <Link href={`/doi/${t.slug}`} className="flex items-center justify-between py-2.5">
                  <span className="font-semibold">{t.name}</span>
                  <span className="text-gray-400">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card title="Vào đội của bạn">
        <ActionForm action={joinTeam} className="space-y-3" showOk={false}>
          <Field label="Tên đội">
            <input className="input" name="team" placeholder="VD: FC Văn Phòng" required />
          </Field>
          <Field label="Mật khẩu đội" hint="Hỏi đội trưởng / thủ quỹ">
            <input className="input" name="password" type="password" required />
          </Field>
          <button className="btn btn-primary w-full">Vào đội</button>
        </ActionForm>
      </Card>

      <Card title="Đội trưởng / thủ quỹ?">
        {user ? (
          <div className="space-y-2">
            <p className="text-sm">
              Đang đăng nhập: <b>{user.displayName}</b>
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href="/tao-doi" className="btn btn-primary">
                + Tạo đội mới
              </Link>
              <Link href="/tai-khoan" className="btn">
                Tài khoản
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="muted">Đăng ký tài khoản để tạo đội và quản lý quỹ, lịch, điểm danh. Miễn phí.</p>
            <div className="flex flex-wrap gap-2">
              <Link href="/dang-ky" className="btn btn-primary">
                Đăng ký &amp; tạo đội
              </Link>
              <Link href="/login" className="btn">
                Đăng nhập
              </Link>
            </div>
          </div>
        )}
      </Card>
    </main>
  );
}
