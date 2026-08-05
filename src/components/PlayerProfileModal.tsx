"use client";

import { Player } from "@/lib/types";
import { PlayerFullStats } from "@/lib/stats";
import { EloPoint } from "@/lib/elo";
import { Avatar } from "./Avatar";
import { MiniEloChart } from "./MiniEloChart";

function pct(n: number) {
  return `${(n * 100).toFixed(0)}%`;
}

export function PlayerProfileModal({
  player,
  players,
  stats,
  elo,
  eloRank,
  eloHistory,
  onClose,
  onSelectPlayer,
}: {
  player: Player;
  players: Player[];
  stats: PlayerFullStats;
  elo: number;
  eloRank: number;
  eloHistory: EloPoint[];
  onClose: () => void;
  onSelectPlayer: (id: string) => void;
}) {
  const idToTag = new Map(players.map((p) => [p.id, p.tag]));
  const streakLabel =
    stats.currentStreak.result === null
      ? "Sin sets registrados"
      : stats.currentStreak.result === "W"
      ? `${stats.currentStreak.count} victoria${stats.currentStreak.count === 1 ? "" : "s"} seguidas`
      : `${stats.currentStreak.count} derrota${stats.currentStreak.count === 1 ? "" : "s"} seguidas`;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
      <div className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Avatar id={player.id} tag={player.tag} size={56} />
            <div>
              <h2 className="text-lg font-bold leading-tight">{player.tag}</h2>
              <div className="text-xs text-[var(--muted)]">
                #{eloRank} · {elo} Elo
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-sm px-2 py-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 self-start">
            Cerrar
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="rounded-xl border border-[var(--card-border)] p-2 text-center">
            <div className="text-lg font-bold tabular-nums">{pct(stats.winRate)}</div>
            <div className="text-[10px] text-[var(--muted)]">
              Winrate ({stats.setsWon}/{stats.setsPlayed})
            </div>
          </div>
          <div className="rounded-xl border border-[var(--card-border)] p-2 text-center">
            <div className="text-lg font-bold tabular-nums">
              {stats.kills}/{stats.deaths}
            </div>
            <div className="text-[10px] text-[var(--muted)]">K/D ({stats.diff >= 0 ? "+" : ""}{stats.diff})</div>
          </div>
          <div className="rounded-xl border border-[var(--card-border)] p-2 text-center">
            <div className="text-lg font-bold tabular-nums">{stats.bestWinStreak}</div>
            <div className="text-[10px] text-[var(--muted)]">Mejor racha</div>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--card-border)] p-3 mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-sm">Racha actual</h3>
            <span className="text-sm">{streakLabel}</span>
          </div>
          {stats.last5.length > 0 && (
            <div className="flex gap-1">
              {stats.last5.map((r, i) => (
                <span
                  key={i}
                  className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${
                    r === "W" ? "bg-emerald-500/20 text-emerald-500" : "bg-red-500/20 text-red-500"
                  }`}
                >
                  {r}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-[var(--card-border)] p-3 mb-4">
          <h3 className="font-semibold text-sm mb-2">Evolución de Elo</h3>
          <MiniEloChart data={eloHistory} dataKey={player.tag} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
          <div className="rounded-xl border border-[var(--card-border)] p-3">
            <div className="text-xs text-[var(--muted)] mb-1">Rival favorito</div>
            {stats.bestRival ? (
              <button
                onClick={() => onSelectPlayer(stats.bestRival!.id)}
                className="font-semibold hover:underline text-left"
              >
                {stats.bestRival.tag} — {pct(stats.bestRival.winRate)} ({stats.bestRival.won}/{stats.bestRival.played})
              </button>
            ) : (
              <div className="text-sm text-[var(--muted)]">Aún sin datos suficientes.</div>
            )}
          </div>
          <div className="rounded-xl border border-[var(--card-border)] p-3">
            <div className="text-xs text-[var(--muted)] mb-1">Peor matchup</div>
            {stats.worstRival ? (
              <button
                onClick={() => onSelectPlayer(stats.worstRival!.id)}
                className="font-semibold hover:underline text-left"
              >
                {stats.worstRival.tag} — {pct(stats.worstRival.winRate)} ({stats.worstRival.won}/{stats.worstRival.played})
              </button>
            ) : (
              <div className="text-sm text-[var(--muted)]">Aún sin datos suficientes.</div>
            )}
          </div>
          <div className="rounded-xl border border-[var(--card-border)] p-3">
            <div className="text-xs text-[var(--muted)] mb-1">Mejor dúo</div>
            {stats.bestDuo ? (
              <button
                onClick={() => onSelectPlayer(stats.bestDuo!.id)}
                className="font-semibold hover:underline text-left"
              >
                {stats.bestDuo.tag} — {pct(stats.bestDuo.winRate)} ({stats.bestDuo.won}/{stats.bestDuo.played})
              </button>
            ) : (
              <div className="text-sm text-[var(--muted)]">Aún sin datos suficientes.</div>
            )}
          </div>
          <div className="rounded-xl border border-[var(--card-border)] p-3">
            <div className="text-xs text-[var(--muted)] mb-1">Peor dúo</div>
            {stats.worstDuo ? (
              <button
                onClick={() => onSelectPlayer(stats.worstDuo!.id)}
                className="font-semibold hover:underline text-left"
              >
                {stats.worstDuo.tag} — {pct(stats.worstDuo.winRate)} ({stats.worstDuo.won}/{stats.worstDuo.played})
              </button>
            ) : (
              <div className="text-sm text-[var(--muted)]">Aún sin datos suficientes.</div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--card-border)] p-3">
          <h3 className="font-semibold text-sm mb-2">Head-to-head</h3>
          {Object.keys(stats.headToHead).length === 0 ? (
            <div className="text-sm text-[var(--muted)]">Aún no hay sets registrados.</div>
          ) : (
            <div className="space-y-1.5">
              {Object.entries(stats.headToHead).map(([otherId, cell]) => (
                <button
                  key={otherId}
                  onClick={() => onSelectPlayer(otherId)}
                  className="w-full flex items-center justify-between text-sm hover:bg-black/5 dark:hover:bg-white/5 rounded-lg px-1.5 py-1 text-left"
                >
                  <span className="font-medium">{idToTag.get(otherId) ?? otherId}</span>
                  <span className="text-xs text-[var(--muted)] tabular-nums">
                    {cell.asOpponent.played > 0 && `vs: ${cell.asOpponent.won}/${cell.asOpponent.played}`}
                    {cell.asOpponent.played > 0 && cell.asTeammate.played > 0 && "  ·  "}
                    {cell.asTeammate.played > 0 && `con: ${cell.asTeammate.won}/${cell.asTeammate.played}`}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
