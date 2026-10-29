import { headers } from "next/headers";
import type { FundRow, RosterRow } from "./data";
import { FUND_NAMES, fmtMoney, type Fund } from "./money";
import { compactName, transferContent } from "./text";
import { bankName, buildVietQR } from "./vietqr";

/** going: sẽ đi (gồm cả chưa vote ở chế độ vote nghỉ); absent: chỉ người đã vote nghỉ; noVote: chưa vote. */
export function voteCounts(rows: RosterRow[]) {
  const roster = rows.filter((r) => r.inRoster);
  return {
    going: roster.filter((r) => r.going).map((r) => r.player),
    absent: roster.filter((r) => r.voteChoice === "absent").map((r) => r.player),
    noVote: roster.filter((r) => !r.vote).map((r) => r.player),
    extras: rows.filter((r) => !r.inRoster && r.present).map((r) => r.player),
  };
}

/** Mã QR của quỹ (kèm số tiền + nội dung nếu có). Không cấu hình tài khoản thì dùng ảnh QR đã dán. */
export function fundQr(fund: FundRow, opts: { amount?: number | null; content?: string | null } = {}) {
  const content = opts.content ? transferContent(opts.content) : null;
  const payload =
    fund.bankBin && fund.accountNo
      ? buildVietQR({ bin: fund.bankBin, accountNo: fund.accountNo, amount: opts.amount, content })
      : null;
  const lines = [
    fund.bankBin ? `${bankName(fund.bankBin)} · ${fund.accountNo ?? ""}` : "",
    fund.accountName ?? "",
    opts.amount ? `Số tiền: ${fmtMoney(opts.amount)}` : "",
    content ? `Nội dung: ${content}` : "",
  ].filter(Boolean);
  const copies = [
    ...(fund.accountNo ? [{ label: "Copy số TK", value: fund.accountNo }] : []),
    ...(content ? [{ label: "Copy nội dung", value: content }] : []),
  ];
  return { payload, image: payload ? null : fund.qrImage, lines, copies, content, configured: !!(payload || fund.qrImage) };
}

/** Nội dung chuyển khoản theo link nộp tiền: tên người nộp + chữ admin thêm (VD "AN T11"). */
export function requestContent(note: string | null, playerName: string) {
  return transferContent(`${playerName}${note ? ` ${note}` : ""}`);
}

export function defaultContent(fund: Fund, nickname: string | null, extra?: string) {
  const who = nickname ? ` ${compactName(nickname)}` : "";
  return `${fund === "ball" ? "QB" : "PHAT"}${who}${extra ? ` ${extra}` : ""}`;
}

export function fundTitle(fund: Fund) {
  return FUND_NAMES[fund];
}

export async function siteOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
