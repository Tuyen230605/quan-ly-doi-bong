"use server";

import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { audit, fail, int, optStr, run, str, type ActionState } from "@/lib/action";
import { parseMoney } from "@/lib/money";
import { teamAdmin } from "@/lib/team";

const { funds, penaltyTypes, venues } = schema;

/** Tài khoản nhận tiền của quỹ: ảnh QR admin tải lên + ngân hàng/số TK (web đọc từ ảnh hoặc nhập tay). */
export async function saveFund(_: ActionState, fd: FormData) {
  return run(async () => {
    const { user, team } = await teamAdmin(fd);
    const db = await getDb();
    const code = str(fd, "code") === "penalty" ? "penalty" : "ball";
    const image = str(fd, "qrImage");
    if (image && !image.startsWith("data:image/")) fail("Ảnh QR không hợp lệ.");
    if (image.length > 1_500_000) fail("Ảnh quá lớn, hãy chọn ảnh nhỏ hơn.");
    const accountNo = str(fd, "accountNo").replace(/\s/g, "");
    if (accountNo && !/^[0-9A-Za-z]{4,19}$/.test(accountNo)) fail("Số tài khoản chỉ gồm chữ số (4–19 ký tự).");
    const bankBin = str(fd, "bankBin");
    if (bankBin && !/^\d{6}$/.test(bankBin)) fail("Mã ngân hàng không hợp lệ.");
    if (accountNo && !bankBin) fail("Chọn ngân hàng cho số tài khoản.");
    await db
      .update(funds)
      .set({
        bankBin: bankBin || null,
        accountNo: accountNo || null,
        accountName: optStr(fd, "accountName")?.toUpperCase() ?? null,
        qrImage: image || null,
      })
      .where(and(eq(funds.teamId, team.id), eq(funds.code, code)));
    await audit(team.id, { admin: user }, "Sửa tài khoản nhận tiền", code === "ball" ? "Quỹ bóng" : "Quỹ phạt");
  });
}

export async function savePenaltyType(_: ActionState, fd: FormData) {
  return run(async () => {
    const { user, team } = await teamAdmin(fd);
    const db = await getDb();
    const id = int(fd, "id");
    const v = {
      name: str(fd, "name"),
      amountMode: str(fd, "amountMode") === "match_fee" ? "match_fee" : "fixed",
      defaultAmount: parseMoney(fd.get("defaultAmount")),
      isNoShow: fd.get("isNoShow") === "on",
      isNoVoteCame: fd.get("isNoVoteCame") === "on",
      enabled: fd.get("enabled") === "on",
    };
    if (!v.name) fail("Nhập tên lỗi.");
    if (v.isNoShow) await db.update(penaltyTypes).set({ isNoShow: false }).where(eq(penaltyTypes.teamId, team.id));
    if (v.isNoVoteCame) await db.update(penaltyTypes).set({ isNoVoteCame: false }).where(eq(penaltyTypes.teamId, team.id));
    if (id)
      await db
        .update(penaltyTypes)
        .set(v)
        .where(and(eq(penaltyTypes.id, id), eq(penaltyTypes.teamId, team.id)));
    else await db.insert(penaltyTypes).values({ ...v, teamId: team.id });
    await audit(team.id, { admin: user }, id ? "Sửa loại lỗi phạt" : "Thêm loại lỗi phạt", v.name);
  });
}

export async function saveVenue(_: ActionState, fd: FormData) {
  return run(async () => {
    const { user, team } = await teamAdmin(fd);
    const db = await getDb();
    const id = int(fd, "id");
    const v = {
      name: str(fd, "name"),
      address: optStr(fd, "address"),
      mapUrl: optStr(fd, "mapUrl"),
      fieldCost: parseMoney(fd.get("fieldCost")),
    };
    if (!v.name) fail("Nhập tên sân.");
    if (id)
      await db
        .update(venues)
        .set(v)
        .where(and(eq(venues.id, id), eq(venues.teamId, team.id)));
    else await db.insert(venues).values({ ...v, teamId: team.id });
    await audit(team.id, { admin: user }, id ? "Sửa sân" : "Thêm sân", v.name);
  });
}
