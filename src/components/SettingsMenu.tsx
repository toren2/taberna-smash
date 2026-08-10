"use client";

import { useState } from "react";
import { Player, SetRow } from "@/lib/types";
import { TrashPanel } from "./TrashPanel";

export function SettingsMenu({
  players,
  idToTag,
  sets,
  eloSeasonLabel,
  onResetSeason,
  onAllTimeElo,
  onClearAll,
  fetchTrash,
  onRestore,
  onHardDelete,
  onEmptyTrash,
  onClose,
}: {
  players: Player[];
  idToTag: Map<string, string>;
  sets: SetRow[];
  eloSeasonLabel: string;
  onResetSeason: () => void;
  onAllTimeElo: () => void;
  onClearAll: () => void;
  fetchTrash: () => Promise<{ data: SetRow[]; error: Error | null }>;
  onRestore: (id: string) => Promise<{ error: Error | null }>;
  onHardDelete: (id: string) => Promise<{ error: Error | null }>;
  onEmptyTrash: () => Promise<{ error: Error | null }>;
  onClose: () => void;
}) {
  const [showTrash, setShowTrash] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
      <div className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">⚙️ Ajustes</h2>
          <button onClick={onClose} className="text-sm px-2 py-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10">
            Cerrar
          </button>
        </div>

        <div className="space-y-2">
          <button
            onClick={() => setShowTrash(true)}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-[var(--card-border)] text-sm hover:bg-black/5 dark:hover:bg-white/5"
          >
            <span>🗑️ Papelera</span>
            <span className="text-[var(--muted)]">Ver / restaurar sets eliminados</span>
          </button>

          <div className="pt-2 mt-2 border-t border-[var(--card-border)]">
            <div className="text-xs text-[var(--muted)] mb-2">{eloSeasonLabel}</div>
            <button
              onClick={onResetSeason}
              className="w-full px-3 py-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-sm hover:bg-indigo-500/20 mb-2"
            >
              Reset Elo (Temporada)
            </button>
            <button
              onClick={onAllTimeElo}
              className="w-full px-3 py-2.5 rounded-lg border border-[var(--card-border)] text-sm hover:bg-black/5 dark:hover:bg-white/5"
            >
              Elo: usar todo el historial
            </button>
          </div>

          <div className="pt-2 mt-2 border-t border-[var(--card-border)]">
            <button
              onClick={onClearAll}
              disabled={sets.length === 0}
              className="w-full px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm hover:bg-red-500/20 disabled:opacity-40"
            >
              Borrar todo el historial
            </button>
            <div className="text-[11px] text-[var(--muted)] mt-1.5">
              No es definitivo: los sets van a la papelera y se pueden restaurar.
            </div>
          </div>
        </div>
      </div>

      {showTrash && (
        <TrashPanel
          players={players}
          idToTag={idToTag}
          fetchTrash={fetchTrash}
          onRestore={onRestore}
          onHardDelete={onHardDelete}
          onEmptyTrash={onEmptyTrash}
          onClose={() => setShowTrash(false)}
        />
      )}
    </div>
  );
}
