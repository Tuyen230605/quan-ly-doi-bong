export type Result = "ontime" | "noshow" | "excused" | "novote" | "changed" | "extra";

export const KIND_LABELS: Record<string, string> = {
  internal: "Đá nội bộ",
  friendly: "Giao hữu",
  tournament: "Giải đấu",
};

export const POSITIONS: Record<string, string> = { GK: "Thủ môn", DF: "Hậu vệ", MF: "Tiền vệ", FW: "Tiền đạo" };

export const RESULT_LABELS: Record<Result, string> = {
  ontime: "Có đá",
  noshow: "Vắng không báo",
  excused: "Nghỉ có báo",
  novote: "Không vote, không đến",
  changed: "Vote nghỉ nhưng vẫn đến",
  extra: "Có đá (ngoài lịch)",
};
