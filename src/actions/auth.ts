"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, schema } from "@/db";
import { fail, run, str, type ActionState } from "@/lib/action";
import {
  clearMeCookie,
  clearUserCookie,
  getUser,
  grantTeamAccess,
  hashSecret,
  hasTeamAccess,
  isTeamAdmin,
  requireUser,
  setMeCookie,
  setUserCookie,
  verifySecret,
} from "@/lib/auth";
import { slugify } from "@/lib/team";

function safeNext(fd: FormData) {
  const next = str(fd, "next");
  return next.startsWith("/") && !next.startsWith("//") ? next : null;
}

export async function register(_: ActionState, fd: FormData) {
  return run(async () => {
    const displayName = str(fd, "displayName");
    const username = str(fd, "username").toLowerCase();
    const password = str(fd, "password");
    if (!displayName) fail("Nhập tên của bạn.");
    if (!/^[a-z0-9._-]{3,30}$/.test(username)) fail("Tên đăng nhập 3–30 ký tự, chỉ gồm chữ không dấu, số, dấu . _ -");
    if (password.length < 6) fail("Mật khẩu tối thiểu 6 ký tự.");
    const db = await getDb();
    const [exists] = await db.select().from(schema.users).where(eq(schema.users.username, username));
    if (exists) fail("Tên đăng nhập đã có người dùng.");
    const [user] = await db
      .insert(schema.users)
      .values({ username, displayName, passwordHash: hashSecret(password) })
      .returning();
    await setUserCookie(user.id);
    redirect(safeNext(fd) ?? "/tao-doi");
  });
}

export async function login(_: ActionState, fd: FormData) {
  return run(async () => {
    const db = await getDb();
    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.username, str(fd, "username").toLowerCase()));
    if (!user || !verifySecret(str(fd, "password"), user.passwordHash)) fail("Sai tên đăng nhập hoặc mật khẩu.");
    await setUserCookie(user.id);
    redirect(safeNext(fd) ?? "/");
  });
}

export async function logout() {
  return run(async () => {
    await clearUserCookie();
    redirect("/");
  });
}

export async function changePassword(_: ActionState, fd: FormData) {
  return run(async () => {
    const user = await requireUser();
    if (!verifySecret(str(fd, "current"), user.passwordHash)) fail("Mật khẩu hiện tại không đúng.");
    const next = str(fd, "password");
    if (next.length < 6) fail("Mật khẩu mới tối thiểu 6 ký tự.");
    const db = await getDb();
    await db.update(schema.users).set({ passwordHash: hashSecret(next) }).where(eq(schema.users.id, user.id));
    return "Đã đổi mật khẩu";
  });
}

/** Thành viên vào đội bằng tên đội + mật khẩu đội. */
export async function joinTeam(_: ActionState, fd: FormData) {
  return run(async () => {
    const slug = slugify(str(fd, "team"));
    if (!slug) fail("Nhập tên đội.");
    const db = await getDb();
    const [team] = await db.select().from(schema.teams).where(eq(schema.teams.slug, slug));
    if (!team || !verifySecret(str(fd, "password"), team.passwordHash)) fail("Sai tên đội hoặc mật khẩu đội.");
    await grantTeamAccess(team);
    redirect(`/doi/${team.slug}`);
  });
}

/** Thành viên chọn "tôi là ai" trong đội trên máy này để vote. */
export async function chooseMe(_: ActionState, fd: FormData) {
  return run(async () => {
    const db = await getDb();
    const teamId = Number(str(fd, "teamId"));
    const [team] = await db.select().from(schema.teams).where(eq(schema.teams.id, teamId));
    if (!team) fail("Không tìm thấy đội.");
    const user = await getUser();
    if (!(await hasTeamAccess(team)) && !(user && (await isTeamAdmin(team.id, user.id)))) fail("Hãy nhập mật khẩu đội trước.");
    const [p] = await db
      .select()
      .from(schema.players)
      .where(and(eq(schema.players.id, Number(str(fd, "playerId"))), eq(schema.players.teamId, team.id)));
    if (!p || p.type !== "member" || p.status === "left") fail("Hãy chọn tên của bạn.");
    if (team.requirePin) {
      const pin = str(fd, "pin");
      if (!/^\d{4}$/.test(pin)) fail("Mã PIN gồm 4 chữ số.");
      if (p.pinHash) {
        if (!verifySecret(pin, p.pinHash)) fail("Mã PIN không đúng. Quên PIN thì nhờ admin đặt lại.");
      } else {
        await db.update(schema.players).set({ pinHash: hashSecret(pin) }).where(eq(schema.players.id, p.id));
      }
    }
    await setMeCookie(team.id, p.id);
    redirect(`/doi/${team.slug}/vote`);
  });
}

export async function forgetMe(_: ActionState, fd: FormData) {
  return run(async () => {
    await clearMeCookie(Number(str(fd, "teamId")));
    return "Đã bỏ chọn";
  });
}
