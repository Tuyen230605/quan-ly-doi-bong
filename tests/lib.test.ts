import { describe, expect, it } from "vitest";
import { allocatePayments, computeFees, fmtMoney, type LedgerEntry } from "../src/lib/money";
import { transferContent } from "../src/lib/text";
import { computeDeadline, vnParts, weekDeadline, weekdayOf } from "../src/lib/time";
import { buildVietQR, crc16, parseVietQR } from "../src/lib/vietqr";

describe("tiền", () => {
  it("định dạng VND", () => {
    expect(fmtMoney(55000)).toBe("55.000đ");
    expect(fmtMoney(-1240000)).toBe("-1.240.000đ");
    expect(fmtMoney(0)).toBe("0đ");
  });

  it("chia đều, làm tròn lên 1.000đ", () => {
    const people = Array.from({ length: 14 }, (_, i) => ({ playerId: i + 1, isGuest: false }));
    const r = computeFees({ total: 600000, method: "equal", step: 1000, fixedFee: 0, guestFee: 0, people });
    expect(r.memberFee).toBe(43000);
    expect(r.collected).toBe(602000);
    expect(r.diff).toBe(2000);
  });

  it("khách giá riêng, thành viên chia phần còn lại", () => {
    const people = [
      ...Array.from({ length: 10 }, (_, i) => ({ playerId: i + 1, isGuest: false })),
      { playerId: 11, isGuest: true },
      { playerId: 12, isGuest: true },
    ];
    const r = computeFees({ total: 600000, method: "guest_fixed", step: 1000, fixedFee: 0, guestFee: 70000, people });
    expect(r.guestFee).toBe(70000);
    expect(r.memberFee).toBe(46000);
    expect(r.fees.get(11)).toBe(70000);
  });

  it("sửa tay tiền một người", () => {
    const people = [
      { playerId: 1, isGuest: false },
      { playerId: 2, isGuest: false, override: 0 },
    ];
    const r = computeFees({ total: 100000, method: "equal", step: 1000, fixedFee: 0, guestFee: 0, people });
    expect(r.fees.get(1)).toBe(50000);
    expect(r.fees.get(2)).toBe(0);
  });

  const e = (id: number, amount: number, date: string, extra: Partial<LedgerEntry> = {}): LedgerEntry => ({
    id,
    amount,
    date,
    type: amount < 0 ? "match_fee" : "deposit",
    matchId: null,
    refId: null,
    ...extra,
  });

  it("tiền nộp không gắn trận trả cho trận nợ cũ nhất trước", () => {
    const paid = allocatePayments([
      e(1, -55000, "2026-10-15", { matchId: 1 }),
      e(2, -50000, "2026-10-18", { matchId: 2 }),
      e(3, 200000, "2026-10-20"),
    ]);
    expect(paid.get(1)).toBe(55000);
    expect(paid.get(2)).toBe(50000);
  });

  it("tiền nộp gắn trận trả đúng trận đó", () => {
    const paid = allocatePayments([
      e(1, -55000, "2026-10-15", { matchId: 1 }),
      e(2, -50000, "2026-10-18", { matchId: 2 }),
      e(3, 50000, "2026-10-20", { matchId: 2 }),
    ]);
    expect(paid.get(1)).toBe(0);
    expect(paid.get(2)).toBe(50000);
  });

  it("nộp trước rồi mới đá thì tự trả", () => {
    const paid = allocatePayments([e(1, 300000, "2026-10-01"), e(2, -55000, "2026-10-15", { matchId: 1 })]);
    expect(paid.get(2)).toBe(55000);
  });

  it("trả thiếu", () => {
    const paid = allocatePayments([e(1, 20000, "2026-10-01"), e(2, -55000, "2026-10-15", { matchId: 1 })]);
    expect(paid.get(2)).toBe(20000);
  });
});

describe("thời gian", () => {
  it("thứ trong tuần", () => {
    expect(weekdayOf("2026-10-29")).toBe(4); // thứ 5
    expect(weekdayOf("2026-11-01")).toBe(7); // chủ nhật
    expect(weekdayOf("2026-11-02")).toBe(1); // thứ 2
  });

  it("hạn vote 23:59 chủ nhật trước buổi thứ 4", () => {
    const d = computeDeadline("2026-11-04", "19:00", 7, "23:59");
    expect(vnParts(d)).toEqual({ date: "2026-11-01", time: "23:59" });
  });

  it("hạn vote 12:00 thứ 3 cùng tuần", () => {
    const d = computeDeadline("2026-11-04", "19:00", 2, "12:00");
    expect(vnParts(d)).toEqual({ date: "2026-11-03", time: "12:00" });
  });

  it("lịch 2 buổi/tuần dùng chung 1 hạn chót", () => {
    const s = { weekdays: [5, 2], startDate: "2026-10-01", startTime: "19:00", deadlineWeekday: 7, deadlineTime: "23:59" };
    const tue = weekDeadline(s, "2026-11-03");
    const fri = weekDeadline(s, "2026-11-06");
    expect(tue.getTime()).toBe(fri.getTime());
    expect(vnParts(fri)).toEqual({ date: "2026-11-01", time: "23:59" });
  });
});

describe("VietQR", () => {
  it("CRC16-CCITT-FALSE", () => {
    expect(crc16("123456789")).toBe("29B1");
  });

  it("đúng cấu trúc EMVCo", () => {
    const p = buildVietQR({ bin: "970403", accountNo: "0011012345678", amount: 10000, content: "Chuyen tien" });
    expect(p.startsWith(
      "00020101021238570010A00000072701270006970403011300110123456780208QRIBFTTA53037045405100005802VN62150811Chuyen tien6304",
    )).toBe(true);
    expect(p).toHaveLength(p.indexOf("6304") + 8);
  });

  it("đọc lại ngân hàng + số tài khoản từ QR", () => {
    const p = buildVietQR({ bin: "970436", accountNo: "0123456789", amount: 50000, content: "QB AN" });
    expect(parseVietQR(p)).toEqual({ bin: "970436", accountNo: "0123456789", name: null });
    expect(parseVietQR(buildVietQR({ bin: "970422", accountNo: "999988887777" }))?.accountNo).toBe("999988887777");
    expect(parseVietQR("https://example.com")).toBeNull();
  });

  it("nội dung chuyển khoản không dấu", () => {
    expect(transferContent("QB Tuấn Gầy T10")).toBe("QB TUAN GAY T10");
    expect(transferContent("PHAT Nguyễn Văn Đức Anh Rất Dài Quá Trời")).toHaveLength(25);
  });
});
