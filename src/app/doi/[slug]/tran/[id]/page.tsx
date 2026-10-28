import { and, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  cancelMatch,
  castVote,
  markPaid,
  reopenMatch,
  restoreMatch,
  unmarkPaid,
  updateMatch,
} from "@/actions/matches";
import { cancelTx, markPenaltyPaid } from "@/actions/money";
import { ActionForm } from "@/components/ActionForm";
import { CopyButton } from "@/components/CopyButton";
import { MatchFields } from "@/components/forms";
import { MatchManager, type ManagerRow } from "@/components/MatchManager";
import { PenaltyForm } from "@/components/PenaltyForm";
import { Badge, Card, Empty, Fold, Money, PageTitle, PayBadge, ResultBadge } from "@/components/ui";
import { getDb, schema } from "@/db";
import {
  getActiveTx,
  getMatchRoster,
  getPenaltyTypes,
  getPlayers,
  getVenues,
  indexById,
  matchTotalCost,
  paidByTx,
  type RosterRow,
} from "@/lib/data";
import { KIND_LABELS } from "@/lib/labels";
import { fmtMoney, SPLIT_METHODS, type SplitMethod } from "@/lib/money";
import { viewCtx } from "@/lib/team";
import { pname } from "@/lib/text";
import { fmtDateTime, fmtMatchDate, timeLeft } from "@/lib/time";
import { voteCounts } from "@/lib/views";

function voteLabel(r: RosterRow, mode: string | null) {
  if (!r.inRoster) return null;
  if (r.vote) return `Vote ${r.vote.choice === "going" ? "ĐI" : "NGHỈ"}${r.vote.reason ? `: ${r.vote.reason}` : ""}`;
  return mode === "going" ? "Không vote (coi như không đi)" : "Không vote (coi như đi)";
}

function MethodSelect() {
  return (
    <select name="method" className="input !w-auto !py-1 !text-xs" defaultValue="transfer">
      <option value="transfer">CK</option>
      <option value="cash">Tiền mặt</option>
    </select>
  );
}

