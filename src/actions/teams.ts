"use server";

import { and, eq, ne } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, schema } from "@/db";
import { seedTeam } from "@/db/seed";
import { audit, fail, int, optStr, run, str, type ActionState } from "@/lib/action";
import { grantTeamAccess, hashSecret, requireUser } from "@/lib/auth";
import { parseMoney, SPLIT_METHODS } from "@/lib/money";
import { slugify, teamAdmin } from "@/lib/team";

const { teams, teamAdmins, users } = schema;

async function checkName(name: string, exceptId?: number) {
  const slug = slugify(name);
  if (!name || slug.length < 2) fail("Tên đội cần ít nhất 2 chữ cái hoặc số.");
  const db = await getDb();
  const [taken] = await db
    .select()
    .from(teams)
    .where(exceptId ? and(eq(teams.slug, slug), ne(teams.id, exceptId)) : eq(teams.slug, slug));
  if (taken) fail("Tên đội đã có đội khác dùng. Thêm khu vực hoặc tên công ty cho khác đi, VD “FC Văn Phòng Cầu Giấy”.");
  return slug;
}

/** Ai đăng nhập cũng tạo được đội (sau này muốn thu phí thì chặn ở đây). */
export async function createTeam(_: ActionState, fd: FormData) {
  return run(async () => {
    const user = await requireUser();
    const name = str(fd, "name");
    const slug = await checkName(name);
    const password = str(fd, "password");
    if (password.length < 4) fail("Mật khẩu đội tối thiểu 4 ký tự.");
    const db = await getDb();
    const team = await db.transaction(async (tx) => {
      const [t] = await tx
        .insert(teams)
        .values({ name, slug, area: optStr(fd, "area"), passwordHash: hashSecret(password), createdBy: user.id })
        .returning();
      await tx.insert(teamAdmins).values({ teamId: t.id, userId: user.id, role: "owner" });
      await seedTeam(tx, t.id);
      return t;
    });
    await grantTeamAccess(team);
    await audit(team.id, { admin: user }, "Tạo đội", name);
    redirect(`/doi/${team.slug}`);
  });
}

export async function saveTeamSettings(_: ActionState, fd: FormData) {
  return run(async () => {
    const { user, team } = await teamAdmin(fd);
    const name = str(fd, "name");
    const slug = await checkName(name, team.id);
    const db = await getDb();
    await db
      .update(teams)
      .set({
        name,
        slug,
        area: optStr(fd, "area"),
        splitMethod: str(fd, "splitMethod") in SPLIT_METHODS ? str(fd, "splitMethod") : "equal",
        roundingStep: int(fd, "roundingStep") ?? 1000,
        fixedFee: parseMoney(fd.get("fixedFee")),
        guestFee: parseMoney(fd.get("guestFee")),
        requirePin: fd.get("requirePin") === "on",
      })
      .where(eq(teams.id, team.id));
    await audit(team.id, { admin: user }, "Sửa cài đặt đội");
    if (slug !== team.slug) redirect(`/doi/${slug}/cai-dat`);
  });
}

/** Đổi mật khẩu đội: mọi máy đã vào đều phải nhập mật khẩu mới. */
export async function changeTeamPassword(_: ActionState, fd: FormData) {
  return run(async () => {
    const { user, team } = await teamAdmin(fd);
    const password = str(fd, "password");
    if (password.length < 4) fail("Mật khẩu đội tối thiểu 4 ký tự.");
    const db = await getDb();
    await db
      .update(teams)
      .set({ passwordHash: hashSecret(password), viewerVersion: team.viewerVersion + 1 })
      .where(eq(teams.id, team.id));
    await audit(team.id, { admin: user }, "Đổi mật khẩu đội");
    return "Đã đổi. Thành viên phải nhập mật khẩu mới.";
  });
}

export async function addTeamAdmin(_: ActionState, fd: FormData) {
  return run(async () => {
    const { user, team } = await teamAdmin(fd);
    const db = await getDb();
    const [other] = await db.select().from(users).where(eq(users.username, str(fd, "username").toLowerCase()));
    if (!other) fail("Không có tài khoản này. Người đó cần đăng ký trước.");
    await db.insert(teamAdmins).values({ teamId: team.id, userId: other.id }).onConflictDoNothing();
    await audit(team.id, { admin: user }, "Thêm quản trị viên", other.displayName);
    return `Đã thêm ${other.displayName} làm quản trị`;
  });
}

export async function removeTeamAdmin(_: ActionState, fd: FormData) {
  return run(async () => {
    const { user, team } = await teamAdmin(fd);
    const userId = Number(str(fd, "userId"));
    if (userId === user.id) fail("Không thể tự xoá chính mình.");
    const db = await getDb();
    const where = and(eq(teamAdmins.teamId, team.id), eq(teamAdmins.userId, userId));
    const [row] = await db.select().from(teamAdmins).where(where);
    if (row?.role === "owner") fail("Không thể xoá người tạo đội.");
    await db.delete(teamAdmins).where(where);
    await audit(team.id, { admin: user }, "Xoá quản trị viên", `#${userId}`);
    return "Đã xoá";
  });
}
