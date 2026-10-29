"use server";

import { and, desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, schema, type DB } from "@/db";
import { audit, fail, int, optStr, run, str, type ActionState } from "@/lib/action";
import type { PaymentRequest } from "@/lib/data";
import { FUND_NAMES, fmtMoney, parseMoney, type Fund } from "@/lib/money";
import { teamAdmin } from "@/lib/team";
import { pname } from "@/lib/text";
import { todayVN } from "@/lib/time";

const { paymentRequests, transactions, players } = schema;

async function loadRequest(db: DB, id: number, teamId: number): Promise<PaymentRequest> {
  const [r] = await db
    .select()
    .from(paymentRequests)
    .where(and(eq(paymentRequests.id, id), eq(paymentRequests.teamId, teamId)));
  if (!r) fail("Không tìm thấy link nộp tiền.");
  return r;
}

/** Admin tạo link nộp tiền (VD quỹ tháng 11, 200k). Thành viên mở link, chọn app ngân hàng để chuyển. */
export async function createPaymentRequest(_: ActionState, fd: FormData) {
  return run(async () => {
    const { user, team } = await teamAdmin(fd);
    const title = str(fd, "title");
    const amount = parseMoney(fd.get("amount"));
    const fund: Fund = str(fd, "fund") === "penalty" ? "penalty" : "ball";
    if (!title) fail("Nhập nộp tiền gì, VD: Quỹ tháng 11.");
    if (amount <= 0) fail("Nhập số tiền lớn hơn 0.");
    const db = await getDb();
    const [r] = await db
      .insert(paymentRequests)
      .values({ teamId: team.id, fund, title: title.slice(0, 80), amount, note: optStr(fd, "note")?.slice(0, 12) ?? null, createdBy: user.id })
      .returning();
    await audit(team.id, { admin: user }, "Tạo link nộp tiền", `${title}: ${fmtMoney(amount)} (${FUND_NAMES[fund]})`);
    redirect(`/doi/${team.slug}/nop/${r.id}`);
  });
}

export async function setPaymentRequestStatus(_: ActionState, fd: FormData) {
  return run(async () => {
    const { user, team } = await teamAdmin(fd);
    const db = await getDb();
    const r = await loadRequest(db, int(fd, "id") ?? 0, team.id);
    const status = str(fd, "status") === "closed" ? "closed" : "open";
    await db.update(paymentRequests).set({ status }).where(eq(paymentRequests.id, r.id));
    await audit(team.id, { admin: user }, status === "closed" ? "Đóng link nộp tiền" : "Mở lại link nộp tiền", r.title);
    return status === "closed" ? "Đã đóng link" : "Đã mở lại link";
  });
}

/** Admin thấy tiền về thì tích "Đã nhận": ghi khoản nộp vào quỹ (cộng vào quỹ cá nhân của người đó). */
export async function markRequestPaid(_: ActionState, fd: FormData) {
  return run(async () => {
    const { user, team } = await teamAdmin(fd);
    const db = await getDb();
    const r = await loadRequest(db, int(fd, "requestId") ?? 0, team.id);
    const [p] = await db
      .select()
      .from(players)
      .where(and(eq(players.id, int(fd, "playerId") ?? 0), eq(players.teamId, team.id)));
    if (!p) fail("Không tìm thấy thành viên.");
    const paid = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(
        and(
          eq(transactions.requestId, r.id),
          eq(transactions.playerId, p.id),
          eq(transactions.type, "deposit"),
          eq(transactions.status, "active"),
        ),
      );
    if (paid.length) fail(`${pname(p)} đã được ghi nộp rồi.`);
    await db.insert(transactions).values({
      teamId: team.id,
      fund: r.fund,
      type: "deposit",
      cashAmount: r.amount,
      playerAmount: r.amount,
      playerId: p.id,
      requestId: r.id,
      method: str(fd, "method") === "cash" ? "cash" : "transfer",
      date: todayVN(),
      note: r.title,
      createdBy: user.id,
    });
    await audit(team.id, { admin: user }, "Ghi nộp theo link", `${pname(p)} · ${r.title}: ${fmtMoney(r.amount)}`);
    return `Đã ghi ${pname(p)} nộp ${fmtMoney(r.amount)}`;
  });
}

export async function unmarkRequestPaid(_: ActionState, fd: FormData) {
  return run(async () => {
    const { user, team } = await teamAdmin(fd);
    const db = await getDb();
    const r = await loadRequest(db, int(fd, "requestId") ?? 0, team.id);
    const playerId = int(fd, "playerId") ?? 0;
    const [last] = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.teamId, team.id),
          eq(transactions.requestId, r.id),
          eq(transactions.playerId, playerId),
          eq(transactions.type, "deposit"),
          eq(transactions.status, "active"),
        ),
      )
      .orderBy(desc(transactions.id))
      .limit(1);
    if (!last) fail("Người này chưa được ghi nộp.");
    await db
      .update(transactions)
      .set({ status: "cancelled", cancelReason: "Bỏ tích đã nhận" })
      .where(eq(transactions.id, last.id));
    await audit(team.id, { admin: user }, "Bỏ tích đã nhận", `Cầu thủ #${playerId} · ${r.title}`);
    return "Đã bỏ tích";
  });
}
