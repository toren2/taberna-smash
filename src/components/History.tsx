"use client";

import { useMemo, useState } from "react";
import { Player, SetRow } from "@/lib/types";
import { Avatar } from "./Avatar";

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function History({
  sets,
  players,
  idToTag,
  onSelectPlayer,
}: {
  sets: SetRow[];
  players: Player[];
  idToTag: Map<string, string>;
  onSelectPlayer: (id: string) => void;
}) {
  const [playerFilter, setPlayerFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const filtered = useMemo(() => {
    return sets.filter((s) => {
      if (playerFilter) {
        const involved = [s.a1, s.a2, s.b1, s.b2];
        if (!involved.includes(playerFilter)) return false;
      }
      const t = new Date(s.created_at).getTime();
      if (fromDate) {
        const from = new Date(fromDate).getTime();
        if (t < from) return false;
      }
      if (toDate) {
        const to = new Date(toDate).getTime() + 24 * 60 * 60 * 1000 - 1;
        if (t > to) return false;
      }
      return true;
    });
  }, [sets, playerFilter, fromDate, toDate]);

  const hasFilters = !!playerFilter || !!fromDate || !!toDate;

  return (
    <div className="md:col-span-2 rounded-xl border border-[var(--card-border)] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <h3 className="font-semibold">Historial ({filtered.length})</h3>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={playerFilter}
            onChange={(e) => setPlayerFilter(e.target.value)}
            className="bg-transparent border border-[var(--card-border)] rounded-lg p-1.5"
          >
            <option value="">Todos los jugadores</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.tag}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="bg-transparent border border-[var(--card-border)] rounded-lg p-1.5"
          />
          <span className="text-[var(--muted)]">a</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="bg-transparent border border-[var(--card-border)] rounded-lg p-1.5"
          />
          {hasFilters && (
            <button
              onClick={() => {
                setPlayerFilter("");
                setFromDate("");
                setToDate("");
              }}
              className="px-2 py-1.5 rounded-lg border border-[var(--card-border)] hover:bg-black/5 dark:hover:bg-white/5"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-sm text-[var(--muted)]">
          {hasFilters ? "Ningún set coincide con el filtro." : "Aún no hay sets guardados."}
        </div>
      ) : (
        <div className="divide-y divide-[var(--card-border)]">
          {filtered.slice(0, 30).map((s) => {
            const aWon = s.a_games > s.b_games;
            const ids = [s.a1, s.a2, s.b1, s.b2];
            const diffParts = ids.map((id) => {
              const kd = s.stats?.[id] ?? { kills: 0, deaths: 0 };
              const d = kd.kills - kd.deaths;
              const dLabel = d >= 0 ? `+${d}` : `${d}`;
              return `${idToTag.get(id) ?? id}:${dLabel}`;
            });

            return (
              <div key={s.id} className="py-2 flex flex-col gap-1">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <div className="text-sm flex items-center gap-1.5 flex-wrap">
                    {[s.a1, s.a2].map((id) => (
                      <button key={id} onClick={() => onSelectPlayer(id)} className="flex items-center gap-1 hover:underline">
                        <Avatar id={id} tag={idToTag.get(id) ?? id} size={18} />
                        <span className={aWon ? "text-emerald-500 font-semibold" : ""}>{idToTag.get(id) ?? id}</span>
                      </button>
                    ))}
                    <span className="text-[var(--muted)]">vs</span>
                    {[s.b1, s.b2].map((id) => (
                      <button key={id} onClick={() => onSelectPlayer(id)} className="flex items-center gap-1 hover:underline">
                        <Avatar id={id} tag={idToTag.get(id) ?? id} size={18} />
                        <span className={!aWon ? "text-emerald-500 font-semibold" : ""}>{idToTag.get(id) ?? id}</span>
                      </button>
                    ))}
                  </div>
                  <div className="text-xs text-[var(--muted)] tabular-nums flex gap-3">
                    <span className="font-semibold">{s.a_games}-{s.b_games}</span>
                    <span>{fmtDate(s.created_at)}</span>
                  </div>
                </div>
                <div className="text-xs text-[var(--muted)]">Diffs: {diffParts.join(" · ")}</div>
              </div>
            );
          })}
          {filtered.length > 30 && (
            <div className="pt-2 text-xs text-[var(--muted)]">Mostrando últimos 30 de {filtered.length} resultados filtrados.</div>
          )}
        </div>
      )}
    </div>
  );
}
