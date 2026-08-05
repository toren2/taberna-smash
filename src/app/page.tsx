"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type Player = { id: string; tag: string; avatar: string };

type SetRow = {
  id: string;
  a1: string;
  a2: string;
  b1: string;
  b2: string;
  aGames: number;
  bGames: number;
  createdAt: string; // ISO
};

// Cliente de Supabase (Global en cualquier dispositivo)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

const STORAGE_KEY = "taberna_smash_sets_v1";
const ELO_SEASON_KEY = "taberna_smash_elo_season_start_v1";

const ELO_START = 1000;
const ELO_K = 32;

const PLAYERS: Player[] = [
  { id: "meliodas", tag: "Meliodas", avatar: "/meliodas.png" },
  { id: "zenaku", tag: "Zenaku", avatar: "/zenaku.jpg" },
  { id: "pampara", tag: "Pampara", avatar: "/pampara.png" },
  { id: "mono", tag: "Mono", avatar: "/mono.jpg" },
  { id: "viola", tag: "Viola", avatar: "/viola.jpg" },
  { id: "chapfra", tag: "Chapfra", avatar: "/chapfra.jpg" },
];

const PLAYER_COLORS: Record<string, string> = {
  meliodas: "#38bdf8", // cyan
  zenaku: "#34d399",   // emerald
  pampara: "#fbbf24",  // amber
  mono: "#e879f9",     // fuchsia
  viola: "#818cf8",    // indigo
  chapfra: "#fb7185",  // rose
};

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

function expectedScore(rA: number, rB: number) {
  return 1 / (1 + Math.pow(10, (rB - rA) / 400));
}

function roundElo(n: number) {
  return Math.round(n);
}

