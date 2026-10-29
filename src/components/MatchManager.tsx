"use client";

import { useMemo, useState, useTransition } from "react";
import { saveAttendance, settleMatch, type AttendanceItem } from "@/actions/matches";
import type { ActionState } from "@/lib/action";
import { RESULT_LABELS, resultOf, type Result, type VoteChoice } from "@/lib/labels";
import { computeFees, fmtMoney, parseMoney, SPLIT_METHODS, type SplitMethod } from "@/lib/money";

export type ManagerRow = {
  playerId: number;
  name: string;
  isGuest: boolean;
  inRoster: boolean;
  voteChoice: VoteChoice | null;
  voteReason: string | null;
  present: boolean;
  chargeToPlayerId: number | null;
};

type Person = ManagerRow & { key: number; newGuestName?: string };

type Props = {
  matchId: number;
  voteMode: string | null;
  rows: ManagerRow[];
  candidates: { id: number; name: string; isGuest: boolean; hostPlayerId: number | null }[];
  members: { id: number; name: string }[];
  costs: { field: number; water: number; referee: number; other: number };
  defaults: { method: SplitMethod; step: number; fixedFee: number; guestFee: number };
};

const RESULT_STYLE: Record<Result, string> = {
  ontime: "text-green-700",
  extra: "text-green-700",
  noshow: "font-semibold text-red-600",
  novote_came: "font-semibold text-amber-700",
  changed: "text-blue-700",
  excused: "text-gray-500",
  novote: "text-gray-400",
};
const RESULT_HINT: Partial<Record<Result, string>> = {
  noshow: " → gợi ý phạt",
  novote_came: " → tuỳ admin ghi chú / phạt",
};

const COSTS = [
  ["field", "Tiền sân"],
  ["water", "Nước"],
  ["referee", "Trọng tài"],
  ["other", "Khác"],
] as const;

