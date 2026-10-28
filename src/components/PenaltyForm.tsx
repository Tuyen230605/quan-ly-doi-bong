"use client";

import { useState, useTransition } from "react";
import { addPenalties } from "@/actions/money";
import type { ActionState } from "@/lib/action";
import { useTeamId } from "./TeamContext";
import { fmtMoney, parseMoney } from "@/lib/money";

type Type = { id: number; name: string; amountMode: string; defaultAmount: number; isNoShow: boolean };
type Row = { key: number; playerId: number; name: string; typeId: number; amount: number; note: string; checked: boolean; suggested: boolean };

/**
 * Danh sách phạt của 1 buổi: web gợi ý người vắng không báo (mức phạt = tiền trận mỗi người),
 * admin tích chọn, sửa số tiền, thêm tay người khác / lỗi khác.
 */
export function PenaltyForm({
  matchId,
  suggestions,
  types,
  players,
  memberFee,
}: {
  matchId: number | null;
  suggestions: { playerId: number; name: string }[];
  types: Type[];
  players: { id: number; name: string }[];
  memberFee: number | null;
}) {
  const amountFor = (t: Type | undefined) =>
    t ? (t.amountMode === "match_fee" && memberFee ? memberFee : t.defaultAmount) : 0;
  const noShow = types.find((t) => t.isNoShow) ?? types[0];
  const [rows, setRows] = useState<Row[]>(
    suggestions.map((s, i) => ({
      key: i,
      playerId: s.playerId,
      name: s.name,
      typeId: noShow?.id ?? 0,
      amount: amountFor(noShow),
      note: "",
      checked: true,
      suggested: true,
    })),
  );
  const [nextKey, setNextKey] = useState(suggestions.length);
  const [state, setState] = useState<ActionState>(null);
  const [pending, start] = useTransition();
  const teamId = useTeamId();

  const update = (key: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const addRow = () => {
    const t = types.find((x) => !x.isNoShow) ?? types[0];
    setRows((rs) => [...rs, { key: nextKey, playerId: 0, name: "", typeId: t?.id ?? 0, amount: amountFor(t), note: "", checked: true, suggested: false }]);
    setNextKey((k) => k + 1);
  };
  const chosen = rows.filter((r) => r.checked && r.playerId && r.amount > 0);
  const total = chosen.reduce((s, r) => s + r.amount, 0);

  const submit = () =>
    start(async () => {
      const res = await addPenalties(
        teamId ?? 0,
        matchId,
        chosen.map((r) => ({ playerId: r.playerId, typeId: r.typeId, amount: r.amount, note: r.note })),
        rows.filter((r) => r.suggested && !r.checked).map((r) => ({ name: r.name, note: r.note })),
      );
      setState(res);
      if (res?.ok) setRows([]);
    });

  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.key} className={`rounded-xl border p-3 ${r.checked ? "border-red-200 bg-red-50/40" : "border-gray-200"}`}>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              className="size-5 accent-red-600"
              checked={r.checked}
              onChange={(e) => update(r.key, { checked: e.target.checked })}
            />
            {r.suggested ? (
              <span className="font-medium">
                {r.name} <span className="chip bg-red-100 text-red-700">Vắng không báo</span>
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
          <div className="mt-2 grid grid-cols-2 gap-2">
            <select
              className="input"
              value={r.typeId}
              onChange={(e) => {
                const t = types.find((x) => x.id === Number(e.target.value));
                update(r.key, { typeId: Number(e.target.value), amount: amountFor(t) });
              }}
            >
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <input
              className="input text-right"
              inputMode="numeric"
              value={r.amount ? r.amount.toLocaleString("vi-VN") : ""}
              placeholder="Số tiền"
              onChange={(e) => update(r.key, { amount: parseMoney(e.target.value) })}
            />
          </div>
          <input
            className="input mt-2 !text-sm"
            placeholder={r.checked ? "Ghi chú (không bắt buộc)" : "Lý do miễn phạt (ốm, việc gấp…)"}
            value={r.note}
            onChange={(e) => update(r.key, { note: e.target.value })}
          />
        </div>
      ))}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" className="btn" onClick={addRow}>
          + Thêm người bị phạt
        </button>
        {rows.length > 0 && (
          <span className="text-sm">
            Tổng: <b>{fmtMoney(total)}</b> → quỹ phạt
          </span>
        )}
      </div>
      {state?.error && !pending && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.ok && !pending && <p className="text-sm text-green-700">✓ {state.ok}</p>}
      {rows.length > 0 && (
        <button type="button" className="btn btn-primary w-full" disabled={pending || !chosen.length} onClick={submit}>
          {pending ? "Đang lưu…" : `Xác nhận phạt ${chosen.length} khoản`}
        </button>
      )}
    </div>
  );
}
