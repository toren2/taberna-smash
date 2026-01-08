"use client";

import React, { useEffect, useMemo, useState } from "react";

type Player = { id: string; tag: string };

type KD = { kills: number; deaths: number };

type SetRow = {
  id: string;
  a1: string;
  a2: string;
  b1: string;
  b2: string;
  aGames: number;
  bGames: number;
  createdAt: string; // ISO
  // NEW: K/D por jugador (por set completo)
  stats?: Record<string, KD>; // playerId -> {kills,deaths}
};

const STORAGE_KEY = "taberna_smash_sets_v1";
const ELO_SEASON_KEY = "taberna_smash_elo_season_start_v1";

// Elo config
const ELO_START = 1000;
const ELO_K = 32;

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

function expectedScore(rA: number, rB: number) {
  return 1 / (1 + Math.pow(10, (rB - rA) / 400));
}

function roundElo(n: number) {
  return Math.round(n);
}

function clampInt(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

function kdDefault(): KD {
  return { kills: 0, deaths: 0 };
}

export default function Page() {
  // selections
  const [a1, setA1] = useState(PLAYERS[0]?.id ?? "");
  const [a2, setA2] = useState(PLAYERS[1]?.id ?? "");
  const [b1, setB1] = useState(PLAYERS[2]?.id ?? "");
  const [b2, setB2] = useState(PLAYERS[3]?.id ?? "");
  const [score, setScore] = useState<"2-0" | "2-1" | "1-2" | "0-2">("2-0");

  // NEW: inputs de kills/deaths por jugador (para el set actual)
  const [kdInputs, setKdInputs] = useState<Record<string, KD>>({});

  const [msg, setMsg] = useState<string>("");
  const [sets, setSets] = useState<SetRow[]>([]);

  // Elo season start (if set, Elo is calculated only from sets >= this timestamp)
  const [eloSeasonStart, setEloSeasonStart] = useState<string | null>(null);

  const idToTag = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of PLAYERS) m.set(p.id, p.tag);
    return m;
  }, []);

  const selectedIds = useMemo(() => [a1, a2, b1, b2], [a1, a2, b1, b2]);

  // Mantener kdInputs siempre listo para los 4 seleccionados
  useEffect(() => {
    setKdInputs((prev) => {
      const next = { ...prev };
      for (const id of selectedIds) {
        if (!id) continue;
        if (!next[id]) next[id] = kdDefault();
        // normaliza por si venían cosas raras
        next[id] = { kills: clampInt(next[id].kills), deaths: clampInt(next[id].deaths) };
      }
      return next;
    });
  }, [selectedIds.join("|")]);

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

  function setKd(id: string, field: "kills" | "deaths", value: string) {
    const n = clampInt(Number(value));
    setKdInputs((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? kdDefault()), [field]: n },
    }));
  }

  function addSet() {
    if (selectionError) {
      setMsg(selectionError);
      return;
    }

    const { aGames, bGames } = parseScore(score);

    // Construye stats SOLO para los 4 del set
    const stats: Record<string, KD> = {};
    for (const id of selectedIds) {
      stats[id] = {
        kills: clampInt(kdInputs[id]?.kills ?? 0),
        deaths: clampInt(kdInputs[id]?.deaths ?? 0),
      };
    }

    const row: SetRow = {
      id: crypto.randomUUID(),
      a1,
      a2,
      b1,
      b2,
      aGames,
      bGames,
      createdAt: new Date().toISOString(),
      stats,
    };

    setSets((prev) => [row, ...prev]);
    setMsg("Set guardado ✅");
    setTimeout(() => setMsg(""), 1200);
  }

  function undoLast() {
    setMsg("");
    setSets((prev) => prev.slice(1));
  }

  function clearAll() {
    if (!confirm("¿Borrar todo el historial?")) return;
    setSets([]);
    setMsg("Historial borrado.");
    setTimeout(() => setMsg(""), 1200);
  }

  function resetEloSeason() {
    // No borra historial, solo reinicia Elo desde “ahora”
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

  // load sets from localStorage (con migración suave para stats)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as SetRow[];
      if (!Array.isArray(parsed)) return;

      const migrated = parsed.map((s) => {
        const ids = [s.a1, s.a2, s.b1, s.b2].filter(Boolean);
        const stats = { ...(s.stats ?? {}) } as Record<string, KD>;
        for (const id of ids) {
          const cur = stats[id] ?? kdDefault();
          stats[id] = { kills: clampInt(cur.kills), deaths: clampInt(cur.deaths) };
        }
        return { ...s, stats };
      });

      setSets(migrated);
    } catch {
      // ignore
    }
  }, []);

  // save sets to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sets));
    } catch {
      // ignore
    }
  }, [sets]);

  // load Elo season start
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

  // save Elo season start
  useEffect(() => {
    try {
      if (eloSeasonStart) localStorage.setItem(ELO_SEASON_KEY, JSON.stringify(eloSeasonStart));
      else localStorage.removeItem(ELO_SEASON_KEY);
    } catch {
      // ignore
    }
  }, [eloSeasonStart]);

  // Helper: obtener KD del set para un jugador
  function getKD(s: SetRow, id: string): KD {
    const kd = s.stats?.[id];
    if (!kd) return kdDefault();
    return { kills: clampInt(kd.kills), deaths: clampInt(kd.deaths) };
  }

  // Winrate + KD por jugador
  const playerStats = useMemo(() => {
    const stats: Record<
      string,
      {
        tag: string;
        setsPlayed: number;
        setsWon: number;
        winRate: number;
        kills: number;
        deaths: number;
        diff: number;
      }
    > = Object.fromEntries(
      PLAYERS.map((p) => [
        p.id,
        { tag: p.tag, setsPlayed: 0, setsWon: 0, winRate: 0, kills: 0, deaths: 0, diff: 0 },
      ])
    );

    for (const s of sets) {
      const aWon = s.aGames > s.bGames;

      for (const id of [s.a1, s.a2]) {
        if (!stats[id]) continue;
        stats[id].setsPlayed += 1;
        if (aWon) stats[id].setsWon += 1;

        const kd = getKD(s, id);
        stats[id].kills += kd.kills;
        stats[id].deaths += kd.deaths;
      }
      for (const id of [s.b1, s.b2]) {
        if (!stats[id]) continue;
        stats[id].setsPlayed += 1;
        if (!aWon) stats[id].setsWon += 1;

        const kd = getKD(s, id);
        stats[id].kills += kd.kills;
        stats[id].deaths += kd.deaths;
      }
    }

    for (const id of Object.keys(stats)) {
      const x = stats[id];
      x.winRate = x.setsPlayed ? x.setsWon / x.setsPlayed : 0;
      x.diff = x.kills - x.deaths;
    }

    // Orden: winrate desc, diff desc, setsPlayed desc
    return Object.values(stats).sort(
      (a, b) => b.winRate - a.winRate || b.diff - a.diff || b.setsPlayed - a.setsPlayed
    );
  }, [sets]);

  // Winrate por dúo
  const teamStats = useMemo(() => {
    type DuoKey = string; // "a|b" sorted
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

  // Elo computed from (filtered) history — robust (undo works automatically)
  const eloMap = useMemo(() => {
    const elo: Record<string, number> = {};
    for (const p of PLAYERS) elo[p.id] = ELO_START;

    const seasonStartMs = eloSeasonStart ? new Date(eloSeasonStart).getTime() : null;

    // Apply in chronological order (oldest -> newest)
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
      .map((p) => ({ id: p.id, tag: p.tag, elo: eloMap[p.id] ?? ELO_START }))
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
            <p className="text-zinc-400">2v2 · Sets BO3 · Winrate + Elo por jugador</p>
            <p className="text-xs text-zinc-500 mt-1">{eloSeasonLabel} · K={ELO_K} · base {ELO_START}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={undoLast}
              className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm disabled:opacity-40"
              disabled={sets.length === 0}
              title="Deshacer último set"
            >
              Undo
            </button>
            <button
              onClick={resetEloSeason}
              className="px-3 py-2 rounded-lg bg-indigo-900/60 hover:bg-indigo-900 text-sm"
              title="Iniciar nueva temporada Elo desde ahora"
            >
              Reset Elo (Temporada)
            </button>
            <button
              onClick={resetEloSeasonToAllTime}
              className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm"
              title="Volver a calcular Elo con todo el historial"
            >
              Elo: Todo
            </button>
            <button
              onClick={clearAll}
              className="px-3 py-2 rounded-lg bg-red-900/60 hover:bg-red-900 text-sm disabled:opacity-40"
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

              {/* NEW: Kills/Deaths */}
              <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-3">
                <div className="text-sm font-semibold mb-2">Kills / Deaths (por set)</div>

                <div className="space-y-2">
                  {selectedIds.map((id) => {
                    const tag = idToTag.get(id) ?? id;
                    const kd = kdInputs[id] ?? kdDefault();
                    const diff = (kd.kills ?? 0) - (kd.deaths ?? 0);
                    const diffLabel = diff >= 0 ? `+${diff}` : `${diff}`;

                    return (
                      <div
                        key={id}
                        className="grid grid-cols-12 gap-2 items-center"
                      >
                        <div className="col-span-5 text-sm font-medium truncate">
                          {tag} <span className="text-xs text-zinc-500">({diffLabel})</span>
                        </div>

                        <div className="col-span-3">
                          <input
                            type="number"
                            min={0}
                            value={kd.kills}
                            onChange={(e) => setKd(id, "kills", e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-sm"
                            placeholder="Kills"
                          />
                        </div>

                        <div className="col-span-3">
                          <input
                            type="number"
                            min={0}
                            value={kd.deaths}
                            onChange={(e) => setKd(id, "deaths", e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-sm"
                            placeholder="Deaths"
                          />
                        </div>

                        <div className="col-span-1 text-xs text-zinc-500 text-right">K/D</div>
                      </div>
                    );
                  })}
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

          {/* Stats */}
          <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4 lg:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Elo */}
              <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-3">
                <h3 className="font-semibold mb-2">Ranking Elo (jugadores)</h3>
                <div className="space-y-2">
                  {eloRanking.map((p, idx) => (
                    <div key={p.id} className="flex items-center justify-between">
                      <div className="font-medium">
                        #{idx + 1} {p.tag}
                      </div>
                      <div className="text-sm text-zinc-300 tabular-nums">{p.elo}</div>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-zinc-500 mt-2">{eloSeasonLabel}</div>
              </div>

              {/* Winrate players + KD */}
              <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-3">
                <h3 className="font-semibold mb-2">Winrate + K/D por jugador</h3>
                <div className="space-y-2">
                  {playerStats.map((p) => {
                    const diffLabel = p.diff >= 0 ? `+${p.diff}` : `${p.diff}`;
                    return (
                      <div key={p.tag} className="flex items-center justify-between gap-3">
                        <div className="font-medium">{p.tag}</div>
                        <div className="text-sm text-zinc-300 tabular-nums text-right">
                          {p.setsWon}/{p.setsPlayed} · {(p.winRate * 100).toFixed(0)}%{" "}
                          <span className="text-zinc-500">·</span>{" "}
                          <span className="text-zinc-200">
                            {p.kills}/{p.deaths} ({diffLabel})
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="text-xs text-zinc-500 mt-2">
                  K/D y diferencial son acumulados (por set completo).
                </div>
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
                    {teamStats.length > 12 && (
                      <div className="text-xs text-zinc-500">Mostrando top 12 (hay {teamStats.length} dúos).</div>
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
                    {sets.slice(0, 30).map((s) => {
                      const aWon = s.aGames > s.bGames;
                      const aNames = `${idToTag.get(s.a1) ?? s.a1} + ${idToTag.get(s.a2) ?? s.a2}`;
                      const bNames = `${idToTag.get(s.b1) ?? s.b1} + ${idToTag.get(s.b2) ?? s.b2}`;

                      // resumen de diff por jugador
                      const ids = [s.a1, s.a2, s.b1, s.b2];
                      const diffParts = ids.map((id) => {
                        const kd = getKD(s, id);
                        const d = kd.kills - kd.deaths;
                        const dLabel = d >= 0 ? `+${d}` : `${d}`;
                        return `${idToTag.get(id) ?? id}:${dLabel}`;
                      });

                      return (
                        <div key={s.id} className="py-2 flex flex-col gap-1">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
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
                              <span className="font-semibold text-zinc-200">{s.aGames}-{s.bGames}</span>
                              <span>{fmtDate(s.createdAt)}</span>
                            </div>
                          </div>

                          <div className="text-xs text-zinc-500">
                            Diffs: {diffParts.join(" · ")}
                          </div>
                        </div>
                      );
                    })}
                    {sets.length > 30 && (
                      <div className="pt-2 text-xs text-zinc-500">Mostrando últimos 30 (hay {sets.length} sets).</div>
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