export function MatchManager({ matchId, voteMode, rows, candidates, members, costs: initialCosts, defaults }: Props) {
  const [people, setPeople] = useState<Person[]>(rows.map((r) => ({ ...r, key: r.playerId })));
  const [pick, setPick] = useState("");
  const [guestName, setGuestName] = useState("");
  const [costs, setCosts] = useState(initialCosts);
  const [method, setMethod] = useState<SplitMethod>(defaults.method);
  const [step, setStep] = useState(defaults.step);
  const [fixedFee, setFixedFee] = useState(defaults.fixedFee);
  const [guestFee, setGuestFee] = useState(defaults.guestFee);
  const [payer, setPayer] = useState<number | null>(null);
  const [overrides, setOverrides] = useState<Record<number, number>>({});
  const [state, setState] = useState<ActionState>(null);
  const [pending, start] = useTransition();
  const [tempId, setTempId] = useState(-1);

  const present = people.filter((p) => p.present);
  const total = costs.field + costs.water + costs.referee + costs.other;
  const calc = useMemo(
    () =>
      computeFees({
        total,
        method,
        step,
        fixedFee,
        guestFee,
        people: present.map((p) => ({ playerId: p.key, isGuest: p.isGuest, override: overrides[p.key] ?? null })),
      }),
    [present, total, method, step, fixedFee, guestFee, overrides],
  );
  const listed = new Set(people.map((p) => p.playerId));
  const addable = candidates.filter((c) => !listed.has(c.id));

  const update = (key: number, patch: Partial<Person>) =>
    setPeople((ps) => ps.map((p) => (p.key === key ? { ...p, ...patch } : p)));

  const items = (): AttendanceItem[] =>
    people.map((p) => ({
      playerId: p.playerId > 0 ? p.playerId : null,
      newGuestName: p.newGuestName,
      present: p.present,
      chargeToPlayerId: p.chargeToPlayerId,
      override: overrides[p.key] ?? null,
    }));

  const addExisting = () => {
    const c = candidates.find((x) => x.id === Number(pick));
    if (!c) return;
    setPeople((ps) => [
      ...ps,
      { key: c.id, playerId: c.id, name: c.name, isGuest: c.isGuest, inRoster: false, voteChoice: null, voteReason: null, present: true, chargeToPlayerId: c.hostPlayerId },
    ]);
    setPick("");
  };

  const addGuest = () => {
    const name = guestName.trim();
    if (!name) return;
    setPeople((ps) => [
      ...ps,
      { key: tempId, playerId: tempId, newGuestName: name, name, isGuest: true, inRoster: false, voteChoice: null, voteReason: null, present: true, chargeToPlayerId: null },
    ]);
    setTempId((t) => t - 1);
    setGuestName("");
  };

  const save = () => start(async () => setState(await saveAttendance(matchId, items())));
  const settle = () => {
    if (!window.confirm(`Chốt tiền: ${present.length} người, tổng chi phí ${fmtMoney(total)}?`)) return;
    start(async () =>
      setState(
        await settleMatch({ matchId, attendance: items(), costs, method, step, fixedFee, guestFee, payerPlayerId: payer }),
      ),
    );
  };

  const guests = present.filter((p) => p.isGuest).length;
  const hasVote = voteMode != null;
  const resultFor = (p: Person) => resultOf({ hasVote, inRoster: p.inRoster, voteMode, voteChoice: p.voteChoice, present: p.present });
  const countOf = (r: Result) => people.filter((p) => resultFor(p) === r).length;
  const groups = hasVote
    ? [
        { title: "Vote ĐI", list: people.filter((p) => p.inRoster && p.voteChoice === "going") },
        { title: "Vote NGHỈ", list: people.filter((p) => p.inRoster && p.voteChoice === "absent") },
        {
          title: `Chưa vote (${voteMode === "going" ? "coi như không đi" : "coi như đi"})`,
          list: people.filter((p) => p.inRoster && !p.voteChoice),
        },
        { title: "Ngoài danh sách / khách", list: people.filter((p) => !p.inRoster) },
      ]
    : [{ title: "", list: people }];

  return (
    <div className="space-y-4">
      <section className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="h2">Điểm danh</h2>
          <span className="text-sm font-semibold text-green-800">
            {present.length} người · {present.length - guests} thành viên + {guests} khách
          </span>
        </div>
        <p className="muted mb-2">
          Sau trận, chạm vào tên để đánh dấu Có đá / Không đến. Dòng nhỏ bên dưới cho biết kết quả theo vote.
        </p>
        {hasVote && (
          <div className="mb-3 flex flex-wrap gap-1.5 text-xs">
            <span className="chip bg-red-100 text-red-700">Vote đi mà không đến: {countOf("noshow")}</span>
            <span className="chip bg-amber-100 text-amber-800">Không vote mà đi: {countOf("novote_came")}</span>
            <span className="chip bg-blue-100 text-blue-700">Vote nghỉ vẫn đến: {countOf("changed")}</span>
          </div>
        )}
        {groups
          .filter((g) => g.list.length)
          .map((g) => (
            <div key={g.title} className="mb-2">
              {g.title && (
                <h3 className="mt-2 text-xs font-semibold tracking-wide text-gray-500 uppercase">
                  {g.title} · {g.list.length}
                </h3>
              )}
              <ul className="divide-y divide-gray-100">
                {g.list.map((p) => {
                  const r = resultFor(p);
                  return (
                    <li key={p.key} className="py-1.5" data-player={p.name}>
                      <button
                        type="button"
                        onClick={() => update(p.key, { present: !p.present })}
                        className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left ${
                          p.present ? "bg-green-50" : "bg-white"
                        }`}
                      >
                        <span className="min-w-0">
                          <span className="font-medium">{p.name}</span>
                          {p.isGuest && <span className="chip ml-1.5 bg-blue-100 text-blue-700">Khách</span>}
                          {p.voteReason && <span className="ml-1.5 text-xs text-gray-500">“{p.voteReason}”</span>}
                          {r && hasVote && (
                            <span className={`block text-xs ${RESULT_STYLE[r]}`}>
                              {RESULT_LABELS[r]}
                              {RESULT_HINT[r] ?? ""}
                            </span>
                          )}
                        </span>
                        <span className={`shrink-0 text-sm font-semibold ${p.present ? "text-green-700" : "text-gray-400"}`}>
                          {p.present ? "✅ Có đá" : "— Không đến"}
                        </span>
                      </button>
                      {p.isGuest && p.present && (
                        <label className="mt-1 flex items-center gap-2 px-2 text-xs text-gray-600">
                          Tiền tính cho
                          <select
                            className="input !w-auto !py-1 !text-sm"
                            value={p.chargeToPlayerId ?? ""}
                            onChange={(e) => update(p.key, { chargeToPlayerId: e.target.value ? Number(e.target.value) : null })}
                          >
                            <option value="">Khách tự trả</option>
                            {members.map((m) => (
                              <option key={m.id} value={m.id}>
                                Khách của {m.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="flex gap-2">
            <select className="input" value={pick} onChange={(e) => setPick(e.target.value)}>
              <option value="">+ Thêm người đã có…</option>
              {addable.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.isGuest ? " (khách)" : ""}
                </option>
              ))}
            </select>
            <button type="button" className="btn shrink-0" onClick={addExisting} disabled={!pick}>
              Thêm
            </button>
          </div>
          <div className="flex gap-2">
            <input
              className="input"
              placeholder="Tên khách mới"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addGuest();
                }
              }}
            />
            <button type="button" className="btn shrink-0 whitespace-nowrap" onClick={addGuest} disabled={!guestName.trim()}>
              Thêm khách
            </button>
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <button type="button" className="btn" onClick={save} disabled={pending}>
            Lưu điểm danh
          </button>
        </div>
      </section>

      <section className="card">
        <h2 className="h2 mb-3">Chốt tiền trận</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {COSTS.map(([k, label]) => (
            <label key={k} className="block">
              <span className="label">{label}</span>
              <input
                className="input"
                inputMode="numeric"
                value={costs[k] ? costs[k].toLocaleString("vi-VN") : ""}
                placeholder="0"
                onChange={(e) => setCosts({ ...costs, [k]: parseMoney(e.target.value) })}
              />
            </label>
          ))}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="label">Cách chia</span>
            <select className="input" value={method} onChange={(e) => setMethod(e.target.value as SplitMethod)}>
              {Object.entries(SPLIT_METHODS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          {(method === "equal" || method === "guest_fixed") && (
            <label className="block">
              <span className="label">Làm tròn lên</span>
              <select className="input" value={step} onChange={(e) => setStep(Number(e.target.value))}>
                {[0, 1000, 5000, 10000].map((s) => (
                  <option key={s} value={s}>
                    {s ? fmtMoney(s) : "Không làm tròn"}
                  </option>
                ))}
              </select>
            </label>
          )}
          {method === "fixed" && (
            <label className="block">
              <span className="label">Mỗi người</span>
              <input className="input" inputMode="numeric" value={fixedFee.toLocaleString("vi-VN")} onChange={(e) => setFixedFee(parseMoney(e.target.value))} />
            </label>
          )}
          {method === "guest_fixed" && (
            <label className="block">
              <span className="label">Khách trả</span>
              <input className="input" inputMode="numeric" value={guestFee.toLocaleString("vi-VN")} onChange={(e) => setGuestFee(parseMoney(e.target.value))} />
            </label>
          )}
          <label className="block">
            <span className="label">Ai trả tiền sân?</span>
            <select className="input" value={payer ?? ""} onChange={(e) => setPayer(e.target.value ? Number(e.target.value) : null)}>
              <option value="">Thủ quỹ trả từ quỹ bóng</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} trả hộ (cộng vào số dư của {m.name})
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Người đá</th>
                <th className="text-right">Số tiền</th>
              </tr>
            </thead>
            <tbody>
              {present.map((p) => {
                const fee = calc.fees.get(p.key) ?? 0;
                const overridden = overrides[p.key] != null;
                const chargeTo = members.find((m) => m.id === p.chargeToPlayerId);
                return (
                  <tr key={p.key}>
                    <td>
                      {p.name}
                      {chargeTo && <span className="block text-xs text-gray-500">tính cho {chargeTo.name}</span>}
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <input
                          className={`input !w-28 !py-1 text-right !text-sm ${overridden ? "!border-amber-500" : ""}`}
                          inputMode="numeric"
                          value={fee.toLocaleString("vi-VN")}
                          onChange={(e) => setOverrides({ ...overrides, [p.key]: parseMoney(e.target.value) })}
                        />
                        {overridden && (
                          <button
                            type="button"
                            title="Bỏ sửa tay"
                            className="btn btn-sm"
                            onClick={() => {
                              const next = { ...overrides };
                              delete next[p.key];
                              setOverrides(next);
                            }}
                          >
                            ↺
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 rounded-xl bg-gray-50 p-3 text-sm">
          <dt className="text-gray-500">Tổng chi phí</dt>
          <dd className="text-right font-semibold">{fmtMoney(total)}</dd>
          <dt className="text-gray-500">Số người đá</dt>
          <dd className="text-right font-semibold">{present.length}</dd>
          <dt className="text-gray-500">Mỗi thành viên</dt>
          <dd className="text-right font-semibold">{fmtMoney(calc.memberFee)}</dd>
          {guests > 0 && (
            <>
              <dt className="text-gray-500">Mỗi khách</dt>
              <dd className="text-right font-semibold">{fmtMoney(calc.guestFee)}</dd>
            </>
          )}
          <dt className="text-gray-500">Thu được</dt>
          <dd className="text-right font-semibold">{fmtMoney(calc.collected)}</dd>
          <dt className="text-gray-500">{calc.diff >= 0 ? "Dư vào quỹ bóng" : "Quỹ bóng bù"}</dt>
          <dd className={`text-right font-semibold ${calc.diff >= 0 ? "text-green-700" : "text-red-600"}`}>
            {fmtMoney(Math.abs(calc.diff))}
          </dd>
        </dl>

        {state?.error && !pending && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
        {state?.ok && !pending && <p className="mt-2 text-sm text-green-700">✓ {state.ok}</p>}
        <button type="button" className="btn btn-primary mt-3 w-full" onClick={settle} disabled={pending || !present.length}>
          {pending ? "Đang lưu…" : `Chốt tiền trận (${present.length} người)`}
        </button>
      </section>
    </div>
  );
}
