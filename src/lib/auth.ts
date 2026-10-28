import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb, schema } from "@/db";

const USER_COOKIE = "fb_user";
const TEAM_COOKIE = (teamId: number) => `fb_t${teamId}`;
const ME_COOKIE = (teamId: number) => `fb_me${teamId}`;

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
};

export type User = typeof schema.users.$inferSelect;
export type Team = typeof schema.teams.$inferSelect;
export type Player = typeof schema.players.$inferSelect;

let cachedSecret: string | undefined;
async function secret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  if (!cachedSecret) {
    const db = await getDb();
    const [row] = await db.select().from(schema.settings).where(eq(schema.settings.key, "sessionSecret"));
    cachedSecret = row.value as string;
  }
  return cachedSecret;
}

function mac(key: string, value: string) {
  return createHmac("sha256", key).update(value).digest("base64url");
}

async function sign(value: string) {
  return `${value}.${mac(await secret(), value)}`;
}

async function unsign(signed: string | undefined) {
  if (!signed) return null;
  const i = signed.lastIndexOf(".");
  if (i < 0) return null;
  const value = signed.slice(0, i);
  const got = Buffer.from(signed.slice(i + 1));
  const want = Buffer.from(mac(await secret(), value));
  return got.length === want.length && timingSafeEqual(got, want) ? value : null;
}

export function hashSecret(plain: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(plain, salt, 32).toString("hex")}`;
}

export function verifySecret(plain: string, stored: string | null) {
  if (!stored) return false;
  const [salt, hash] = stored.split(":");
  const want = Buffer.from(hash, "hex");
  const got = scryptSync(plain, salt, 32);
  return got.length === want.length && timingSafeEqual(got, want);
}

// ---------- Tài khoản quản trị ----------

export async function getUser(): Promise<User | null> {
  const id = Number(await unsign((await cookies()).get(USER_COOKIE)?.value));
  if (!id) return null;
  const db = await getDb();
  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id));
  return user ?? null;
}

export async function requireUser(): Promise<User> {
  const user = await getUser();
  if (!user) throw new Error("Bạn cần đăng nhập.");
  return user;
}

export async function setUserCookie(userId: number) {
  (await cookies()).set(USER_COOKIE, await sign(String(userId)), { ...cookieOptions, maxAge: 60 * 60 * 24 * 90 });
}

export async function clearUserCookie() {
  (await cookies()).delete(USER_COOKIE);
}

export async function isTeamAdmin(teamId: number, userId: number) {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(schema.teamAdmins)
    .where(and(eq(schema.teamAdmins.teamId, teamId), eq(schema.teamAdmins.userId, userId)));
  return !!row;
}

export async function getMyTeams(userId: number) {
  const db = await getDb();
  const rows = await db
    .select({ team: schema.teams, role: schema.teamAdmins.role })
    .from(schema.teamAdmins)
    .innerJoin(schema.teams, eq(schema.teams.id, schema.teamAdmins.teamId))
    .where(eq(schema.teamAdmins.userId, userId));
  return rows.sort((a, b) => a.team.name.localeCompare(b.team.name, "vi"));
}

// ---------- Quyền xem đội (thành viên nhập tên đội + mật khẩu) ----------

export async function hasTeamAccess(team: Team) {
  const v = await unsign((await cookies()).get(TEAM_COOKIE(team.id))?.value);
  return v === `${team.id}:${team.viewerVersion}`;
}

export async function grantTeamAccess(team: Team) {
  (await cookies()).set(TEAM_COOKIE(team.id), await sign(`${team.id}:${team.viewerVersion}`), cookieOptions);
}

/** Các đội máy này đã vào (để hiện ở trang đầu). */
export async function getVisitedTeams(): Promise<Team[]> {
  const store = await cookies();
  const ids = store
    .getAll()
    .filter((c) => /^fb_t\d+$/.test(c.name))
    .map((c) => Number(c.name.slice(4)));
  if (!ids.length) return [];
  const db = await getDb();
  const teams = await db.select().from(schema.teams).where(inArray(schema.teams.id, ids));
  const ok: Team[] = [];
  for (const t of teams) if (await hasTeamAccess(t)) ok.push(t);
  return ok;
}

// ---------- Thành viên đang dùng máy này (đã chọn tên trong đội) ----------

export async function getMe(teamId: number): Promise<Player | null> {
  const id = Number(await unsign((await cookies()).get(ME_COOKIE(teamId))?.value));
  if (!id) return null;
  const db = await getDb();
  const [p] = await db
    .select()
    .from(schema.players)
    .where(and(eq(schema.players.id, id), eq(schema.players.teamId, teamId), eq(schema.players.type, "member")));
  return p && p.status !== "left" ? p : null;
}

export async function setMeCookie(teamId: number, playerId: number) {
  (await cookies()).set(ME_COOKIE(teamId), await sign(String(playerId)), cookieOptions);
}

export async function clearMeCookie(teamId: number) {
  (await cookies()).delete(ME_COOKIE(teamId));
}
