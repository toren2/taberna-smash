"use client";

import { Avatar } from "./Avatar";

export type EloEntry = { id: string; tag: string; elo: number };
export type PlayerStatEntry = {
  id: string;
  tag: string;
  setsPlayed: number;
  setsWon: number;
  winRate: number;
  kills: number;
  deaths: number;
  diff: number;
};
export type DuoEntry = { duo: string; duoIds: [string, string]; played: number; won: number; winRate: number };

export function EloRanking({
  ranking,
  seasonLabel,
  onSelectPlayer,
}: {
  ranking: EloEntry[];
  seasonLabel: string;
  onSelectPlayer: (id: string) => void;
}) {
  return (
    <div className="rounded-xl border border-[var(--card-border)] p-3">
      <h3 className="font-semibold mb-2">Ranking Elo (jugadores)</h3>
      <div className="space-y-2">
        {ranking.map((p, idx) => (
          <button
            key={p.id}
            onClick={() => onSelectPlayer(p.id)}
            className="w-full flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 rounded-lg px-1 py-1 -mx-1"
          >
            <div className="flex items-center gap-2 font-medium">
              <span className="text-[var(--muted)] text-xs w-4">#{idx + 1}</span>
              <Avatar id={p.id} tag={p.tag} size={24} />
              {p.tag}
            </div>
            <div className="text-sm tabular-nums">{p.elo}</div>
          </button>
        ))}
      </div>
      <div className="text-xs text-[var(--muted)] mt-2">{seasonLabel}</div>
    </div>
  );
}

export function PlayerStatsPanel({
  stats,
  onSelectPlayer,
}: {
  stats: PlayerStatEntry[];
  onSelectPlayer: (id: string) => void;
}) {
  return (
    <div className="rounded-xl border border-[var(--card-border)] p-3">
      <h3 className="font-semibold mb-2">Winrate + K/D por jugador</h3>
      <div className="space-y-2">
        {stats.map((p) => {
          const diffLabel = p.diff >= 0 ? `+${p.diff}` : `${p.diff}`;
          return (
            <button
              key={p.id}
              onClick={() => onSelectPlayer(p.id)}
              className="w-full flex items-center justify-between gap-3 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg px-1 py-1 -mx-1"
            >
              <div className="flex items-center gap-2 font-medium">
                <Avatar id={p.id} tag={p.tag} size={24} />
                {p.tag}
              </div>
              <div className="text-sm tabular-nums text-right">
                {p.setsWon}/{p.setsPlayed} · {(p.winRate * 100).toFixed(0)}%{" "}
                <span className="text-[var(--muted)]">·</span>{" "}
                <span>
                  {p.kills}/{p.deaths} ({diffLabel})
                </span>
              </div>
            </button>
          );
        })}
      </div>
      <div className="text-xs text-[var(--muted)] mt-2">K/D y diferencial son acumulados (por set completo).</div>
    </div>
  );
}

export function DuoStatsPanel({ duos, onSelectPlayer }: { duos: DuoEntry[]; onSelectPlayer: (id: string) => void }) {
  return (
    <div className="rounded-xl border border-[var(--card-border)] p-3 md:col-span-2">
      <h3 className="font-semibold mb-2">Winrate por dúo ({duos.length})</h3>
      {duos.length === 0 ? (
        <div className="text-sm text-[var(--muted)]">Aún no hay dúos registrados.</div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {duos.map((d) => (
            <div key={d.duo} className="flex items-center justify-between">
              <div className="flex items-center gap-1 font-medium">
                <button onClick={() => onSelectPlayer(d.duoIds[0])} className="flex items-center gap-1 hover:underline">
                  <Avatar id={d.duoIds[0]} tag={d.duo} size={20} />
                </button>
                <button onClick={() => onSelectPlayer(d.duoIds[1])} className="flex items-center gap-1 hover:underline -ml-2">
                  <Avatar id={d.duoIds[1]} tag={d.duo} size={20} />
                </button>
                <span className="ml-1">{d.duo}</span>
              </div>
              <div className="text-sm tabular-nums">
                {d.won}/{d.played} · {(d.winRate * 100).toFixed(0)}%
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
