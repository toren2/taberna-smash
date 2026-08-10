"use client";

import { useEffect, useState } from "react";
import { Player, SetRow } from "@/lib/types";
import { Avatar } from "./Avatar";

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function TrashPanel({
  players,
  idToTag,
  fetchTrash,
  onRestore,
  onHardDelete,
  onEmptyTrash,
  onClose,
}: {
  players: Player[];
  idToTag: Map<string, string>;
  fetchTrash: () => Promise<{ data: SetRow[]; error: Error | null }>;
  onRestore: (id: string) => Promise<{ error: Error | null }>;
  onHardDelete: (id: string) => Promise<{ error: Error | null }>;
  onEmptyTrash: () => Promise<{ error: Error | null }>;
  onClose: () => void;
}) {
  const [items, setItems] = useState<SetRow[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  async function load() {
    const { data } = await fetchTrash();
    setItems(data);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function flash(text: string) {
    setMsg(text);
    setTimeout(() => setMsg(""), 1500);
  }

  async function handleRestore(id: string) {
    setBusyId(id);
    const { error } = await onRestore(id);
    setBusyId(null);
    flash(error ? "No se pudo restaurar." : "Set restaurado ✅");
    load();
  }

  async function handleHardDelete(id: string) {
    if (!confirm("¿Eliminar este set para siempre? No se puede deshacer.")) return;
    setBusyId(id);
    const { error } = await onHardDelete(id);
    setBusyId(null);
    flash(error ? "No se pudo eliminar." : "Eliminado para siempre.");
    load();
  }

  async function handleEmptyTrash() {
    if (!items || items.length === 0) return;
    if (!confirm(`¿Vaciar la papelera completa (${items.length} sets)? No se puede deshacer.`)) return;
    const { error } = await onEmptyTrash();
    flash(error ? "No se pudo vaciar." : "Papelera vaciada.");
    load();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
      <div className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">🗑️ Papelera</h2>
          <button onClick={onClose} className="text-sm px-2 py-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10">
            Cerrar
          </button>
        </div>

        {msg && <div className="rounded-lg border border-[var(--card-border)] p-2 text-sm text-center mb-3">{msg}</div>}

        {items === null ? (
          <div className="text-sm text-[var(--muted)] py-6 text-center">Cargando...</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-[var(--muted)] py-6 text-center">La papelera está vacía.</div>
        ) : (
          <>
            <div className="divide-y divide-[var(--card-border)] mb-3">
              {items.map((s) => {
                const aWon = s.a_games > s.b_games;
                return (
                  <div key={s.id} className="py-2.5 flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap text-sm">
                      {[s.a1, s.a2].map((id) => (
                        <span key={id} className="flex items-center gap-1">
                          <Avatar id={id} tag={idToTag.get(id) ?? id} size={18} />
                          <span className={aWon ? "font-semibold" : ""}>{idToTag.get(id) ?? id}</span>
                        </span>
                      ))}
                      <span className="text-[var(--muted)]">vs</span>
                      {[s.b1, s.b2].map((id) => (
                        <span key={id} className="flex items-center gap-1">
                          <Avatar id={id} tag={idToTag.get(id) ?? id} size={18} />
                          <span className={!aWon ? "font-semibold" : ""}>{idToTag.get(id) ?? id}</span>
                        </span>
                      ))}
                      <span className="ml-auto text-xs font-semibold tabular-nums">
                        {s.a_games}-{s.b_games}
                      </span>
                    </div>
                    <div className="text-[11px] text-[var(--muted)]">
                      Jugado: {fmtDate(s.created_at)}
                      {s.deleted_at ? ` · Eliminado: ${fmtDate(s.deleted_at)}` : ""}
                    </div>
                    <div className="flex gap-2 mt-0.5">
                      <button
                        onClick={() => handleRestore(s.id)}
                        disabled={busyId === s.id}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs hover:bg-emerald-500/20 disabled:opacity-40"
                      >
                        Restaurar
                      </button>
                      <button
                        onClick={() => handleHardDelete(s.id)}
                        disabled={busyId === s.id}
                        className="px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs hover:bg-red-500/20 disabled:opacity-40"
                      >
                        Eliminar para siempre
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              onClick={handleEmptyTrash}
              className="w-full px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm hover:bg-red-500/20"
            >
              Vaciar papelera ({items.length})
            </button>
          </>
        )}
      </div>
    </div>
  );
}
