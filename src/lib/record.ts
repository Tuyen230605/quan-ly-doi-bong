import { isOutcome, type Outcome } from "./labels";

export type PlayedMatch = {
  id: number;
  date: string;
  startTime: string;
  outcome: string | null; // win | draw | loss | none (không tính); null = chưa nhập
  goalsFor: number | null;
  goalsAgainst: number | null;
  people: number; // số người có đá
};

export type TeamRecord = {
  played: number; // số trận đã nhập kết quả
  win: number;
  draw: number;
  loss: number;
  winRate: number | null;
  goalsFor: number;
  goalsAgainst: number;
  scored: number; // số trận có nhập tỉ số
  longestWin: number;
  longestUnbeaten: number; // thắng hoặc hoà liên tiếp
  current: { outcome: Outcome; length: number } | null; // chuỗi đang có, tính từ trận gần nhất
  form: Outcome[]; // 5 trận gần nhất, mới nhất đứng đầu
  avgPeople: number | null; // trung bình người/trận (mọi buổi đã chốt)
  maxPeople: number;
  total: number; // số buổi đã chốt
  missing: number; // buổi đã chốt mà chưa nhập kết quả (không tính buổi chọn "không tính")
};

/** Thành tích của đội từ các buổi đã chốt. Chỉ trận có kết quả mới tính thắng/hoà/thua và chuỗi. */
export function teamRecord(matches: PlayedMatch[]): TeamRecord {
  const all = [...matches].sort((a, b) => (a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date < b.date ? -1 : 1));
  const done = all.filter((m): m is PlayedMatch & { outcome: Outcome } => isOutcome(m.outcome));
  const count = (o: Outcome) => done.filter((m) => m.outcome === o).length;
  let longestWin = 0;
  let longestUnbeaten = 0;
  let win = 0;
  let unbeaten = 0;
  for (const m of done) {
    win = m.outcome === "win" ? win + 1 : 0;
    unbeaten = m.outcome === "loss" ? 0 : unbeaten + 1;
    longestWin = Math.max(longestWin, win);
    longestUnbeaten = Math.max(longestUnbeaten, unbeaten);
  }
  const recent = [...done].reverse();
  let current: TeamRecord["current"] = null;
  if (recent.length) {
    const outcome = recent[0].outcome;
    const n = recent.findIndex((m) => m.outcome !== outcome);
    current = { outcome, length: n < 0 ? recent.length : n };
  }
  const withScore = done.filter((m) => m.goalsFor != null && m.goalsAgainst != null);
  return {
    played: done.length,
    win: count("win"),
    draw: count("draw"),
    loss: count("loss"),
    winRate: done.length ? count("win") / done.length : null,
    goalsFor: withScore.reduce((s, m) => s + m.goalsFor!, 0),
    goalsAgainst: withScore.reduce((s, m) => s + m.goalsAgainst!, 0),
    scored: withScore.length,
    longestWin,
    longestUnbeaten,
    current,
    form: recent.slice(0, 5).map((m) => m.outcome),
    avgPeople: all.length ? all.reduce((s, m) => s + m.people, 0) / all.length : null,
    maxPeople: all.reduce((s, m) => Math.max(s, m.people), 0),
    total: all.length,
    missing: all.filter((m) => m.outcome == null).length,
  };
}
