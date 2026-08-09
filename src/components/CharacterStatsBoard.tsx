"use client";

import { useMemo, useState } from "react";
import { Player } from "@/lib/types";
import { PlayerFullStats, computeCharacterLeaderboard } from "@/lib/stats";
import { Avatar } from "./Avatar";

function pct(n: number) {
  return `${(n * 100).toFixed(0)}%`;
}

export function CharacterStatsBoard({
  players,
  sets,
  playerFullStats,
}: {
  players: Player[];
  sets: import("@/lib/types").SetRow[];
  playerFullStats: Record<string, PlayerFullStats>;
}) {
  const playersWithSets = useMemo(
    () => players.filter((p) => (playerFullStats[p.id]?.setsPlayed ?? 0) > 0),
    [players, playerFullStats]
  );

  const leaderboard = useMemo(() => computeCharacterLeaderboard(players, sets), [players, sets]);
  const topByWins = useMemo(() => [...leaderboard].sort((a, b) => b.won - a.won)[0] ?? null, [leaderboard]);
  const topByKills = useMemo(() => [...leaderboard].sort((a, b) => b.kills - a.kills)[0] ?? null, [leaderboard]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const activeId = selectedId ?? playersWithSets[0]?.id ?? null;
  const active = activeId ? players.find((p) => p.id === activeId) ?? null : null;
  const stats = activeId ? playerFullStats[activeId] : null;

  if (playersWithSets.length === 0) {
    return (
      <div className="rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] p-6 text-center text-sm text-[var(--muted)]">
        Todavía no hay sets con personaje registrado.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {(topByWins || topByKills) && (
        <div className="rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] p-4">
          <h3 className="font-semibold mb-3">Mejor personaje del grupo</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="rounded-xl border border-[var(--card-border)] p-3">
              <div className="text-xs text-[var(--muted)] mb-1">🏆 Más victorias</div>
              {topByWins && topByWins.won > 0 ? (
                <>
                  <div className="font-semibold">
                    {topByWins.character} — {topByWins.won} victoria{topByWins.won === 1 ? "" : "s"}
                  </div>
                  <div className="text-[11px] text-[var(--muted)] mt-0.5">
                    usado por {topByWins.players.map((p) => p.tag).join(", ")}
                  </div>
                </>
              ) : (
                <div className="text-sm text-[var(--muted)]">Sin datos.</div>
              )}
            </div>
            <div className="rounded-xl border border-[var(--card-border)] p-3">
              <div className="text-xs text-[var(--muted)] mb-1">🗡️ Más kills</div>
              {topByKills && topByKills.kills > 0 ? (
                <>
                  <div className="font-semibold">
                    {topByKills.character} — {topByKills.kills} kills
                  </div>
                  <div className="text-[11px] text-[var(--muted)] mt-0.5">
                    usado por {topByKills.players.map((p) => p.tag).join(", ")}
                  </div>
                </>
              ) : (
                <div className="text-sm text-[var(--muted)]">Sin datos.</div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] p-4">
        <h3 className="font-semibold mb-3">Personajes por jugador</h3>

        <div className="flex flex-wrap gap-2 mb-4">
          {playersWithSets.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedId(p.id)}
              className={`flex items-center gap-1.5 pl-1.5 pr-3 py-1 rounded-full border text-sm transition ${
                p.id === activeId
                  ? "border-indigo-500/50 bg-indigo-500/10 text-indigo-400"
                  : "border-[var(--card-border)] hover:bg-black/5 dark:hover:bg-white/5"
              }`}
            >
              <Avatar id={p.id} tag={p.tag} size={22} />
              {p.tag}
            </button>
          ))}
        </div>

        {active && stats && (
          <>
            {stats.characterStats.length === 0 ? (
              <div className="text-sm text-[var(--muted)]">
                {active.tag} todavía no tiene personajes registrados en sus sets.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                  <div className="rounded-xl border border-[var(--card-border)] p-3">
                    <div className="text-xs text-[var(--muted)] mb-1">⭐ Favorito de {active.tag}</div>
                    {stats.favoriteCharacter ? (
                      <div className="font-semibold">
                        {stats.favoriteCharacter.character} — {stats.favoriteCharacter.played} set
                        {stats.favoriteCharacter.played === 1 ? "" : "s"}
                      </div>
                    ) : (
                      <div className="text-sm text-[var(--muted)]">Sin datos.</div>
                    )}
                  </div>
                  <div className="rounded-xl border border-[var(--card-border)] p-3">
                    <div className="text-xs text-[var(--muted)] mb-1">💀 Peor de {active.tag}</div>
                    {stats.worstCharacter ? (
                      <div className="font-semibold">
                        {stats.worstCharacter.character} — {pct(stats.worstCharacter.winRate)} (
                        {stats.worstCharacter.won}/{stats.worstCharacter.played})
                      </div>
                    ) : (
                      <div className="text-sm text-[var(--muted)]">Aún sin datos suficientes.</div>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto -mx-1">
                  <table className="w-full text-sm min-w-[420px]">
                    <thead>
                      <tr className="text-left text-[10px] uppercase tracking-wide text-[var(--muted)]">
                        <th className="px-1 py-1.5 font-medium">Personaje</th>
                        <th className="px-1 py-1.5 font-medium text-right">% uso</th>
                        <th className="px-1 py-1.5 font-medium text-right">Sets</th>
                        <th className="px-1 py-1.5 font-medium text-right">% victorias</th>
                        <th className="px-1 py-1.5 font-medium text-right">K/D</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.characterStats.map((c) => {
                        const usage = stats.setsPlayed ? c.played / stats.setsPlayed : 0;
                        return (
                          <tr key={c.character} className="border-t border-[var(--card-border)]">
                            <td className="px-1 py-1.5 font-medium">{c.character}</td>
                            <td className="px-1 py-1.5 text-right tabular-nums">{pct(usage)}</td>
                            <td className="px-1 py-1.5 text-right tabular-nums text-[var(--muted)]">{c.played}</td>
                            <td className="px-1 py-1.5 text-right tabular-nums">
                              {pct(c.winRate)}{" "}
                              <span className="text-[var(--muted)]">
                                ({c.won}/{c.played})
                              </span>
                            </td>
                            <td className="px-1 py-1.5 text-right tabular-nums text-[var(--muted)]">
                              {c.kills}/{c.deaths}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            {stats.setsPlayed > stats.characterStats.reduce((sum, c) => sum + c.played, 0) && (
              <div className="text-[11px] text-[var(--muted)] mt-2">
                * {active.tag} tiene sets sin personaje anotado; no cuentan en el % de uso.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
