"use client";

import { useState, useTransition } from "react";
import { addPenalties } from "@/actions/money";
import type { ActionState } from "@/lib/action";
import { fmtMoney, parseMoney } from "@/lib/money";
import { useTeamId } from "./TeamContext";

type Type = { id: number; name: string; amountMode: string; defaultAmount: number; isNoShow: boolean; isNoVoteCame: boolean };
type Kind = "noshow" | "novote_came";
type Row = {
  key: number;
  playerId: number;
  name: string;
  typeId: number; // 0 = lỗi khác, admin tự ghi tên lỗi
  reason: string;
  amount: number;
  note: string;
  checked: boolean;
  kind: Kind | null; // null = admin tự thêm
};
type Person = { id: number; name: string; present?: boolean };

const KIND_BADGE: Record<Kind, { text: string; cls: string }> = {
  noshow: { text: "Vote đi mà không đến", cls: "bg-red-100 text-red-700" },
  novote_came: { text: "Không vote mà đi", cls: "bg-amber-100 text-amber-800" },
};

/**
 * Danh sách phạt của 1 buổi. Web gợi ý:
 * - vote đi mà không đến: tick sẵn, mức phạt = tiền trận mỗi người;
 * - không vote mà đi: không tick sẵn, admin tuỳ phạt hoặc chỉ ghi chú.
 * Admin sửa số tiền, thêm tay người khác / lỗi khác, hoặc "tích nhanh" nhiều người cùng một lỗi (VD đi muộn).
 * Xác nhận xong, tiền phạt trừ vào quỹ cá nhân của từng người.
 */
