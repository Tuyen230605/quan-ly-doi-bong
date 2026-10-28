// Mọi ngày giờ trong app đều theo giờ Việt Nam (UTC+7, không có giờ mùa hè).
const VN_OFFSET_MS = 7 * 3600 * 1000;

export const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;
export const WEEKDAY_NAMES: Record<number, string> = {
  1: "Thứ 2",
  2: "Thứ 3",
  3: "Thứ 4",
  4: "Thứ 5",
  5: "Thứ 6",
  6: "Thứ 7",
  7: "Chủ nhật",
};
export const WEEKDAY_SHORT: Record<number, string> = {
  1: "T2",
  2: "T3",
  3: "T4",
  4: "T5",
  5: "T6",
  6: "T7",
  7: "CN",
};

function parse(date: string): [number, number, number] {
  const [y, m, d] = date.split("-").map(Number);
  return [y, m, d];
}

export function vnParts(at: Date = new Date()) {
  const iso = new Date(at.getTime() + VN_OFFSET_MS).toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
}

export function todayVN() {
  return vnParts().date;
}

export function vnToDate(date: string, time = "00:00"): Date {
  const [y, m, d] = parse(date);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(Date.UTC(y, m - 1, d, hh, mm) - VN_OFFSET_MS);
}

export function addDays(date: string, n: number): string {
  const [y, m, d] = parse(date);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** 1 = thứ 2 ... 7 = chủ nhật */
export function weekdayOf(date: string): number {
  const [y, m, d] = parse(date);
  const w = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return w === 0 ? 7 : w;
}

export function mondayOf(date: string) {
  return addDays(date, 1 - weekdayOf(date));
}

export function monthOf(date: string) {
  return date.slice(0, 7);
}

export function monthRange(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${ym}-01`, to: `${ym}-${String(last).padStart(2, "0")}` };
}

export function addMonths(ym: string, n: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

export function fmtDate(date: string) {
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}

export function fmtDM(date: string) {
  const [, m, d] = date.split("-");
  return `${d}/${m}`;
}

export function fmtMatchDate(date: string) {
  return `${WEEKDAY_NAMES[weekdayOf(date)]}, ${fmtDM(date)}`;
}

export function fmtMonth(ym: string) {
  const [y, m] = ym.split("-");
  return `${Number(m)}/${y}`;
}

export function fmtDateTime(at: Date) {
  const { date, time } = vnParts(at);
  return `${time} ${WEEKDAY_SHORT[weekdayOf(date)]} ${fmtDM(date)}`;
}

export function timeLeft(until: Date, now: Date = new Date()) {
  const ms = until.getTime() - now.getTime();
  if (ms <= 0) return "đã khoá";
  const mins = Math.floor(ms / 60000);
  const days = Math.floor(mins / 1440);
  const hours = Math.floor((mins % 1440) / 60);
  if (days > 0) return `còn ${days} ngày ${hours} giờ`;
  if (hours > 0) return `còn ${hours} giờ ${mins % 60} phút`;
  return `còn ${mins} phút`;
}

/**
 * Hạn chót vote = lần gần nhất của (thứ, giờ) đã chọn, trước giờ bắt đầu buổi đá đầu tiên trong tuần.
 */
export function computeDeadline(
  firstDate: string,
  firstTime: string,
  deadlineWeekday: number,
  deadlineTime: string,
): Date {
  const firstStart = vnToDate(firstDate, firstTime);
  for (let back = 0; back <= 7; back++) {
    const d = addDays(firstDate, -back);
    if (weekdayOf(d) !== deadlineWeekday) continue;
    const at = vnToDate(d, deadlineTime);
    if (at < firstStart) return at;
  }
  return firstStart;
}

/** Hạn chót vote cho buổi đá ngày `date` của một lịch cố định. */
export function weekDeadline(
  s: { weekdays: number[]; startDate: string; startTime: string; deadlineWeekday: number; deadlineTime: string },
  date: string,
): Date {
  const monday = mondayOf(date);
  const days = [...s.weekdays]
    .sort((a, b) => a - b)
    .map((w) => addDays(monday, w - 1))
    .filter((d) => d >= s.startDate);
  const first = days[0] && days[0] <= date ? days[0] : date;
  return computeDeadline(first, s.startTime, s.deadlineWeekday, s.deadlineTime);
}
