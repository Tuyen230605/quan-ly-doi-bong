export type Fund = "ball" | "penalty";
export type SplitMethod = "equal" | "fixed" | "guest_fixed" | "fund";

export const FUND_NAMES: Record<Fund, string> = { ball: "Quỹ bóng", penalty: "Quỹ phạt" };

export const SPLIT_METHODS: Record<SplitMethod, string> = {
  equal: "Chia đều",
  fixed: "Giá cố định mỗi người",
  guest_fixed: "Khách giá riêng, thành viên chia đều phần còn lại",
  fund: "Quỹ bao (không trừ ai)",
};

export const TX_TYPES: Record<string, string> = {
  deposit: "Nộp tiền",
  match_fee: "Tiền trận",
  match_cost: "Chi phí trận",
  advance: "Cầu thủ trả hộ",
  penalty: "Phạt",
  fine_pay: "Trừ quỹ cá nhân nộp phạt",
  expense: "Chi",
  income: "Thu khác",
  transfer_out: "Chuyển quỹ (đi)",
  transfer_in: "Chuyển quỹ (đến)",
  adjust: "Điều chỉnh",
};

export const EXPENSE_CATEGORIES = ["Tiền sân", "Nước", "Trọng tài", "Dụng cụ", "Áo đấu", "Liên hoan", "Khác"];

export const METHODS: Record<string, string> = { cash: "Tiền mặt", transfer: "Chuyển khoản" };

export function fmtMoney(n: number) {
  const s = String(Math.abs(Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${n < 0 ? "-" : ""}${s}đ`;
}

export function fmtK(n: number) {
  const k = Math.round(n / 100) / 10;
  return `${String(k).replace(".", ",")}k`;
}

export function parseMoney(v: FormDataEntryValue | null | undefined): number {
  if (v == null) return 0;
  const s = String(v).replace(/[^\d-]/g, "");
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : 0;
}

export function roundUp(n: number, step: number) {
  if (n <= 0) return 0;
  return step > 0 ? Math.ceil(n / step) * step : Math.ceil(n);
}

export type FeeInput = {
  total: number;
  method: SplitMethod;
  step: number;
  fixedFee: number;
  guestFee: number;
  people: { playerId: number; isGuest: boolean; override?: number | null }[];
};

export function computeFees(input: FeeInput) {
  const { total, method, step, people } = input;
  const guests = people.filter((p) => p.isGuest).length;
  const members = people.length - guests;
  let memberFee = 0;
  let guestFee = 0;
  if (method === "equal") {
    memberFee = guestFee = people.length ? roundUp(total / people.length, step) : 0;
  } else if (method === "fixed") {
    memberFee = guestFee = input.fixedFee;
  } else if (method === "guest_fixed") {
    guestFee = input.guestFee;
    const rest = Math.max(0, total - guestFee * guests);
    memberFee = members ? roundUp(rest / members, step) : 0;
  }
  const fees = new Map<number, number>();
  for (const p of people) {
    const base = p.isGuest ? guestFee : memberFee;
    fees.set(p.playerId, p.override != null ? p.override : base);
  }
  const collected = [...fees.values()].reduce((a, b) => a + b, 0);
  return { fees, memberFee, guestFee, collected, diff: collected - total };
}

export type LedgerEntry = {
  id: number;
  amount: number;
  date: string;
  type: string;
  matchId: number | null;
  refId: number | null;
};

/**
 * Tính mỗi khoản nợ (tiền trận, phạt...) đã được trả bao nhiêu.
 * - Khoản nộp gắn với một khoản nợ (refId) hoặc một trận (matchId) thì trả cho khoản đó trước.
 * - Phần còn lại và các khoản nộp không gắn gì thì trả cho khoản nợ cũ nhất trước.
 */
export function allocatePayments(entries: LedgerEntry[]): Map<number, number> {
  const order = (a: LedgerEntry, b: LedgerEntry) => (a.date === b.date ? a.id - b.id : a.date < b.date ? -1 : 1);
  const debits = entries.filter((e) => e.amount < 0).sort(order);
  const credits = entries.filter((e) => e.amount > 0).sort(order);
  const remaining = new Map(debits.map((d) => [d.id, -d.amount]));
  const paid = new Map(debits.map((d) => [d.id, 0]));
  const apply = (id: number, amount: number) => {
    const x = Math.min(amount, remaining.get(id) ?? 0);
    remaining.set(id, (remaining.get(id) ?? 0) - x);
    paid.set(id, (paid.get(id) ?? 0) + x);
    return x;
  };

  let pool = 0;
  for (const c of credits) {
    let amount = c.amount;
    const target =
      (c.refId != null && debits.find((d) => d.id === c.refId)) ||
      (c.matchId != null && debits.find((d) => d.matchId === c.matchId && d.type !== "penalty")) ||
      undefined;
    if (target) amount -= apply(target.id, amount);
    pool += amount;
  }
  for (const d of debits) {
    if (pool <= 0) break;
    pool -= apply(d.id, pool);
  }
  return paid;
}
