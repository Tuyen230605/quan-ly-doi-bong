import Link from "next/link";
import { RESULT_LABELS, type Result } from "@/lib/labels";
import { fmtMoney } from "@/lib/money";

export function Money({
  v,
  color = false,
  fit = false,
  className = "",
}: {
  v: number;
  color?: boolean;
  fit?: boolean; // ô hẹp (3 ô một hàng): số càng dài chữ càng nhỏ để không xuống dòng
  className?: string;
}) {
  const tone = color ? (v < 0 ? "text-red-600" : v > 0 ? "text-green-700" : "text-gray-500") : "";
  const s = fmtMoney(v);
  const size = fit ? (s.length <= 8 ? "" : s.length <= 10 ? "text-[13px]" : "text-[12px]") : "";
  return <span className={`tabular-nums ${tone} ${size} ${className}`}>{s}</span>;
}

export function Card({
  title,
  right,
  children,
  className = "",
  id,
}: {
  title?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`card ${className}`}>
      {(title || right) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="h2">{title}</h2>}
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

export function PageTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h1 className="text-xl font-bold text-gray-900">{children}</h1>
      {right}
    </div>
  );
}

const TONES = {
  green: "bg-green-100 text-green-800",
  red: "bg-red-100 text-red-700",
  amber: "bg-amber-100 text-amber-800",
  gray: "bg-gray-100 text-gray-600",
  blue: "bg-blue-100 text-blue-700",
};

export function Badge({ tone = "gray", children }: { tone?: keyof typeof TONES; children: React.ReactNode }) {
  return <span className={`chip ${TONES[tone]}`}>{children}</span>;
}

const RESULT_TONES: Record<Result, keyof typeof TONES> = {
  ontime: "green",
  noshow: "red",
  excused: "amber",
  novote: "gray",
  novote_came: "amber",
  changed: "blue",
  extra: "green",
};

export function ResultBadge({ result }: { result: Result | null }) {
  if (!result) return null;
  return <Badge tone={RESULT_TONES[result]}>{RESULT_LABELS[result]}</Badge>;
}

export function PayBadge({ fee, paid }: { fee: number; paid: number }) {
  if (fee <= 0) return <Badge>Miễn</Badge>;
  if (paid >= fee) return <Badge tone="green">✅ Đã trả</Badge>;
  if (paid > 0) return <Badge tone="amber">Thiếu {fmtMoney(fee - paid)}</Badge>;
  return <Badge tone="red">Chưa trả</Badge>;
}

export function Stat({
  label,
  value,
  sub,
  href,
  compact = false,
  className = "",
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  href?: string;
  compact?: boolean; // 3 ô một hàng trên điện thoại
  className?: string;
}) {
  const body = (
    <>
      <div className="truncate text-xs text-gray-500">{label}</div>
      <div className={`mt-0.5 font-bold text-gray-900 ${compact ? "text-[15px] whitespace-nowrap" : "text-lg"}`}>{value}</div>
      {sub && <div className="mt-0.5 truncate text-xs text-gray-500">{sub}</div>}
    </>
  );
  const cls = `min-w-0 rounded-xl border border-gray-200 bg-gray-50 py-2 ${compact ? "px-2.5" : "px-3"} ${className}`;
  return href ? (
    <Link href={href} className={`${cls} block hover:bg-gray-100`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-3 text-center text-sm text-gray-500">{children}</p>;
}

export function Tabs({ items }: { items: { href: string; label: React.ReactNode; active: boolean }[] }) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-xl bg-gray-200/70 p-1">
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          className={`flex-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-center text-sm font-medium ${
            i.active ? "bg-white text-gray-900 shadow-sm" : "text-gray-600"
          }`}
        >
          {i.label}
        </Link>
      ))}
    </div>
  );
}

/** Khối thu gọn (không cần JS), dùng cho các form ít dùng. */
export function Fold({
  summary,
  children,
  open,
  id,
}: {
  summary: React.ReactNode;
  children: React.ReactNode;
  open?: boolean;
  id?: string;
}) {
  return (
    <details id={id} open={open} className="group rounded-xl border border-gray-200 bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-green-800">
        {summary}
        <span className="text-gray-400 transition group-open:rotate-90">›</span>
      </summary>
      <div className="border-t border-gray-100 p-4">{children}</div>
    </details>
  );
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-gray-500">{hint}</span>}
    </label>
  );
}
