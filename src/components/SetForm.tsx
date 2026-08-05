"use client";

import { useEffect, useMemo, useState } from "react";
import { Player, ScoreOption, clampInt, kdDefault } from "@/lib/types";
import { Avatar } from "./Avatar";

function parseScore(s: ScoreOption) {
  if (s === "2-0") return { a_games: 2, b_games: 0 };
  if (s === "2-1") return { a_games: 2, b_games: 1 };
  if (s === "1-2") return { a_games: 1, b_games: 2 };
  return { a_games: 0, b_games: 2 };
}

export function SetForm({
  players,
  onSubmit,
}: {
  players: Player[];
  onSubmit: (row: {
    a1: string;
    a2: string;
    b1: string;
    b2: string;
    a_games: number;
    b_games: number;
    stats: Record<string, { kills: number; deaths: number }>;
  }) => Promise<{ error: unknown }>;
}) {
  const activePlayers = useMemo(() => players.filter((p) => p.active), [players]);

  const [a1, setA1] = useState("");
  const [a2, setA2] = useState("");
  const [b1, setB1] = useState("");
  const [b2, setB2] = useState("");
  const [score, setScore] = useState<ScoreOption>("2-0");
  const [kdInputs, setKdInputs] = useState<Record<string, { kills: number; deaths: number }>>({});
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (activePlayers.length < 4) return;
    if (!a1) setA1(activePlayers[0]?.id ?? "");
    if (!a2) setA2(activePlayers[1]?.id ?? "");
    if (!b1) setB1(activePlayers[2]?.id ?? "");
    if (!b2) setB2(activePlayers[3]?.id ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePlayers.length]);

  const selectedIds = useMemo(() => [a1, a2, b1, b2], [a1, a2, b1, b2]);
  const idToTag = useMemo(() => new Map(players.map((p) => [p.id, p.tag])), [players]);

  useEffect(() => {
    setKdInputs((prev) => {
      const next = { ...prev };
      for (const id of selectedIds) {
        if (!id) continue;
        if (!next[id]) next[id] = kdDefault();
      }
      return next;
    });
  }, [selectedIds.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectionError = useMemo(() => {
    if (activePlayers.length < 4) return "Necesitas al menos 4 jugadores activos.";
    if (selectedIds.some((x) => !x)) return "Faltan jugadores por seleccionar.";
    if (new Set(selectedIds).size !== 4) return "No se puede repetir jugador en el mismo set.";
    return "";
  }, [selectedIds, activePlayers.length]);

  function setKd(id: string, field: "kills" | "deaths", value: string) {
    const n = clampInt(Number(value));
    setKdInputs((prev) => ({ ...prev, [id]: { ...(prev[id] ?? kdDefault()), [field]: n } }));
  }

  async function handleSubmit() {
    if (selectionError) {
      setMsg(selectionError);
      return;
    }
    const { a_games, b_games } = parseScore(score);
    const stats: Record<string, { kills: number; deaths: number }> = {};
    for (const id of selectedIds) {
      stats[id] = {
        kills: clampInt(kdInputs[id]?.kills ?? 0),
        deaths: clampInt(kdInputs[id]?.deaths ?? 0),
      };
    }
    setSaving(true);
    const { error } = await onSubmit({ a1, a2, b1, b2, a_games, b_games, stats });
    setSaving(false);
    if (error) {
      setMsg("No se pudo guardar el set.");
      return;
    }
    setMsg("Set guardado ✅");
    setKdInputs({});
    setTimeout(() => setMsg(""), 1500);
  }

  const playerOptions = activePlayers.map((p) => (
    <option key={p.id} value={p.id}>
      {p.tag}
    </option>
  ));

  return (
    <div className="rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] p-4">
      <h2 className="text-lg font-semibold mb-3">Registrar set</h2>

      <div className="space-y-3">
        <div>
          <div className="text-sm text-[var(--muted)] mb-1">Team A</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 border border-[var(--card-border)] rounded-lg p-1 pl-2">
              <Avatar id={a1} tag={idToTag.get(a1) ?? a1} size={22} />
              <select value={a1} onChange={(e) => setA1(e.target.value)} className="w-full bg-transparent p-1 text-sm">
                {playerOptions}
              </select>
            </div>
            <div className="flex items-center gap-2 border border-[var(--card-border)] rounded-lg p-1 pl-2">
              <Avatar id={a2} tag={idToTag.get(a2) ?? a2} size={22} />
              <select value={a2} onChange={(e) => setA2(e.target.value)} className="w-full bg-transparent p-1 text-sm">
                {playerOptions}
              </select>
            </div>
          </div>
        </div>

        <div>
          <div className="text-sm text-[var(--muted)] mb-1">Team B</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 border border-[var(--card-border)] rounded-lg p-1 pl-2">
              <Avatar id={b1} tag={idToTag.get(b1) ?? b1} size={22} />
              <select value={b1} onChange={(e) => setB1(e.target.value)} className="w-full bg-transparent p-1 text-sm">
                {playerOptions}
              </select>
            </div>
            <div className="flex items-center gap-2 border border-[var(--card-border)] rounded-lg p-1 pl-2">
              <Avatar id={b2} tag={idToTag.get(b2) ?? b2} size={22} />
              <select value={b2} onChange={(e) => setB2(e.target.value)} className="w-full bg-transparent p-1 text-sm">
                {playerOptions}
              </select>
            </div>
          </div>
        </div>

        <div>
          <div className="text-sm text-[var(--muted)] mb-1">Resultado (BO3)</div>
          <div className="grid grid-cols-2 gap-2">
            {(["2-0", "2-1", "1-2", "0-2"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setScore(s)}
                className={[
                  "p-3 rounded-xl border text-center font-semibold transition-colors",
                  score === s
                    ? "bg-[var(--accent)] text-[var(--accent-foreground)] border-[var(--accent)]"
                    : "border-[var(--card-border)] hover:bg-black/5 dark:hover:bg-white/5",
                ].join(" ")}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--card-border)] p-3">
          <div className="text-sm font-semibold mb-2">Kills / Deaths (por set)</div>
          <div className="space-y-2">
            {selectedIds.map((id) => {
              if (!id) return null;
              const tag = idToTag.get(id) ?? id;
              const kd = kdInputs[id] ?? kdDefault();
              const diff = (kd.kills ?? 0) - (kd.deaths ?? 0);
              const diffLabel = diff >= 0 ? `+${diff}` : `${diff}`;
              return (
                <div key={id} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-5 text-sm font-medium truncate flex items-center gap-1.5">
                    <Avatar id={id} tag={tag} size={18} />
                    {tag} <span className="text-xs text-[var(--muted)]">({diffLabel})</span>
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      min={0}
                      value={kd.kills}
                      onChange={(e) => setKd(id, "kills", e.target.value)}
                      className="w-full bg-transparent border border-[var(--card-border)] rounded-lg p-2 text-sm"
                      placeholder="Kills"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      min={0}
                      value={kd.deaths}
                      onChange={(e) => setKd(id, "deaths", e.target.value)}
                      className="w-full bg-transparent border border-[var(--card-border)] rounded-lg p-2 text-sm"
                      placeholder="Deaths"
                    />
                  </div>
                  <div className="col-span-1 text-xs text-[var(--muted)] text-right">K/D</div>
                </div>
              );
            })}
          </div>
        </div>

        {(msg || selectionError) && (
          <div className="text-sm rounded-lg border border-[var(--card-border)] p-2 text-center">
            {msg || selectionError}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!!selectionError || saving}
          className="w-full py-3 rounded-xl bg-[var(--accent)] text-[var(--accent-foreground)] font-bold hover:opacity-90 disabled:opacity-40"
        >
          {saving ? "Guardando..." : "Guardar set"}
        </button>
      </div>
    </div>
  );
}
