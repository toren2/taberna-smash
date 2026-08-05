"use client";

import { useMemo, useState } from "react";
import { Player, SetRow } from "@/lib/types";
import { computeSessionSummary, listSessionDates } from "@/lib/session";
import { Avatar } from "./Avatar";

function fmtSessionDate(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const label = date.toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function NightlyMVP({
  players,
  sets,
  eloSeasonStart,
  onSelectPlayer,
}: {
  players: Player[];
  sets: SetRow[];
  eloSeasonStart: string | null;
  onSelectPlayer: (id: string) => void;
}) {
  const dates = useMemo(() => listSessionDates(sets), [sets]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const activeDate = selectedDate ?? dates[0] ?? null;

  const summary = useMemo(() => {
    if (!activeDate) return null;
    return computeSessionSummary(players, sets, eloSeasonStart, activeDate);
  }, [players, sets, eloSeasonStart, activeDate]);

  if (dates.length === 0) return null;

  return (
    <div className="rounded-xl border border-[var(--card-border)] p-3 md:col-span-2">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="font-semibold">MVP de la noche</h3>
        <select
          value={activeDate ?? ""}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="bg-transparent border border-[var(--card-border)] rounded-lg p-1.5 text-xs"
        >
          {dates.map((d) => (
            <option key={d} value={d}>
              {fmtSessionDate(d)}
            </option>
          ))}
        </select>
      </div>

      {summary && summary.mvp ? (
        <>
          <button
            onClick={() => onSelectPlayer(summary.mvp!.id)}
            className="w-full flex items-center gap-3 rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 mb-3 hover:bg-amber-500/20 transition-colors text-left"
          >
            <span className="text-2xl">🏆</span>
            <Avatar id={summary.mvp.id} tag={summary.mvp.tag} size={40} />
            <div className="flex-1">
              <div className="font-bold">{summary.mvp.tag}</div>
              <div className="text-xs text-[var(--muted)]">
                {summary.mvp.setsWon}/{summary.mvp.setsPlayed} sets · {(summary.mvp.winRate * 100).toFixed(0)}%
                {summary.mvp.topCharacter ? ` · ${summary.mvp.topCharacter}` : ""}
              </div>
            </div>
            <div
              className={`text-lg font-bold tabular-nums ${
                summary.mvp.eloDelta >= 0 ? "text-emerald-500" : "text-red-400"
              }`}
            >
              {summary.mvp.eloDelta >= 0 ? "+" : ""}
              {summary.mvp.eloDelta}
            </div>
          </button>

          <div className="space-y-1.5">
            {summary.players.map((p) => (
              <button
                key={p.id}
                onClick={() => onSelectPlayer(p.id)}
                className="w-full flex items-center justify-between text-sm hover:bg-black/5 dark:hover:bg-white/5 rounded-lg px-1.5 py-1 text-left"
              >
                <div className="flex items-center gap-2">
                  <Avatar id={p.id} tag={p.tag} size={20} />
                  <span className="font-medium">{p.tag}</span>
                </div>
                <span className="text-xs text-[var(--muted)] tabular-nums">
                  {p.setsWon}/{p.setsPlayed} · {p.kills}/{p.deaths} ·{" "}
                  <span className={p.eloDelta >= 0 ? "text-emerald-500" : "text-red-400"}>
                    {p.eloDelta >= 0 ? "+" : ""}
                    {p.eloDelta}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="text-sm text-[var(--muted)]">No hay datos para esta noche.</div>
      )}
    </div>
  );
}
