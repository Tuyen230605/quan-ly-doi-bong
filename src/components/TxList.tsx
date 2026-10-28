import { cancelTx } from "@/actions/money";
import type { Player } from "@/lib/auth";
import type { Tx } from "@/lib/data";
import { FUND_NAMES, METHODS, TX_TYPES, type Fund } from "@/lib/money";
import { pname } from "@/lib/text";
import { fmtDate } from "@/lib/time";
import { ActionForm } from "./ActionForm";
import { Empty, Money } from "./ui";

const MATCH_LOCKED = ["match_fee", "match_cost", "advance"];

export function TxList({
  txs,
  players,
  admin,
  showFund = false,
}: {
  txs: Tx[];
  players: Map<number, Player>;
  admin: boolean;
  showFund?: boolean;
}) {
  if (!txs.length) return <Empty>Chưa có giao dịch.</Empty>;
  return (
    <ul className="divide-y divide-gray-100">
      {txs.map((t) => {
        const p = t.playerId != null ? players.get(t.playerId) : undefined;
        const cancelled = t.status !== "active";
        return (
          <li key={t.id} className="py-2 text-sm">
            <div className={`flex justify-between gap-2 ${cancelled ? "text-gray-400 line-through" : ""}`}>
              <div className="min-w-0">
                <div>
                  <span className="font-medium">{TX_TYPES[t.type] ?? t.type}</span>
                  {t.category && <span className="text-gray-600"> · {t.category}</span>}
                  {p && <span> · {pname(p)}</span>}
                </div>
                <div className="truncate text-xs text-gray-500">
                  {fmtDate(t.date)}
                  {showFund ? ` · ${FUND_NAMES[t.fund as Fund]}` : ""}
                  {t.method ? ` · ${METHODS[t.method]}` : ""}
                  {t.note ? ` · ${t.note}` : ""}
                </div>
              </div>
              <div className="shrink-0 text-right">
                {t.cashAmount !== 0 && <Money v={t.cashAmount} color={!cancelled} className="font-semibold" />}
                {t.playerAmount !== 0 && t.cashAmount !== t.playerAmount && (
                  <div className="text-xs text-gray-500">
                    số dư {p ? pname(p) : ""} <Money v={t.playerAmount} />
                  </div>
                )}
              </div>
            </div>
            {cancelled && <div className="text-xs text-gray-400">Đã huỷ: {t.cancelReason}</div>}
            {admin && !cancelled && !MATCH_LOCKED.includes(t.type) && (
              <details className="mt-1">
                <summary className="cursor-pointer text-xs text-gray-400">Huỷ…</summary>
                <ActionForm action={cancelTx} className="mt-1 flex gap-2" confirm="Huỷ giao dịch này?">
                  <input type="hidden" name="id" value={t.id} />
                  <input className="input !py-1 !text-sm" name="reason" placeholder="Lý do huỷ" />
                  <button className="btn btn-sm btn-danger shrink-0">Huỷ</button>
                </ActionForm>
              </details>
            )}
          </li>
        );
      })}
    </ul>
  );
}
