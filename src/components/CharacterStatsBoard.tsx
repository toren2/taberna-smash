"use client";

import { useMemo, useState } from "react";
import { Player, SetRow } from "@/lib/types";
import {
  PlayerFullStats,
  computeCharacterLeaderboard,
  computeCharacterUserBoard,
  computeComboMatchups,
} from "@/lib/stats";
import { Avatar } from "./Avatar";

function pct(n: number) {
  return `${(n * 100).toFixed(0)}%`;
}

type SubTab = "jugador" | "personaje" | "combos";

export function CharacterStatsBoard({
  players,
  sets,
  playerFullStats,
}: {
  players: Player[];
  sets: SetRow[];
  playerFullStats: Record<string, PlayerFullStats>;
}) {
  const [subTab, setSubTab] = useState<SubTab>("jugador");

  const playersWithSets = useMemo(
    () => players.filter((p) => (playerFullStats[p.id]?.setsPlayed ?? 0) > 0),
    [players, playerFullStats]
  );

  if (playersWithSets.length === 0) {
    return (
      <div className="rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] p-6 text-center text-sm text-[var(--muted)]">
        Todavía no hay sets con personaje registrado.
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] p-4">
      <div className="flex gap-1.5 mb-4 border-b border-[var(--card-border)]">
        {(
          [
            ["jugador", "Por jugador"],
            ["personaje", "Por personaje"],
            ["combos", "Combos"],
          ] as [SubTab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setSubTab(key)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              subTab === key
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {subTab === "jugador" && <ByPlayerView players={playersWithSets} playerFullStats={playerFullStats} />}
      {subTab === "personaje" && <ByCharacterView players={players} sets={sets} />}
      {subTab === "combos" && <CombosView players={players} sets={sets} />}
    </div>
  );
}

function ByPlayerView({
  players,
  playerFullStats,
}: {
  players: Player[];
  playerFullStats: Record<string, PlayerFullStats>;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const activeId = selectedId ?? players[0]?.id ?? null;
  const active = activeId ? players.find((p) => p.id === activeId) ?? null : null;
  const stats = activeId ? playerFullStats[activeId] : null;

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {players.map((p) => (
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
  );
}

function ByCharacterView({ players, sets }: { players: Player[]; sets: SetRow[] }) {
  const leaderboard = useMemo(() => computeCharacterLeaderboard(players, sets), [players, sets]);
  const userBoard = useMemo(() => computeCharacterUserBoard(players, sets), [players, sets]);

  const topByWins = useMemo(() => [...leaderboard].sort((a, b) => b.won - a.won)[0] ?? null, [leaderboard]);
  const topByKills = useMemo(() => [...leaderboard].sort((a, b) => b.kills - a.kills)[0] ?? null, [leaderboard]);

  const [selectedChar, setSelectedChar] = useState<string | null>(null);
  const activeChar = selectedChar ?? userBoard[0]?.character ?? null;
  const activeEntry = userBoard.find((c) => c.character === activeChar) ?? null;

  if (userBoard.length === 0) {
    return <div className="text-sm text-[var(--muted)]">Todavía no hay personajes registrados.</div>;
  }

  return (
    <div>
      {(topByWins || topByKills) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
          <div className="rounded-xl border border-[var(--card-border)] p-3">
            <div className="text-xs text-[var(--muted)] mb-1">🏆 Más victorias (grupo)</div>
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
            <div className="text-xs text-[var(--muted)] mb-1">🗡️ Más kills (grupo)</div>
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
      )}

      <div className="text-xs text-[var(--muted)] mb-2">
        Elige un personaje para ver quién es su mejor usuario del grupo (mínimo 2 sets para comparar):
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        {userBoard.map((c) => (
          <button
            key={c.character}
            onClick={() => setSelectedChar(c.character)}
            className={`px-3 py-1 rounded-full border text-sm transition ${
              c.character === activeChar
                ? "border-indigo-500/50 bg-indigo-500/10 text-indigo-400"
                : "border-[var(--card-border)] hover:bg-black/5 dark:hover:bg-white/5"
            }`}
          >
            {c.character} <span className="text-[var(--muted)]">({c.totalPlayed})</span>
          </button>
        ))}
      </div>

      {activeEntry && (
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-sm min-w-[420px]">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wide text-[var(--muted)]">
                <th className="px-1 py-1.5 font-medium">Jugador</th>
                <th className="px-1 py-1.5 font-medium text-right">Sets</th>
                <th className="px-1 py-1.5 font-medium text-right">% victorias</th>
                <th className="px-1 py-1.5 font-medium text-right">K/D</th>
              </tr>
            </thead>
            <tbody>
              {activeEntry.users.map((u, i) => (
                <tr key={u.playerId} className="border-t border-[var(--card-border)]">
                  <td className="px-1 py-1.5 font-medium flex items-center gap-1.5">
                    {i === 0 && u.eligible && <span title="Mejor usuario">👑</span>}
                    <Avatar id={u.playerId} tag={u.tag} size={18} />
                    {u.tag}
                  </td>
                  <td className="px-1 py-1.5 text-right tabular-nums text-[var(--muted)]">{u.played}</td>
                  <td className="px-1 py-1.5 text-right tabular-nums">
                    {u.eligible ? (
                      <>
                        {pct(u.winRate)} <span className="text-[var(--muted)]">({u.won}/{u.played})</span>
                      </>
                    ) : (
                      <span className="text-[var(--muted)]">pocos datos</span>
                    )}
                  </td>
                  <td className="px-1 py-1.5 text-right tabular-nums text-[var(--muted)]">
                    {u.kills}/{u.deaths}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CombosView({ players, sets }: { players: Player[]; sets: SetRow[] }) {
  const matchups = useMemo(() => computeComboMatchups(players, sets), [players, sets]);

  if (matchups.length === 0) {
    return (
      <div className="text-sm text-[var(--muted)]">
        Todavía no hay suficientes datos. Para que aparezca un matchup acá, los 4 jugadores de un set deben tener
        personaje anotado, y esa misma combinación exacta (jugador + personaje de cada lado) tiene que repetirse al
        menos 2 veces.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {matchups.map((m, i) => {
        const total = m.leftWins + m.rightWins;
        const leftPct = total ? m.leftWins / total : 0;
        const rightPct = total ? m.rightWins / total : 0;
        const leftAhead = m.leftWins > m.rightWins;
        const rightAhead = m.rightWins > m.leftWins;
        return (
          <div key={i} className="rounded-xl border border-[var(--card-border)] p-3">
            <div className="flex items-center justify-between gap-2 text-sm">
              <div className={`flex-1 ${leftAhead ? "font-semibold text-emerald-500" : ""}`}>{m.left.label}</div>
              <div className="text-xs text-[var(--muted)] px-2">vs</div>
              <div className={`flex-1 text-right ${rightAhead ? "font-semibold text-emerald-500" : ""}`}>
                {m.right.label}
              </div>
            </div>
            <div className="flex items-center justify-between mt-1.5 text-xs text-[var(--muted)] tabular-nums">
              <span>
                {m.leftWins}-{m.rightWins} ({pct(leftPct)})
              </span>
              <span>{m.played} sets jugados</span>
              <span>
                ({pct(rightPct)}) {m.rightWins}-{m.leftWins}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
