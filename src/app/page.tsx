"use client";

import React, { useEffect, useMemo, useState } from "react";

type Player = { id: string; tag: string; avatar: string };

type KD = {
  kills: number;
  deaths: number;
};

type SetRow = {
  id: string;
  a1: string;
  a2: string;
  b1: string;
  b2: string;
  aGames: number;
  bGames: number;
  createdAt: string; // ISO
  stats?: Record<string, KD>; // playerId -> {kills,deaths}
};

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

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function uniq(arr: string[]): string[] {
  return Array.from(new Set(arr));
}

function expectedScore(rA: number, rB: number): number {
  return 1 / (1 + Math.pow(10, (rB - rA) / 400));
}

function roundElo(n: number): number {
  return Math.round(n);
}

export default function Page() {
  const [a1, setA1] = useState<string>(PLAYERS[0]?.id ?? "");
  const [a2, setA2] = useState<string>(PLAYERS[1]?.id ?? "");
  const [b1, setB1] = useState<string>(PLAYERS[2]?.id ?? "");
  const [b2, setB2] = useState<string>(PLAYERS[3]?.id ?? "");
  const [score, setScore] = useState<"2-0" | "2-1" | "1-2" | "0-2">("2-0");

  const [msg, setMsg] = useState<string>("");
  const [sets, setSets] = useState<SetRow[]>([]);
  const [eloSeasonStart, setEloSeasonStart] = useState<string | null>(null);

  // Estados para Head-to-Head (H2H)
  const [h2hPlayer1, setH2hPlayer1] = useState<string>(PLAYERS[0]?.id ?? "");
  const [h2hPlayer2, setH2hPlayer2] = useState<string>(PLAYERS[1]?.id ?? "");

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

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sets));
    } catch {
      // ignore
    }
  }, [sets]);

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

  const idToPlayer = useMemo(() => {
    const m = new Map<string, Player>();
    for (const p of PLAYERS) m.set(p.id, p);
    return m;
  }, []);

  const selectedIds = useMemo(() => [a1, a2, b1, b2], [a1, a2, b1, b2]);

  const selectionError = useMemo(() => {
    if (selectedIds.some((x: string) => !x)) return "Faltan jugadores por seleccionar.";
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
      a1, a2, b1, b2, aGames, bGames,
      createdAt: new Date().toISOString(),
    };
    setSets((prev: SetRow[]) => [row, ...prev]);
    setMsg("Set guardado ✅");
    setTimeout(() => setMsg(""), 1200);
  }

  function undoLast() {
    setMsg("");
    setSets((prev: SetRow[]) => prev.slice(1));
  }

  function clearAll() {
    if (!confirm("¿Borrar todo el historial?")) return;
    setSets([]);
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

  const playerStats = useMemo(() => {
    const stats: Record<string, { id: string; tag: string; setsPlayed: number; setsWon: number; winRate: number }> =
      Object.fromEntries(PLAYERS.map((p: Player) => [p.id, { id: p.id, tag: p.tag, setsPlayed: 0, setsWon: 0, winRate: 0 }]));

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
          duo: `${idToPlayer.get(s.a1)?.tag ?? s.a1} + ${idToPlayer.get(s.a2)?.tag ?? s.a2}`,
          played: 0, won: 0, winRate: 0,
        };
      aObj.played += 1;
      if (aWon) aObj.won += 1;
      m.set(aKey, aObj);

      const bObj =
        m.get(bKey) ??
        {
          duo: `${idToPlayer.get(s.b1)?.tag ?? s.b1} + ${idToPlayer.get(s.b2)?.tag ?? s.b2}`,
          played: 0, won: 0, winRate: 0,
        };
      bObj.played += 1;
      if (!aWon) bObj.won += 1;
      m.set(bKey, bObj);
    }

    const arr = Array.from(m.values());
    for (const o of arr) o.winRate = o.played ? o.won / o.played : 0;

    return arr.sort((a, b) => b.winRate - a.winRate || b.played - a.played);
  }, [sets, idToPlayer]);

  // Head-to-Head
  const h2hStats = useMemo(() => {
    if (!h2hPlayer1 || !h2hPlayer2 || h2hPlayer1 === h2hPlayer2) {
      return { played: 0, p1Wins: 0, p2Wins: 0, together: 0, togetherWins: 0 };
    }

    let played = 0;
    let p1Wins = 0;
    let p2Wins = 0;
    let together = 0;
    let togetherWins = 0;

    for (const s of sets) {
      const teamA = [s.a1, s.a2];
      const teamB = [s.b1, s.b2];
      const aWon = s.aGames > s.bGames;

      const p1InA = teamA.includes(h2hPlayer1);
      const p1InB = teamB.includes(h2hPlayer1);
      const p2InA = teamA.includes(h2hPlayer2);
      const p2InB = teamB.includes(h2hPlayer2);

      if ((p1InA && p2InA) || (p1InB && p2InB)) {
        together++;
        const p1TeamWon = (p1InA && aWon) || (p1InB && !aWon);
        if (p1TeamWon) togetherWins++;
      } else if ((p1InA && p2InB) || (p1InB && p2InA)) {
        played++;
        const p1TeamWon = (p1InA && aWon) || (p1InB && !aWon);
        if (p1TeamWon) p1Wins++;
        else p2Wins++;
      }
    }

    return { played, p1Wins, p2Wins, together, togetherWins };
  }, [sets, h2hPlayer1, h2hPlayer2]);

  // Cálculo de Elo actual
  const eloMap = useMemo(() => {
    const elo: Record<string, number> = {};
    for (const p of PLAYERS) elo[p.id] = ELO_START;

    const seasonStartMs = eloSeasonStart ? new Date(eloSeasonStart).getTime() : null;
    const chronological = [...sets].sort(
      (x, y) => new Date(x.createdAt).getTime() - new Date(y.createdAt).getTime()
    );

    for (const s of chronological) {
      const t = new Date(s.createdAt).getTime();
      if (seasonStartMs !== null && t < seasonStartMs) continue;

      const aWon = s.aGames > s.bGames;
      const rA1 = elo[s.a1] ?? ELO_START;
      const rA2 = elo[s.a2] ?? ELO_START;
      const rB1 = elo[s.b1] ?? ELO_START;
      const rB2 = elo[s.b2] ?? ELO_START;

      const teamA = (rA1 + rA2) / 2;
      const teamB = (rB1 + rB2) / 2;

      const expA = expectedScore(teamA, teamB);
      const scoreA = aWon ? 1 : 0;

      const deltaA = ELO_K * (scoreA - expA);
      const share = deltaA / 2;

      elo[s.a1] = roundElo((elo[s.a1] ?? ELO_START) + share);
      elo[s.a2] = roundElo((elo[s.a2] ?? ELO_START) + share);
      elo[s.b1] = roundElo((elo[s.b1] ?? ELO_START) - share);
      elo[s.b2] = roundElo((elo[s.b2] ?? ELO_START) - share);
    }
    return elo;
  }, [sets, eloSeasonStart]);

  const eloRanking = useMemo(() => {
    return [...PLAYERS]
      .map((p: Player) => ({ id: p.id, tag: p.tag, avatar: p.avatar, elo: eloMap[p.id] ?? ELO_START }))
      .sort((a, b) => b.elo - a.elo);
  }, [eloMap]);

  // Tracker de cambios de Elo en el tiempo (historial de impacto de Elo por match)
  const eloTimeline = useMemo(() => {
    const elo: Record<string, number> = {};
    for (const p of PLAYERS) elo[p.id] = ELO_START;

    const seasonStartMs = eloSeasonStart ? new Date(eloSeasonStart).getTime() : null;
    const chronological = [...sets].sort(
      (x, y) => new Date(x.createdAt).getTime() - new Date(y.createdAt).getTime()
    );

    const logs = [];
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
      const share = roundElo(deltaA / 2);

      if (isSeason) {
        elo[s.a1] = roundElo(elo[s.a1] + share);
        elo[s.a2] = roundElo(elo[s.a2] + share);
        elo[s.b1] = roundElo(elo[s.b1] - share);
        elo[s.b2] = roundElo(elo[s.b2] - share);
      }

      logs.push({
        id: s.id,
        createdAt: s.createdAt,
        aNames: `${idToPlayer.get(s.a1)?.tag ?? s.a1} & ${idToPlayer.get(s.a2)?.tag ?? s.a2}`,
        bNames: `${idToPlayer.get(s.b1)?.tag ?? s.b1} & ${idToPlayer.get(s.b2)?.tag ?? s.b2}`,
        aWon,
        score: `${s.aGames}-${s.bGames}`,
        delta: share,
      });
    }

    return logs.reverse(); // Más recientes primero
  }, [sets, eloSeasonStart, idToPlayer]);

  const playerOptions = PLAYERS.map((p: Player) => (
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
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Taberna Smash 2026</h1>
            <p className="text-zinc-400">2v2 · Sets BO3 · Winrate + Elo + H2H + Tracker temporal</p>
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
          <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4 lg:col-span-1 space-y-4">
            <div>
              <h2 className="text-lg font-semibold mb-3">Registrar set</h2>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-zinc-400 mb-1">Team A</div>
                  <div className="grid grid-cols-2 gap-2">
                    <select value={a1} onChange={(e) => setA1(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2">
                      {playerOptions}
                    </select>
                    <select value={a2} onChange={(e) => setA2(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2">
                      {playerOptions}
                    </select>
                  </div>
                </div>

                <div>
                  <div className="text-sm text-zinc-400 mb-1">Team B</div>
                  <div className="grid grid-cols-2 gap-2">
                    <select value={b1} onChange={(e) => setB1(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2">
                      {playerOptions}
                    </select>
                    <select value={b2} onChange={(e) => setB2(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2">
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
              </div>
            </div>

            {/* HEAD-TO-HEAD */}
            <div className="border-t border-zinc-800 pt-4">
              <h3 className="text-md font-semibold mb-2">Head-to-Head (H2H)</h3>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <select value={h2hPlayer1} onChange={(e) => setH2hPlayer1(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-sm">
                    {playerOptions}
                  </select>
                  <select value={h2hPlayer2} onChange={(e) => setH2hPlayer2(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-sm">
                    {playerOptions}
                  </select>
                </div>
                {h2hPlayer1 === h2hPlayer2 ? (
                  <div className="text-xs text-zinc-500">Selecciona dos jugadores distintos.</div>
                ) : (
                  <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm space-y-1">
                    <div className="flex justify-between font-medium text-zinc-300">
                      <span>Enfrentados:</span>
                      <span>{h2hStats.played} sets</span>
                    </div>
                    <div className="flex justify-between text-xs text-zinc-400">
                      <span>{idToPlayer.get(h2hPlayer1)?.tag}: <b>{h2hStats.p1Wins}</b></span>
                      <span>{idToPlayer.get(h2hPlayer2)?.tag}: <b>{h2hStats.p2Wins}</b></span>
                    </div>
                    <div className="border-t border-zinc-800/80 pt-1 mt-1 flex justify-between text-xs text-zinc-400">
                      <span>Juntos en equipo:</span>
                      <span>{h2hStats.together} sets ({h2hStats.togetherWins} ganados)</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>

          <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4 lg:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* RANKING ELO */}
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

              {/* WINRATE POR JUGADOR */}
              <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-3">
                <h3 className="font-semibold mb-2">Winrate por jugador</h3>
                <div className="space-y-3">
                  {playerStats.map((p) => {
                    const fullPlayer = idToPlayer.get(p.id);
                    return (
                    <div key={p.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3 font-medium">
                        <img 
                          src={fullPlayer?.avatar} 
                          alt={p.tag} 
                          className="w-8 h-8 rounded-full object-cover border border-zinc-700 bg-zinc-800"
                        />
                        <span>{p.tag}</span>
                      </div>
                      <div className="text-sm text-zinc-300 tabular-nums">
                        {p.setsWon}/{p.setsPlayed} · {(p.winRate * 100).toFixed(0)}%
                      </div>
                    </div>
                  )})}
                </div>
              </div>

              {/* WINRATE POR DÚO */}
              <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-3 md:col-span-2">
                <h3 className="font-semibold mb-2">Winrate por dúo</h3>
                {teamStats.length === 0 ? (
                  <div className="text-sm text-zinc-500">Aún no hay dúos registrados.</div>
                ) : (
                  <div className="space-y-2">
                    {teamStats.map((d) => (
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

              {/* HISTORIAL COMPLETO DE PARTIDAS (CON SCROLL) */}
              <div className="md:col-span-2 rounded-xl bg-zinc-950 border border-zinc-800 p-3">
                <h3 className="font-semibold mb-2">Historial completo de partidas ({sets.length})</h3>
                {sets.length === 0 ? (
                  <div className="text-sm text-zinc-500">Aún no has guardado sets.</div>
                ) : (
                  <div className="max-h-64 overflow-y-auto divide-y divide-zinc-800 pr-2">
                    {sets.map((s: SetRow) => {
                      const aWon = s.aGames > s.bGames;
                      const aNames = `${idToPlayer.get(s.a1)?.tag ?? s.a1} + ${idToPlayer.get(s.a2)?.tag ?? s.a2}`;
                      const bNames = `${idToPlayer.get(s.b1)?.tag ?? s.b1} + ${idToPlayer.get(s.b2)?.tag ?? s.b2}`;
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

              {/* TRACKER TEMPORAL DE ELO */}
              <div className="md:col-span-2 rounded-xl bg-zinc-950 border border-zinc-800 p-3">
                <h3 className="font-semibold mb-2">Tracker de Elo en el tiempo (Impacto por partida)</h3>
                {eloTimeline.length === 0 ? (
                  <div className="text-sm text-zinc-500">Aún no hay suficiente historial para el tracker.</div>
                ) : (
                  <div className="max-h-64 overflow-y-auto divide-y divide-zinc-800 pr-2">
                    {eloTimeline.map((item) => (
                      <div key={item.id} className="py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-sm">
                        <div>
                          <span className={item.aWon ? "text-emerald-400 font-medium" : "text-zinc-400"}>{item.aNames}</span>
                          <span className="text-zinc-600 mx-2">vs</span>
                          <span className={!item.aWon ? "text-emerald-400 font-medium" : "text-zinc-400"}>{item.bNames}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-zinc-400 font-mono">[{item.score}]</span>
                          <span className="text-indigo-400 font-bold tabular-nums">±{item.delta} Elo</span>
                          <span className="text-zinc-500">{fmtDate(item.createdAt)}</span>
                        </div>
                      </div>
                    ))}
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