export default async function MatchPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const ctx = await viewCtx(params);
  if (!ctx) return null;
  const { team, admin, base } = ctx;
  const id = Number((await params).id);
  const db = await getDb();
  const [m] = await db
    .select()
    .from(schema.matches)
    .where(and(eq(schema.matches.id, id), eq(schema.matches.teamId, team.id)));
  if (!m) notFound();
  const [players, venues, txs, penaltyTypes, matchTxs] = await Promise.all([
    getPlayers(team.id),
    getVenues(team.id),
    getActiveTx(team.id),
    getPenaltyTypes(team.id),
    db
      .select()
      .from(schema.transactions)
      .where(and(eq(schema.transactions.matchId, id), eq(schema.transactions.teamId, team.id)))
      .orderBy(desc(schema.transactions.id)),
  ]);
  const sched = m.scheduleId
    ? (await db.select().from(schema.schedules).where(eq(schema.schedules.id, m.scheduleId)))[0]
    : undefined;
  const ps = indexById(players);
  const venue = m.venueId ? indexById(venues).get(m.venueId) : undefined;
  const rows = await getMatchRoster(m, ps);
  const now = new Date();
  const voteOpen = !!m.voteDeadline && m.voteDeadline > now && m.status === "upcoming";
  const vc = voteCounts(rows);
  const presentRows = rows.filter((r) => r.present);
  const settled = m.status === "settled";
  const title = sched ? sched.name : `${KIND_LABELS[m.kind]}${m.opponent ? ` vs ${m.opponent}` : ""}`;

  const info = [
    `⚽ ${title}: ${fmtMatchDate(m.date)} · ${m.startTime}${m.endTime ? `–${m.endTime}` : ""}`,
    venue ? `📍 ${venue.name}${venue.mapUrl ? ` ${venue.mapUrl}` : ""}` : "",
    m.note ? `📝 ${m.note}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  const roll = [
    `⚽ ${fmtMatchDate(m.date)}: ${presentRows.length} người`,
    ...presentRows.map((r, i) => `${i + 1}. ${pname(r.player)}${r.player.type === "guest" ? " (khách)" : ""}`),
  ].join("\n");

  // Tiền trận: gộp theo người trả (khách có người dẫn thì người dẫn trả).
  const paidBall = paidByTx(txs, "ball");
  const feeTx = txs.filter((t) => t.matchId === id && t.type === "match_fee");
  const payers = new Map<number, { fee: number; paid: number }>();
  for (const t of feeTx) {
    const p = payers.get(t.playerId!) ?? { fee: 0, paid: 0 };
    p.fee += -t.playerAmount;
    p.paid += paidBall.get(t.id) ?? 0;
    payers.set(t.playerId!, p);
  }
  const linkedDeposit = new Set(txs.filter((t) => t.matchId === id && t.type === "deposit").map((t) => t.playerId));
  const selfPayers = new Set(presentRows.filter((r) => !r.chargeToPlayerId || r.chargeToPlayerId === r.player.id).map((r) => r.player.id));
  const extraPayers = [...payers.keys()].filter((pid) => !selfPayers.has(pid));
  const collected = feeTx.reduce((s, t) => s - t.playerAmount, 0);
  const total = matchTotalCost(m);

  const paidPenalty = paidByTx(txs, "penalty");
  const penalties = matchTxs.filter((t) => t.type === "penalty");
  const alreadyFined = new Set(penalties.filter((t) => t.status === "active").map((t) => t.playerId));
  const suggestions = rows
    .filter((r) => r.result === "noshow" && !alreadyFined.has(r.player.id))
    .map((r) => ({ playerId: r.player.id, name: pname(r.player) }));
  const memberOptions = players.filter((p) => p.type === "member" && p.status !== "left").map((p) => ({ id: p.id, name: pname(p) }));

  const PayActions = ({ pid }: { pid: number }) => {
    const p = payers.get(pid);
    if (!admin || !p) return null;
    return (
      <div className="mt-1 flex items-center justify-end gap-2">
        {linkedDeposit.has(pid) && (
          <ActionForm action={unmarkPaid} showOk={false}>
            <input type="hidden" name="matchId" value={id} />
            <input type="hidden" name="playerId" value={pid} />
            <button className="text-xs text-gray-500 underline">Bỏ tích</button>
          </ActionForm>
        )}
        {p.paid < p.fee && (
          <ActionForm action={markPaid} className="flex items-center gap-1" showOk={false}>
            <input type="hidden" name="matchId" value={id} />
            <input type="hidden" name="playerId" value={pid} />
            <MethodSelect />
            <button className="btn btn-sm btn-primary">Đã trả</button>
          </ActionForm>
        )}
      </div>
    );
  };
  const payBadge = (pid: number) => {
    const p = payers.get(pid);
    return p ? <PayBadge fee={p.fee} paid={p.paid} /> : <Badge>Miễn</Badge>;
  };

  return (
    <>
      <PageTitle
        right={
          m.status === "settled" ? (
            <Badge tone="green">Đã chốt tiền</Badge>
          ) : m.status === "cancelled" ? (
            <Badge>Đã huỷ</Badge>
          ) : (
            <Badge tone="blue">Chưa chốt</Badge>
          )
        }
      >
        {fmtMatchDate(m.date)}
      </PageTitle>

      <Card>
        <div className="font-semibold">{title}</div>
        <div className="text-sm text-gray-700">
          {m.startTime}
          {m.endTime ? `–${m.endTime}` : ""} · {venue?.name ?? "Chưa chọn sân"}
        </div>
        {m.note && <div className="mt-1 text-sm text-gray-600">📝 {m.note}</div>}
        <div className="mt-1 text-sm text-gray-600">
          Chi phí {settled ? "thực tế" : "dự kiến"}: {fmtMoney(total)}
          {total > 0 && (
            <span className="text-gray-400">
              {" "}
              (sân {fmtMoney(m.costField)}
              {m.costWater ? `, nước ${fmtMoney(m.costWater)}` : ""}
              {m.costReferee ? `, trọng tài ${fmtMoney(m.costReferee)}` : ""}
              {m.costOther ? `, khác ${fmtMoney(m.costOther)}` : ""})
            </span>
          )}
        </div>
        {m.status === "cancelled" && <p className="mt-1 text-sm text-red-600">Đã huỷ: {m.cancelReason}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <CopyButton text={info} label="Copy thông tin" />
          <CopyButton text={roll} label="Copy danh sách" />
          {venue?.mapUrl && (
            <a href={venue.mapUrl} target="_blank" rel="noreferrer" className="btn btn-sm">
              📍 Bản đồ
            </a>
          )}
        </div>
        {admin && (
          <div className="mt-3 space-y-2">
            {m.status === "upcoming" && (
              <Fold summary="Sửa buổi đá">
                <ActionForm action={updateMatch} className="space-y-3">
                  <MatchFields m={m} venues={venues} />
                  <button className="btn btn-primary w-full">Lưu</button>
                </ActionForm>
              </Fold>
            )}
            {m.status === "upcoming" && (
              <Fold summary="Huỷ buổi này">
                <ActionForm action={cancelMatch} className="flex gap-2" confirm="Huỷ buổi này?">
                  <input type="hidden" name="id" value={id} />
                  <input className="input" name="reason" placeholder="Lý do: mưa, sân bận…" />
                  <button className="btn btn-danger shrink-0">Huỷ buổi</button>
                </ActionForm>
              </Fold>
            )}
            {m.status === "cancelled" && (
              <ActionForm action={restoreMatch}>
                <input type="hidden" name="id" value={id} />
                <button className="btn">Khôi phục buổi này</button>
              </ActionForm>
            )}
          </div>
        )}
      </Card>

      {m.scheduleId && m.status !== "cancelled" && (
        <Card
          title="🗳️ Vote"
          right={
            m.voteDeadline && (
              <Badge tone={voteOpen ? "amber" : "gray"}>
                {voteOpen ? `Hạn ${fmtDateTime(m.voteDeadline)} · ${timeLeft(m.voteDeadline)}` : "Đã khoá"}
              </Badge>
            )
          }
        >
          <p className="text-sm text-gray-600">
            {m.voteMode === "going" ? "Vote đi: không vote = không đi." : "Vote nghỉ: không vote = đi."} Đi{" "}
            <b>{vc.going.length}</b> · Nghỉ <b>{vc.absent.length}</b> · Chưa vote <b>{vc.noVote.length}</b>
          </p>
          <ul className="mt-2 divide-y divide-gray-100">
            {rows
              .filter((r) => r.inRoster)
              .map((r) => (
                <li key={r.player.id} className="flex items-center justify-between gap-2 py-1.5 text-sm">
                  <div className="min-w-0">
                    <span className="font-medium">{pname(r.player)}</span>{" "}
                    {r.going ? <Badge tone="green">Đi</Badge> : <Badge tone="amber">Nghỉ</Badge>}
                    {!r.vote && <span className="ml-1 text-xs text-gray-400">(chưa vote)</span>}
                    {r.vote && (
                      <span className="block text-xs text-gray-500">
                        {r.vote.reason ? `${r.vote.reason} · ` : ""}
                        {fmtDateTime(r.vote.updatedAt)}
                        {r.vote.updatedByAdminId ? " · admin sửa" : ""}
                      </span>
                    )}
                  </div>
                  {admin && m.status === "upcoming" && (
                    <ActionForm action={castVote} className="flex shrink-0 gap-1" showOk={false}>
                      <input type="hidden" name="matchId" value={id} />
                      <input type="hidden" name="playerId" value={r.player.id} />
                      <button name="choice" value="going" className={`btn btn-sm ${r.vote?.choice === "going" ? "btn-primary" : ""}`}>
                        Đi
                      </button>
                      <button name="choice" value="absent" className={`btn btn-sm ${r.vote?.choice === "absent" ? "!bg-amber-500 !text-white" : ""}`}>
                        Nghỉ
                      </button>
                    </ActionForm>
                  )}
                </li>
              ))}
          </ul>
        </Card>
      )}

      <div id="diem-danh" />
      {m.status === "upcoming" && admin && (
        <MatchManager
          key={rows.map((r) => `${r.player.id}:${+r.present}:${r.chargeToPlayerId ?? ""}`).join(",")}
          matchId={id}
          rows={rows.map(
            (r): ManagerRow => ({
              playerId: r.player.id,
              name: pname(r.player),
              isGuest: r.player.type === "guest",
              inRoster: r.inRoster,
              voteLabel: voteLabel(r, m.voteMode),
              present: r.present,
              chargeToPlayerId: r.chargeToPlayerId,
            }),
          )}
          candidates={players
            .filter((p) => p.status === "active")
            .map((p) => ({ id: p.id, name: pname(p), isGuest: p.type === "guest", hostPlayerId: p.hostPlayerId }))}
          members={memberOptions}
          costs={{ field: m.costField, water: m.costWater, referee: m.costReferee, other: m.costOther }}
          defaults={{
            method: team.splitMethod as SplitMethod,
            step: team.roundingStep,
            fixedFee: team.fixedFee,
            guestFee: team.guestFee,
          }}
        />
      )}

      {m.status === "upcoming" && !admin && (
        <Card title={`Dự kiến đá (${presentRows.length})`}>
          {presentRows.length ? (
            <p className="text-sm">{presentRows.map((r) => pname(r.player)).join(", ")}</p>
          ) : (
            <Empty>Chưa có ai.</Empty>
          )}
        </Card>
      )}

      {settled && (
        <Card title={`Ai đá & tiền trận (${presentRows.length} người)`}>
          <ul className="divide-y divide-gray-100">
            {rows.map((r) => {
              const chargeTo = r.chargeToPlayerId && r.chargeToPlayerId !== r.player.id ? ps.get(r.chargeToPlayerId) : undefined;
              const payer = payers.get(r.player.id);
              return (
                <li key={r.player.id} data-player={pname(r.player)} className="py-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link href={`${base}/cau-thu/${r.player.id}`} className="font-medium">
                        {pname(r.player)}
                      </Link>
                      <div className="mt-0.5">
                        <ResultBadge result={r.result} />
                      </div>
                    </div>
                    {r.present && (
                      <div className="shrink-0 text-right">
                        <div className="text-sm tabular-nums">
                          {fmtMoney(r.fee ?? 0)}
                          {payer && payer.fee !== r.fee && <span className="text-xs text-gray-500"> (cả khách: {fmtMoney(payer.fee)})</span>}
                        </div>
                        <div className="mt-0.5">
                          {chargeTo ? <span className="text-xs text-gray-500">tính cho {pname(chargeTo)}</span> : payBadge(r.player.id)}
                        </div>
                      </div>
                    )}
                  </div>
                  {r.present && !chargeTo && <PayActions pid={r.player.id} />}
                </li>
              );
            })}
            {extraPayers.map((pid) => (
              <li key={`payer-${pid}`} data-player={ps.get(pid) ? pname(ps.get(pid)!) : ""} className="py-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-medium">{ps.get(pid) ? pname(ps.get(pid)!) : `#${pid}`}</span>
                    <div className="text-xs text-gray-500">Trả tiền cho khách</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm tabular-nums">{fmtMoney(payers.get(pid)!.fee)}</div>
                    {payBadge(pid)}
                  </div>
                </div>
                <PayActions pid={pid} />
              </li>
            ))}
          </ul>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 rounded-xl bg-gray-50 p-3 text-sm">
            <dt className="text-gray-500">Cách chia</dt>
            <dd className="text-right">{SPLIT_METHODS[(m.splitMethod ?? "equal") as SplitMethod]}</dd>
            <dt className="text-gray-500">Tổng chi phí</dt>
            <dd className="text-right font-semibold">{fmtMoney(total)}</dd>
            <dt className="text-gray-500">Mỗi thành viên</dt>
            <dd className="text-right font-semibold">{fmtMoney(m.memberFee ?? 0)}</dd>
            <dt className="text-gray-500">Thu được</dt>
            <dd className="text-right font-semibold">{fmtMoney(collected)}</dd>
            <dt className="text-gray-500">{collected - total >= 0 ? "Dư vào quỹ bóng" : "Quỹ bóng bù"}</dt>
            <dd className="text-right font-semibold">
              <Money v={collected - total} color />
            </dd>
            {m.payerPlayerId && (
              <>
                <dt className="text-gray-500">Người trả hộ tiền sân</dt>
                <dd className="text-right">{ps.get(m.payerPlayerId) ? pname(ps.get(m.payerPlayerId)!) : ""}</dd>
              </>
            )}
          </dl>
          {admin && (
            <ActionForm action={reopenMatch} className="mt-3" confirm="Mở lại trận? Các khoản tiền trận sẽ bị huỷ để chốt lại.">
              <input type="hidden" name="id" value={id} />
              <button className="btn btn-sm">↺ Mở lại trận để sửa</button>
            </ActionForm>
          )}
        </Card>
      )}

      {m.status !== "cancelled" && (
        <Card title="🚨 Phạt" id="phat">
          {penalties.length > 0 && (
            <ul className="mb-3 divide-y divide-gray-100">
              {penalties.map((t) => {
                const fee = -t.playerAmount;
                const paid = paidPenalty.get(t.id) ?? 0;
                const cancelled = t.status !== "active";
                return (
                  <li key={t.id} className={`flex items-center justify-between gap-2 py-2 text-sm ${cancelled ? "text-gray-400 line-through" : ""}`}>
                    <div>
                      <b>{t.playerId && ps.get(t.playerId) ? pname(ps.get(t.playerId)!) : "?"}</b> · {t.category}
                      {t.note && !t.note.startsWith(t.category ?? "") && <span className="block text-xs text-gray-500">{t.note}</span>}
                      {cancelled && <span className="block text-xs no-underline">Đã huỷ: {t.cancelReason}</span>}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="tabular-nums">{fmtMoney(fee)}</span>
                      {!cancelled && <PayBadge fee={fee} paid={paid} />}
                      {admin && !cancelled && (
                        <div className="flex gap-1">
                          {paid < fee && (
                            <ActionForm action={markPenaltyPaid} className="flex gap-1" showOk={false}>
                              <input type="hidden" name="txId" value={t.id} />
                              <MethodSelect />
                              <button className="btn btn-sm btn-primary">Đã nộp</button>
                            </ActionForm>
                          )}
                          <ActionForm action={cancelTx} confirm="Huỷ khoản phạt này?" showOk={false}>
                            <input type="hidden" name="id" value={t.id} />
                            <input type="hidden" name="reason" value="Huỷ phạt" />
                            <button className="btn btn-sm btn-danger">Huỷ</button>
                          </ActionForm>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {admin && settled && (
            <PenaltyForm
              matchId={id}
              suggestions={suggestions}
              types={penaltyTypes.filter((t) => t.enabled)}
              players={players.filter((p) => p.status !== "left").map((p) => ({ id: p.id, name: pname(p) }))}
              memberFee={m.memberFee}
            />
          )}
          {admin && !settled && <p className="muted">Chốt tiền trận trước, rồi web sẽ gợi ý ai vắng không báo để phạt.</p>}
          {!admin && penalties.length === 0 && <Empty>Không có ai bị phạt.</Empty>}
        </Card>
      )}
    </>
  );
}
