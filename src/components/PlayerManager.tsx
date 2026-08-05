"use client";

import { useState } from "react";
import { Player } from "@/lib/types";
import { Avatar } from "./Avatar";

function slugify(tag: string) {
  return tag
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function PlayerManager({
  players,
  onAdd,
  onRename,
  onSetActive,
  onDelete,
  onClose,
}: {
  players: Player[];
  onAdd: (id: string, tag: string) => Promise<{ error: unknown }>;
  onRename: (id: string, tag: string) => Promise<{ error: unknown }>;
  onSetActive: (id: string, active: boolean) => Promise<{ error: unknown }>;
  onDelete: (id: string) => Promise<{ error: unknown }>;
  onClose: () => void;
}) {
  const [newTag, setNewTag] = useState("");
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  async function handleAdd() {
    const tag = newTag.trim();
    if (!tag) return;
    const id = slugify(tag);
    if (!id) {
      setError("Nombre inválido.");
      return;
    }
    if (players.some((p) => p.id === id)) {
      setError("Ya existe un jugador con ese nombre.");
      return;
    }
    const { error: err } = await onAdd(id, tag);
    if (err) {
      setError("No se pudo añadir el jugador.");
      return;
    }
    setNewTag("");
    setError("");
  }

  async function handleRename(id: string) {
    const tag = editValue.trim();
    if (!tag) return;
    await onRename(id, tag);
    setEditingId(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
      <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Jugadores</h2>
          <button onClick={onClose} className="text-sm px-2 py-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10">
            Cerrar
          </button>
        </div>

        <div className="flex gap-2 mb-3">
          <input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Nombre del nuevo jugador"
            className="flex-1 rounded-lg border border-[var(--card-border)] bg-transparent p-2 text-sm"
          />
          <button
            onClick={handleAdd}
            className="px-3 py-2 rounded-lg bg-emerald-500 text-zinc-950 font-semibold text-sm hover:bg-emerald-400"
          >
            Añadir
          </button>
        </div>
        {error && <div className="text-xs text-red-400 mb-3">{error}</div>}

        <div className="space-y-2">
          {players.map((p) => (
            <div key={p.id} className="flex items-center gap-2 rounded-lg border border-[var(--card-border)] p-2">
              {editingId === p.id ? (
                <input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleRename(p.id)}
                  autoFocus
                  className="flex-1 rounded-lg border border-[var(--card-border)] bg-transparent p-1 text-sm"
                />
              ) : (
                <div className={`flex-1 flex items-center gap-2 text-sm ${p.active ? "" : "opacity-40 line-through"}`}>
                  <Avatar id={p.id} tag={p.tag} size={24} />
                  {p.tag}
                </div>
              )}

              {editingId === p.id ? (
                <button onClick={() => handleRename(p.id)} className="text-xs px-2 py-1 rounded bg-emerald-500 text-zinc-950 font-semibold">
                  OK
                </button>
              ) : (
                <button
                  onClick={() => {
                    setEditingId(p.id);
                    setEditValue(p.tag);
                  }}
                  className="text-xs px-2 py-1 rounded hover:bg-black/10 dark:hover:bg-white/10"
                >
                  Editar
                </button>
              )}

              <button
                onClick={() => onSetActive(p.id, !p.active)}
                className="text-xs px-2 py-1 rounded hover:bg-black/10 dark:hover:bg-white/10"
                title={p.active ? "Ocultar de selección (mantiene historial)" : "Reactivar"}
              >
                {p.active ? "Ocultar" : "Activar"}
              </button>

              <button
                onClick={() => {
                  if (confirm(`¿Eliminar a ${p.tag}? Solo funciona si no tiene sets registrados.`)) {
                    onDelete(p.id);
                  }
                }}
                className="text-xs px-2 py-1 rounded text-red-400 hover:bg-red-500/10"
              >
                Borrar
              </button>
            </div>
          ))}
        </div>
        <p className="text-xs text-[var(--muted)] mt-3">
          &quot;Ocultar&quot; quita al jugador de las listas para nuevos sets, pero conserva su historial y estadísticas. &quot;Borrar&quot; solo funciona si nunca jugó ningún set.
        </p>
      </div>
    </div>
  );
}