export function PenaltyForm({
  matchId,
  suggestions,
  types,
  players,
  memberFee,
}: {
  matchId: number | null;
  suggestions: { playerId: number; name: string; kind: Kind }[];
  types: Type[];
  players: Person[]; // present = có đá buổi này (lên đầu khi tích nhanh)
  memberFee: number | null;
}) {
  const amountFor = (t: Type | undefined) =>
    t ? (t.amountMode === "match_fee" && memberFee ? memberFee : t.defaultAmount) : 0;
  const typeFor = (kind: Kind | null) =>
    (kind === "noshow"
      ? types.find((t) => t.isNoShow)
      : kind === "novote_came"
        ? types.find((t) => t.isNoVoteCame)
        : types.find((t) => !t.isNoShow && !t.isNoVoteCame)) ?? types[0];
  const makeRow = (key: number, playerId: number, name: string, kind: Kind | null): Row => {
    const t = typeFor(kind);
    return { key, playerId, name, typeId: t?.id ?? 0, reason: "", amount: amountFor(t), note: "", checked: kind !== "novote_came", kind };
  };
  const [rows, setRows] = useState<Row[]>(suggestions.map((s, i) => makeRow(i, s.playerId, s.name, s.kind)));
  const [nextKey, setNextKey] = useState(suggestions.length);
  const quickDefault = typeFor(null);
  const [quick, setQuick] = useState({ typeId: quickDefault?.id ?? 0, reason: "", amount: amountFor(quickDefault), note: "" });
  const [picked, setPicked] = useState<number[]>([]);
  const [state, setState] = useState<ActionState>(null);
  const [pending, start] = useTransition();
  const teamId = useTeamId();

  const update = (key: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const addRow = () => {
    setRows((rs) => [...rs, makeRow(nextKey, 0, "", null)]);
    setNextKey((k) => k + 1);
  };
  const addQuick = () => {
    const add = picked.map((id, i): Row => ({
      key: nextKey + i,
      playerId: id,
      name: players.find((p) => p.id === id)?.name ?? "",
      typeId: quick.typeId,
      reason: quick.reason,
      amount: quick.amount,
      note: quick.note,
      checked: true,
      kind: null,
    }));
    setRows((rs) => [...rs, ...add]);
    setNextKey((k) => k + add.length);
    setPicked([]);
  };
  const ordered = [...players.filter((p) => p.present), ...players.filter((p) => !p.present)];
  const hasPresent = players.some((p) => p.present);
  const chosen = rows.filter((r) => r.checked && r.playerId && r.amount > 0);
  const notesOnly = rows.filter((r) => r.kind && !r.checked && r.note.trim());
  const total = chosen.reduce((s, r) => s + r.amount, 0);

  const submit = () =>
    start(async () => {
      const res = await addPenalties(
        teamId ?? 0,
        matchId,
        chosen.map((r) => ({ playerId: r.playerId, typeId: r.typeId, amount: r.amount, note: r.note, reason: r.reason })),
        rows.filter((r) => r.kind && !r.checked).map((r) => ({ playerId: r.playerId, name: r.name, note: r.note })),
      );
      setState(res);
      if (res?.ok) setRows([]);
    });

  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div
          key={r.key}
          data-player={r.name}
          className={`rounded-xl border p-3 ${r.checked ? "border-red-200 bg-red-50/40" : "border-gray-200"}`}
        >
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              aria-label="Phạt"
              className="size-5 accent-red-600"
              checked={r.checked}
              onChange={(e) => update(r.key, { checked: e.target.checked })}
            />
            {r.kind ? (
              <span className="font-medium">
                {r.name} <span className={`chip ${KIND_BADGE[r.kind].cls}`}>{KIND_BADGE[r.kind].text}</span>
              </span>
            ) : (
              <select className="input" value={r.playerId || ""} onChange={(e) => update(r.key, { playerId: Number(e.target.value) })}>
                <option value="">Chọn người…</option>
                {players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          {r.checked && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <TypeSelect
                types={types}
                value={r.typeId}
                onChange={(typeId) => update(r.key, { typeId, amount: typeId ? amountFor(types.find((x) => x.id === typeId)) : r.amount })}
              />
              <input
                className="input text-right"
                inputMode="numeric"
                value={r.amount ? r.amount.toLocaleString("vi-VN") : ""}
                placeholder="Số tiền"
                onChange={(e) => update(r.key, { amount: parseMoney(e.target.value) })}
              />
              {r.typeId === 0 && (
                <input
                  className="input col-span-2"
                  placeholder="Tên lỗi, VD: Đá xấu"
                  value={r.reason}
                  onChange={(e) => update(r.key, { reason: e.target.value })}
                />
              )}
            </div>
          )}
          <input
            className="input mt-2 !text-sm"
            name="note"
            placeholder={r.checked ? "Ghi chú (không bắt buộc)" : "Không phạt, chỉ ghi chú (VD lần đầu, ốm…)"}
            value={r.note}
            onChange={(e) => update(r.key, { note: e.target.value })}
          />
        </div>
      ))}
      <div className="space-y-2 rounded-xl border border-dashed border-gray-300 p-3" data-quick>
        <p className="text-sm font-semibold text-gray-700">Tích nhanh nhiều người cùng lỗi</p>
        <div className="grid grid-cols-2 gap-2">
          <TypeSelect
            types={types}
            value={quick.typeId}
            onChange={(typeId) =>
              setQuick((q) => ({ ...q, typeId, amount: typeId ? amountFor(types.find((x) => x.id === typeId)) : q.amount }))
            }
          />
          <input
            className="input text-right"
            inputMode="numeric"
            aria-label="Số tiền phạt mỗi người"
            value={quick.amount ? quick.amount.toLocaleString("vi-VN") : ""}
            placeholder="Số tiền / người"
            onChange={(e) => setQuick((q) => ({ ...q, amount: parseMoney(e.target.value) }))}
          />
          {quick.typeId === 0 && (
            <input
              className="input col-span-2"
              placeholder="Tên lỗi, VD: Đá xấu"
              value={quick.reason}
              onChange={(e) => setQuick((q) => ({ ...q, reason: e.target.value }))}
            />
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {ordered.map((p, i) => {
            const on = picked.includes(p.id);
            return (
              <span key={p.id} className="contents">
                {hasPresent && i === players.filter((x) => x.present).length && (
                  <span className="w-full text-xs text-gray-400">Không đá buổi này:</span>
                )}
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => setPicked((ids) => (on ? ids.filter((x) => x !== p.id) : [...ids, p.id]))}
                  className={`chip !px-2.5 !py-1 !text-sm ${on ? "bg-red-600 text-white" : "bg-gray-100 text-gray-700"}`}
                >
                  {on ? "✓ " : ""}
                  {p.name}
                </button>
              </span>
            );
          })}
        </div>
        <input
          className="input !text-sm"
          placeholder="Ghi chú (không bắt buộc), VD: muộn 15 phút"
          value={quick.note}
          onChange={(e) => setQuick((q) => ({ ...q, note: e.target.value }))}
        />
        <button
          type="button"
          className="btn w-full"
          disabled={!picked.length || quick.amount <= 0 || (quick.typeId === 0 && !quick.reason.trim())}
          onClick={addQuick}
        >
          + Thêm {picked.length || ""} người vào danh sách phạt
        </button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" className="btn" onClick={addRow}>
          + Thêm 1 người bị phạt
        </button>
        {rows.length > 0 && (
          <span className="text-sm">
            Tổng: <b>{fmtMoney(total)}</b> trừ quỹ cá nhân → quỹ phạt
          </span>
        )}
      </div>
      {state?.error && !pending && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.ok && !pending && <p className="text-sm text-green-700">✓ {state.ok}</p>}
      {rows.length > 0 && (
        <button
          type="button"
          className="btn btn-primary w-full"
          disabled={pending || (!chosen.length && !notesOnly.length)}
          onClick={submit}
        >
          {pending
            ? "Đang lưu…"
            : chosen.length
              ? `Xác nhận phạt ${chosen.length} khoản${notesOnly.length ? ` + ${notesOnly.length} ghi chú` : ""}`
              : `Lưu ${notesOnly.length} ghi chú`}
        </button>
      )}
    </div>
  );
}

function TypeSelect({ types, value, onChange }: { types: Type[]; value: number; onChange: (typeId: number) => void }) {
  return (
    <select className="input" aria-label="Lỗi" value={value} onChange={(e) => onChange(Number(e.target.value))}>
      {types.map((t) => (
        <option key={t.id} value={t.id}>
          {t.name}
        </option>
      ))}
      <option value={0}>Lỗi khác (tự ghi)…</option>
    </select>
  );
}
