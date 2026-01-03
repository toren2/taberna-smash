"use client";

import React, { useEffect, useMemo, useState } from "react";

type Player = { id: string; tag: string };

type SetRow = {
  id: string;
  a1: string;
  a2: string;
  b1: string;
  b2: string;
  aGames: number; // 2 or 1
  bGames: number; // 0 or 1 or 2
  createdAt: string;
};

const STORAGE_KEY = "taberna_smash_sets_v1";

const PLAYERS: Player[] = [
  { id: "meliodas", tag: "Meliodas" },
  { id: "zenaku", tag: "Zenaku" },
  { id: "pampara", tag: "Pampara" },
  { id: "mono", tag: "Mono" },
  { id: "viola", tag: "Viola" },
  { id: "chapfra", tag: "Chapfra" },
];

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function uniq(arr: string[]) {
  return Array.from(new Set(arr));
}

export default function Page() {
  // selections
  const [a1, setA1] = useState(PLAYERS[0]?.id ?? "");
  const [a2, setA2] = useState(PLAYERS[1]?.id ?? "");
  const [b1, setB1] = useState(PLAYERS[2]?.id ?? "");
  const [b2, setB2] = useState(PLAYERS[3]?.id ?? "");
  const [score, setScore] = useState<"2-0" | "2-1" | "1-2" | "0-2">("2-0");
  const [msg, setMsg] = useState<string>("");

  const [sets, setSets] = useState<SetRow[]>([]);

  // load from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as SetRow[];
      if (Array.isArray(parsed)) setSets(parsed);
    } catch {
      // ignore
    }
  }, []);

  // save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sets));
    } catch {
      // ignore
    }
  }, [sets]);

  const idToTag = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of PLAYERS) m.set(p.id, p.tag);
    return m;
  }, []);

  const selectedIds = useMemo(() => [a1, a2, b1, b2], [a1, a2, b1, b2]);

  const selectionError = useMemo(() => {
    if (selectedIds.some((x) => !x)) return "Faltan jugadores por seleccionar.";
    if (uniq(selectedIds).length !== 4) return "No se puede repetir jugador en el mismo set.";
    return "";
  }, [selectedIds]);

  function parseScore(s: "2-0" | "2-1" | "1-2" | "0-2") {
    if (s === "2-0") return { aGames: 2, bGames: 0 };
    if (s === "2-1") return { aGames: 2, bGames: 1 };
    if (s === "1-2") return { aGames: 1, bGames: 2 };
    return { aGames: 0, bGames: 2 };
  }

  function addSet() {
    if (selectionError) {
      setMsg(selectionError);
      return;
    }

    const { aGames, bGames } = parseScore(score);

    const row: SetRow = {
      id: crypto.randomUUID(),
      a1,
      a2,
      b1,
      b2,
      aGames,
      bGames,
      createdAt: new Date().toISOString(),
    };

    setSets((prev) => [row, ...prev]);
    setMsg("Set guardado ✅");
    setTimeout(() => setMsg(""), 1500);
  }

  function undoLast() {
    setMsg("");
    setSets((prev) => prev.slice(1));
  }

  function clearAll() {
    if (!confirm("¿Borrar todo el historial?")) return;
    setSets([]);
    setMsg("Historial borrado.");
    setTimeout(() => setMsg(""), 1500);
  }

  const playerStats = useMemo(() => {
    // per player: setsPlayed, setsWon, winRate
    const stats: Record<
      string,
      { tag: string; setsPlayed: number; setsWon: number; winRate: number }
    > = {};

    for (const p of PLAYERS) {
      stats[p.id] = { tag: p.tag, setsPlayed: 0, setsWon: 0, winRate: 0 };
    }

    for (const s of sets) {
      const teamA = [s.a1, s.a2];
      const teamB = [s.b1, s.b2];
      const aWon = s.aGames > s.bGames;

      for (const id of teamA) {
        if (!stats[id]) continue;
        stats[id].setsPlayed += 1;
        if (aWon) stats[id].setsWon += 1;
      }
      for (const id of teamB) {
        if (!stats[id]) continue;
        stats[id].setsPlayed += 1;
        if (!aWon) stats[id].setsWon += 1;
      }
    }

    for (const id of Object.keys(stats)) {
      const x = stats[id];
      x.winRate = x.setsPlayed ? x.setsWon / x.setsPlayed : 0;
    }

    return Object.values(stats).sort((a, b) => b.winRate - a.winRate);
  }, [sets]);

  const teamStats = useMemo(() => {
    // exact duo pairing stats
    type DuoKey = string; // "a|b" (sorted)
    const m = new Map<
      DuoKey,
      { duo: string; played: number; won: number; winRate: number }
    >();

    function keyOf(p1: string, p2: string) {
      return [p1, p2].sort().join("|");
    }

    for (const s of sets) {
      const aKey = keyOf(s.a1, s.a2);
      const bKey = keyOf(s.b1, s.b2);
      const aWon = s.aGames > s.bGames;

      const aObj =
        m.get(aKey) ??
        { duo: `${idToTag.get(s.a1)} + ${idToTag.get(s.a2)}`, played: 0, won: 0, winRate: 0 };
      aObj.played += 1;
      if (aWon) aObj.won += 1;
      m.set(aKey, aObj);

      const bObj =
        m.get(bKey) ??
        { duo: `${idToTag.get(s.b1)} + ${idToTag.get(s.b2)}`, played: 0, won: 0, winRate: 0 };
      bObj.played += 1;
      if (!aWon) bObj.won += 1;
      m.set(bKey, bObj);
    }

    const arr = Array.from(m.values());
    for (const o of arr) o.winRate = o.played ? o.won / o.played : 0;

    return arr.sort((a, b) => b.winRate - a.winRate);
  }, [sets, idToTag]);

  const playerOptions = PLAYERS.map((p) => (
    <option key={p.id} value={p.id}>
      {p.tag}
    </option>
  ));

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Taberna Smash 2026</h1>
            <p className="text-zinc-400">2v2 · Sets BO3 · Winrate por jugador y por dúo</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={undoLast}
              className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm"
              disabled={sets.length === 0}
              title="Deshacer último set"
            >
              Undo
            </button>
            <button
              onClick={clearAll}
              className="px-3 py-2 rounded-lg bg-red-900/60 hover:bg-red-900 text-sm"
              disabled={sets.length === 0}
              title="Borrar todo"
            >
              Borrar
            </button>
          </div>
        </header>

        {msg && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-sm">
            {msg}
          </div>
        )}

        {selectionError && (
          <div className="rounded-xl border border-amber-800/40 bg-amber-900/20 p-3 text-sm text-amber-200">
            {selectionError}
          </div>
        )}

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Registrar */}
          <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4 lg:col-span-1">
            <h2 className="text-lg font-semibold mb-3">Registrar set</h2>

            <div className="space-y-3">
              <div>
                <div className="text-sm text-zinc-400 mb-1">Team A</div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={a1}
                    onChange={(e) => setA1(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2"
                  >
                    {playerOptions}
                  </select>
                  <select
                    value={a2}
                    onChange={(e) => setA2(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2"
                  >
                    {playerOptions}
                  </select>
                </div>
              </div>

              <div>
                <div className="text-sm text-zinc-400 mb-1">Team B</div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={b1}
                    onChange={(e) => setB1(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2"
                  >
                    {playerOptions}
                  </select>
                  <select
                    value={b2}
                    onChange={(e) => setB2(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2"
                  >
                    {playerOptions}
                  </select>
                </div>
              </div>

              <div>
                <div className="text-sm text-zinc-400 mb-1">Resultado (BO3)</div>
                <div className="grid grid-cols-2 gap-2">
                  {(["2-0", "2-1", "1-2", "0-2"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setScore(s)}
                      className={[
                        "p-3 rounded-xl border text-center font-semibold",
                        score === s
                          ? "bg-zinc-100 text-zinc-950 border-zinc-100"
                          : "bg-zinc-950 border-zinc-800 hover:bg-zinc-900",
                      ].join(" ")}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={addSet}
                className="w-full py-3 rounded-xl bg-emerald-500 text-zinc-950 font-bold hover:bg-emerald-400 disabled:opacity-40"
                disabled={!!selectionError}
              >
                Guardar set
              </button>

              <div className="text-xs text-zinc-500">
                Guardado local (este dispositivo). Luego lo hacemos multiusuario si quieres.
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4 lg:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Winrate players */}
              <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-3">
                <h3 className="font-semibold mb-2">Winrate por jugador</h3>
                <div className="space-y-2">
                  {playerStats.map((p) => (
                    <div key={p.tag} className="flex items-center justify-between">
                      <div className="font-medium">{p.tag}</div>
                      <div className="text-sm text-zinc-300 tabular-nums">
                        {p.setsWon}/{p.setsPlayed} · {(p.winRate * 100).toFixed(0)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Winrate duos */}
              <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-3">
                <h3 className="font-semibold mb-2">Winrate por dúo</h3>
                {teamStats.length === 0 ? (
                  <div className="text-sm text-zinc-500">Aún no hay dúos registrados.</div>
                ) : (
                  <div className="space-y-2">
                    {teamStats.slice(0, 10).map((d) => (
                      <div key={d.duo} className="flex items-center justify-between">
                        <div className="font-medium">{d.duo}</div>
                        <div className="text-sm text-zinc-300 tabular-nums">
                          {d.won}/{d.played} · {(d.winRate * 100).toFixed(0)}%
                        </div>
                      </div>
                    ))}
                    {teamStats.length > 10 && (
                      <div className="text-xs text-zinc-500">
                        Mostrando top 10 (hay {teamStats.length} dúos).
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* History */}
              <div className="md:col-span-2 rounded-xl bg-zinc-950 border border-zinc-800 p-3">
                <h3 className="font-semibold mb-2">Historial (últimos primero)</h3>
                {sets.length === 0 ? (
                  <div className="text-sm text-zinc-500">Aún no has guardado sets.</div>
                ) : (
                  <div className="divide-y divide-zinc-800">
                    {sets.slice(0, 25).map((s) => {
                      const aWon = s.aGames > s.bGames;
                      const aNames = `${idToTag.get(s.a1)} + ${idToTag.get(s.a2)}`;
                      const bNames = `${idToTag.get(s.b1)} + ${idToTag.get(s.b2)}`;
                      return (
                        <div key={s.id} className="py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                          <div className="text-sm">
                            <span className={aWon ? "text-emerald-300 font-semibold" : "text-zinc-200"}>
                              {aNames}
                            </span>{" "}
                            <span className="text-zinc-500">vs</span>{" "}
                            <span className={!aWon ? "text-emerald-300 font-semibold" : "text-zinc-200"}>
                              {bNames}
                            </span>
                          </div>
                          <div className="text-xs text-zinc-400 tabular-nums flex gap-3">
                            <span className="font-semibold text-zinc-200">
                              {s.aGames}-{s.bGames}
                            </span>
                            <span>{fmtDate(s.createdAt)}</span>
                          </div>
                        </div>
                      );
                    })}
                    {sets.length > 25 && (
                      <div className="pt-2 text-xs text-zinc-500">
                        Mostrando últimos 25 (hay {sets.length} sets).
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
