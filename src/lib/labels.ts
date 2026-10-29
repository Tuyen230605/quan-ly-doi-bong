export type Result = "ontime" | "noshow" | "excused" | "novote" | "novote_came" | "changed" | "extra";
export type VoteChoice = "going" | "absent";

export const KIND_LABELS: Record<string, string> = {
  internal: "Đá nội bộ",
  friendly: "Giao hữu",
  tournament: "Giải đấu",
};

export const POSITIONS: Record<string, string> = { GK: "Thủ môn", DF: "Hậu vệ", MF: "Tiền vệ", FW: "Tiền đạo" };

export const RESULT_LABELS: Record<Result, string> = {
  ontime: "Vote đi, có đá",
  noshow: "Vote đi mà không đến",
  excused: "Nghỉ có báo",
  novote: "Không vote, không đến",
  novote_came: "Không vote mà đi",
  changed: "Vote nghỉ nhưng vẫn đến",
  extra: "Có đá (ngoài danh sách)",
};

export const VOTE_MODE_TEXT: Record<string, string> = {
  absent: "Vote nghỉ: không vote = đi",
  going: "Vote đi: không vote = không đi",
};

/**
 * Kết quả của 1 người sau trận, từ vote + có đá hay không.
 * - Không có vote (buổi không bật vote) hoặc người ngoài danh sách: chỉ ghi nhận có đá.
 * - Chế độ "vote nghỉ": không vote coi như vote đi.
 * - Chế độ "vote đi": không vote coi như không đi; không vote mà vẫn đến là một hạng mục riêng.
 */
export function resultOf(o: {
  hasVote: boolean;
  inRoster: boolean;
  voteMode: string | null;
  voteChoice: VoteChoice | null;
  present: boolean;
}): Result | null {
  if (!o.hasVote || !o.inRoster) return o.present ? "extra" : null;
  const v = o.voteChoice ?? (o.voteMode === "going" ? null : "going");
  if (v === "going") return o.present ? "ontime" : "noshow";
  if (v === "absent") return o.present ? "changed" : "excused";
  return o.present ? "novote_came" : "novote";
}
