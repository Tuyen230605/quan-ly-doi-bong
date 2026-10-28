import { eq } from "drizzle-orm";
import { cache } from "react";
import { getDb, schema } from "@/db";
import { fail } from "./action";
import { getMe, getUser, hasTeamAccess, isTeamAdmin, type Team, type User } from "./auth";
import { stripDiacritics } from "./text";

/** Tên đội → mã dùng trong link và khi thành viên đăng nhập. "FC Văn Phòng" → "fc-van-phong" */
export function slugify(name: string) {
  return stripDiacritics(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export const getTeamBySlug = cache(async (slug: string): Promise<Team | null> => {
  const db = await getDb();
  const [team] = await db.select().from(schema.teams).where(eq(schema.teams.slug, slug));
  return team ?? null;
});

/** Ngữ cảnh của 1 đội trong 1 request: ai đang xem, có phải admin đội không. */
export const teamCtx = cache(async (slug: string) => {
  const team = await getTeamBySlug(slug);
  if (!team) return null;
  const user = await getUser();
  const admin = user && (await isTeamAdmin(team.id, user.id)) ? user : null;
  const canView = !!admin || (await hasTeamAccess(team));
  const me = canView ? await getMe(team.id) : null;
  return { team, user, admin, canView, me, base: `/doi/${team.slug}` };
});

export type TeamCtx = NonNullable<Awaited<ReturnType<typeof teamCtx>>>;

/** Dùng trong trang: trả về ngữ cảnh nếu được xem đội, không thì null (layout sẽ hiện form mật khẩu). */
export async function viewCtx(params: Promise<{ slug: string }>) {
  const ctx = await teamCtx((await params).slug);
  return ctx?.canView ? ctx : null;
}

/** Dùng trong server action: bắt buộc là admin của đội. */
export async function teamAdmin(teamId: number | FormData): Promise<{ user: User; team: Team }> {
  const id = typeof teamId === "number" ? teamId : Number(teamId.get("teamId"));
  const user = await getUser();
  if (!user) fail("Bạn cần đăng nhập quản trị để làm việc này.");
  const db = await getDb();
  const [team] = await db.select().from(schema.teams).where(eq(schema.teams.id, id));
  if (!team) fail("Không tìm thấy đội.");
  if (!(await isTeamAdmin(team.id, user.id))) fail("Bạn không phải quản trị của đội này.");
  return { user, team };
}