export default function Page() {
  const [a1, setA1] = useState(PLAYERS[0]?.id ?? "");
  const [a2, setA2] = useState(PLAYERS[1]?.id ?? "");
  const [b1, setB1] = useState(PLAYERS[2]?.id ?? "");
  const [b2, setB2] = useState(PLAYERS[3]?.id ?? "");
  const [score, setScore] = useState<"2-0" | "2-1" | "1-2" | "0-2">("2-0");

  const [msg, setMsg] = useState<string>("");
  const [sets, setSets] = useState<SetRow[]>([]);
  const [eloSeasonStart, setEloSeasonStart] = useState<string | null>(null);

  // Cargar sets (desde Supabase con respaldo en localStorage)
  useEffect(() => {
    async function fetchSets() {
      if (supabase) {
        const { data, error } = await supabase
          .from("sets")
          .select("*")
          .order("created_at", { ascending: false });
        if (!error && data) {
          const formatted = data.map((d: any) => ({
            id: d.id,
            a1: d.a1,
            a2: d.a2,
            b1: d.b1,
            b2: d.b2,
            aGames: d.agames ?? d.aGames,
            bGames: d.bgames ?? d.bGames,
            createdAt: d.created_at ?? d.createdAt,
          }));
          setSets(formatted);
          return;
        }
      }
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as SetRow[];
          if (Array.isArray(parsed)) setSets(parsed);
        }
      } catch {
        // ignore
      }
    }
    fetchSets();
  }, []);

  // Sincronizar temporada Elo
  useEffect(() => {
    try {
      const raw = localStorage.getItem(ELO_SEASON_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (typeof parsed === "string") setEloSeasonStart(parsed);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      if (eloSeasonStart) localStorage.setItem(ELO_SEASON_KEY, JSON.stringify(eloSeasonStart));
      else localStorage.removeItem(ELO_SEASON_KEY);
    } catch {
      // ignore
    }
  }, [eloSeasonStart]);

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

  async function addSet() {
    if (selectionError) {
      setMsg(selectionError);
      return;
    }

    const { aGames, bGames } = parseScore(score);
    const newRow: SetRow = {
      id: crypto.randomUUID(),
      a1,
      a2,
      b1,
      b2,
      aGames,
      bGames,
      createdAt: new Date().toISOString(),
    };

    if (supabase) {
      const { error } = await supabase.from("sets").insert([
        {
          id: newRow.id,
          a1: newRow.a1,
          a2: newRow.a2,
          b1: newRow.b1,
          b2: newRow.b2,
          agames: newRow.aGames,
          bgames: newRow.bGames,
          created_at: newRow.createdAt,
        },
      ]);
      if (error) {
        setMsg("Error al guardar en Supabase: " + error.message);
        return;
      }
    }

    const updated = [newRow, ...sets];
    setSets(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}

    setMsg("Set guardado globalmente ✅");
    setTimeout(() => setMsg(""), 1500);
  }

  async function undoLast() {
    if (sets.length === 0) return;
    const lastSet = sets[0];
    if (supabase) {
      await supabase.from("sets").delete().eq("id", lastSet.id);
    }
    const updated = sets.slice(1);
    setSets(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}
    setMsg("Último set deshecho.");
    setTimeout(() => setMsg(""), 1200);
  }

  async function clearAll() {
    if (!confirm("¿Borrar todo el historial global?")) return;
    if (supabase) {
      for (const s of sets) {
        await supabase.from("sets").delete().eq("id", s.id);
      }
    }
    setSets([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setMsg("Historial borrado.");
    setTimeout(() => setMsg(""), 1200);
  }

  function resetEloSeason() {
    if (!confirm("¿Iniciar nueva temporada Elo desde ahora? (no borra historial)")) return;
    setEloSeasonStart(new Date().toISOString());
    setMsg("Temporada Elo reiniciada ✅");
    setTimeout(() => setMsg(""), 1200);
  }

  function resetEloSeasonToAllTime() {
    if (!confirm("¿Volver Elo a calcularse con TODO el historial?")) return;
    setEloSeasonStart(null);
    setMsg("Elo volverá a usar todo el historial.");
    setTimeout(() => setMsg(""), 1200);
  }

  // Winrate por jugador
  const playerStats = useMemo(() => {
    const stats: Record<string, { tag: string; avatar: string; setsPlayed: number; setsWon: number; winRate: number }> =
      Object.fromEntries(PLAYERS.map((p) => [p.id, { tag: p.tag, avatar: p.avatar, setsPlayed: 0, setsWon: 0, winRate: 0 }]));

    for (const s of sets) {
      const aWon = s.aGames > s.bGames;
      for (const id of [s.a1, s.a2]) {
        if (!stats[id]) continue;
        stats[id].setsPlayed += 1;
        if (aWon) stats[id].setsWon += 1;
      }
      for (const id of [s.b1, s.b2]) {
        if (!stats[id]) continue;
        stats[id].setsPlayed += 1;
        if (!aWon) stats[id].setsWon += 1;
      }
    }

    for (const id of Object.keys(stats)) {
      const x = stats[id];
      x.winRate = x.setsPlayed ? x.setsWon / x.setsPlayed : 0;
    }

    return Object.values(stats).sort((a, b) => b.winRate - a.winRate || b.setsPlayed - a.setsPlayed);
  }, [sets]);

  // Winrate por dúo
  const teamStats = useMemo(() => {
    type DuoKey = string;
    const m = new Map<DuoKey, { duo: string; played: number; won: number; winRate: number }>();

    function keyOf(p1: string, p2: string) {
      return [p1, p2].sort().join("|");
    }

    for (const s of sets) {
      const aKey = keyOf(s.a1, s.a2);
      const bKey = keyOf(s.b1, s.b2);
      const aWon = s.aGames > s.bGames;

      const aObj =
        m.get(aKey) ??
        {
          duo: `${idToTag.get(s.a1) ?? s.a1} + ${idToTag.get(s.a2) ?? s.a2}`,
          played: 0,
          won: 0,
          winRate: 0,
        };
      aObj.played += 1;
      if (aWon) aObj.won += 1;
      m.set(aKey, aObj);

      const bObj =
        m.get(bKey) ??
        {
          duo: `${idToTag.get(s.b1) ?? s.b1} + ${idToTag.get(s.b2) ?? s.b2}`,
          played: 0,
          won: 0,
          winRate: 0,
        };
      bObj.played += 1;
      if (!aWon) bObj.won += 1;
      m.set(bKey, bObj);
    }

    const arr = Array.from(m.values());
    for (const o of arr) o.winRate = o.played ? o.won / o.played : 0;

    return arr.sort((a, b) => b.winRate - a.winRate || b.played - a.played);
  }, [sets, idToTag]);

  // Elo actual y Timeline para el gráfico SVG
  const { eloMap, eloHistory } = useMemo(() => {
    const elo: Record<string, number> = {};
    for (const p of PLAYERS) elo[p.id] = ELO_START;

    const seasonStartMs = eloSeasonStart ? new Date(eloSeasonStart).getTime() : null;
    const chronological = [...sets].sort(
      (x, y) => new Date(x.createdAt).getTime() - new Date(y.createdAt).getTime()
    );

    const history: Array<{ matchIndex: number; ratings: Record<string, number> }> = [];
    const currentRatings: Record<string, number> = {};
    for (const p of PLAYERS) currentRatings[p.id] = ELO_START;
    history.push({ matchIndex: 0, ratings: { ...currentRatings } });

    let matchIdx = 1;
    for (const s of chronological) {
      const t = new Date(s.createdAt).getTime();
      const isSeason = seasonStartMs === null || t >= seasonStartMs;

      const rA1 = elo[s.a1] ?? ELO_START;
      const rA2 = elo[s.a2] ?? ELO_START;
      const rB1 = elo[s.b1] ?? ELO_START;
      const rB2 = elo[s.b2] ?? ELO_START;

      const teamA = (rA1 + rA2) / 2;
      const teamB = (rB1 + rB2) / 2;

      const aWon = s.aGames > s.bGames;
      const expA = expectedScore(teamA, teamB);
      const scoreA = aWon ? 1 : 0;

      const deltaA = ELO_K * (scoreA - expA);
      const share = deltaA / 2;

      if (isSeason) {
        elo[s.a1] = roundElo((elo[s.a1] ?? ELO_START) + share);
        elo[s.a2] = roundElo((elo[s.a2] ?? ELO_START) + share);
        elo[s.b1] = roundElo((elo[s.b1] ?? ELO_START) - share);
        elo[s.b2] = roundElo((elo[s.b2] ?? ELO_START) - share);

        currentRatings[s.a1] = elo[s.a1];
        currentRatings[s.a2] = elo[s.a2];
        currentRatings[s.b1] = elo[s.b1];
        currentRatings[s.b2] = elo[s.b2];
      }

      history.push({ matchIndex: matchIdx++, ratings: { ...currentRatings } });
    }

    return { eloMap: elo, eloHistory: history };
  }, [sets, eloSeasonStart]);

  const eloRanking = useMemo(() => {
    return [...PLAYERS]
      .map((p) => ({ id: p.id, tag: p.tag, avatar: p.avatar, elo: eloMap[p.id] ?? ELO_START }))
      .sort((a, b) => b.elo - a.elo);
  }, [eloMap]);

  const playerOptions = PLAYERS.map((p) => (
    <option key={p.id} value={p.id}>
      {p.tag}
    </option>
  ));

  const eloSeasonLabel = useMemo(() => {
    if (!eloSeasonStart) return "Elo: usando todo el historial";
    return `Elo: temporada desde ${fmtDate(eloSeasonStart)}`;
  }, [eloSeasonStart]);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Taberna Smash 2026</h1>
            <p className="text-zinc-400">2v2 · Sets BO3 · Winrate + Elo global</p>
            <p className="text-xs text-zinc-500 mt-1">{eloSeasonLabel} · K={ELO_K} · base {ELO_START}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={undoLast}
              className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm disabled:opacity-40"
              disabled={sets.length === 0}
            >
              Undo
            </button>
            <button
              onClick={resetEloSeason}
              className="px-3 py-2 rounded-lg bg-indigo-900/60 hover:bg-indigo-900 text-sm"
            >
              Reset Elo (Temporada)
            </button>
            <button
              onClick={resetEloSeasonToAllTime}
              className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm"
            >
              Elo: Todo
            </button>
            <button
              onClick={clearAll}
              className="px-3 py-2 rounded-lg bg-red-900/60 hover:bg-red-900 text-sm disabled:opacity-40"
              disabled={sets.length === 0}
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
                ☁️ Sincronizado en tiempo real vía Supabase.
              </div>
            </div>
          </div>

          {/* Stats & Gráfico */}
          <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4 lg:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Elo Ranking */}
              <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-3">
                <h3 className="font-semibold mb-2">Ranking Elo (jugadores)</h3>
                <div className="space-y-3">
                  {eloRanking.map((p, idx) => (
                    <div key={p.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3 font-medium">
                        <span className="text-zinc-500 text-sm">#{idx + 1}</span>
                        <img 
                          src={p.avatar} 
                          alt={p.tag} 
                          className="w-8 h-8 rounded-full object-cover border border-zinc-700 bg-zinc-800"
                        />
                        <span>{p.tag}</span>
                      </div>
                      <div className="text-sm text-zinc-300 tabular-nums font-bold">{p.elo}</div>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-zinc-500 mt-3">{eloSeasonLabel}</div>
              </div>

              {/* Winrate players */}
              <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-3">
                <h3 className="font-semibold mb-2">Winrate por jugador</h3>
                <div className="space-y-3">
                  {playerStats.map((p) => (
                    <div key={p.tag} className="flex items-center justify-between">
                      <div className="flex items-center gap-3 font-medium">
                        <img 
                          src={p.avatar} 
                          alt={p.tag} 
                          className="w-8 h-8 rounded-full object-cover border border-zinc-700 bg-zinc-800"
                        />
                        <span>{p.tag}</span>
                      </div>
                      <div className="text-sm text-zinc-300 tabular-nums">
                        {p.setsWon}/{p.setsPlayed} · {(p.winRate * 100).toFixed(0)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* GRÁFICO COOL DE ELO EN EL TIEMPO */}
              <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-3 md:col-span-2">
                <h3 className="font-semibold mb-2">Evolución de Elo en el tiempo</h3>
                {eloHistory.length <= 1 ? (
                  <div className="text-sm text-zinc-500 py-6 text-center">Registra más partidas para ver el gráfico de evolución.</div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-full h-48 bg-zinc-900/50 rounded-lg p-2 relative flex items-end">
                      <svg className="w-full h-full overflow-visible" viewBox="0 0 500 200">
                        {[0.25, 0.5, 0.75].map((ratio, i) => (
                          <line
                            key={i}
                            x1="0"
                            y1={200 * ratio}
                            x2="500"
                            y2={200 * ratio}
                            stroke="#27272a"
                            strokeWidth="1"
                            strokeDasharray="4 4"
                          />
                        ))}

                        {(() => {
                          const allRatings = eloHistory.flatMap((h) => Object.values(h.ratings));
                          const minElo = Math.min(...allRatings, 950);
                          const maxElo = Math.max(...allRatings, 1050);
                          const range = maxElo - minElo || 100;
                          const pointsCount = eloHistory.length;

                          return PLAYERS.map((player) => {
                            const color = PLAYER_COLORS[player.id] || "#fff";
                            const coords = eloHistory.map((h, idx) => {
                              const x = pointsCount > 1 ? (idx / (pointsCount - 1)) * 480 + 10 : 250;
                              const val = h.ratings[player.id] ?? ELO_START;
                              const y = 190 - ((val - minElo) / range) * 180;
                              return `${x},${y}`;
                            });

                            return (
                              <g key={player.id}>
                                <polyline
                                  fill="none"
                                  stroke={color}
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  points={coords.join(" ")}
                                />
                                {eloHistory.map((h, idx) => {
                                  const x = pointsCount > 1 ? (idx / (pointsCount - 1)) * 480 + 10 : 250;
                                  const val = h.ratings[player.id] ?? ELO_START;
                                  const y = 190 - ((val - minElo) / range) * 180;
                                  return (
                                    <circle
                                      key={idx}
                                      cx={x}
                                      cy={y}
                                      r="3"
                                      fill={color}
                                    />
                                  );
                                })}
                              </g>
                            );
                          });
                        })()}
                      </svg>
                    </div>

                    <div className="flex flex-wrap gap-4 justify-center pt-1 text-xs">
                      {PLAYERS.map((p) => (
                        <div key={p.id} className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: PLAYER_COLORS[p.id] }} />
                          <span className="text-zinc-300 font-medium">{p.tag}</span>
                          <span className="text-zinc-500 font-mono">({eloMap[p.id]})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Winrate duos */}
              <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-3 md:col-span-2">
                <h3 className="font-semibold mb-2">Winrate por dúo</h3>
                {teamStats.length === 0 ? (
                  <div className="text-sm text-zinc-500">Aún no hay dúos registrados.</div>
                ) : (
                  <div className="space-y-2">
                    {teamStats.slice(0, 12).map((d) => (
                      <div key={d.duo} className="flex items-center justify-between">
                        <div className="font-medium">{d.duo}</div>
                        <div className="text-sm text-zinc-300 tabular-nums">
                          {d.won}/{d.played} · {(d.winRate * 100).toFixed(0)}%
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* History */}
              <div className="md:col-span-2 rounded-xl bg-zinc-950 border border-zinc-800 p-3">
                <h3 className="font-semibold mb-2">Historial global ({sets.length} partidas)</h3>
                {sets.length === 0 ? (
                  <div className="text-sm text-zinc-500">Aún no hay sets guardados.</div>
                ) : (
                  <div className="max-h-72 overflow-y-auto divide-y divide-zinc-800 pr-1">
                    {sets.map((s) => {
                      const aWon = s.aGames > s.bGames;
                      const aNames = `${idToTag.get(s.a1) ?? s.a1} + ${idToTag.get(s.a2) ?? s.a2}`;
                      const bNames = `${idToTag.get(s.b1) ?? s.b1} + ${idToTag.get(s.b2) ?? s.b2}`;
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