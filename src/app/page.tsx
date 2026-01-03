"use client";

import { useMemo, useState } from "react";

type Player = { id: string; tag: string };
type SetRow = {
  id: string;
  a1: string;
  a2: string;
  b1: string;
  b2: string;
  aGames: number;
  bGames: number;
  createdAt: string;
};

const PLAYERS: Player[] = [
  { id: "p1", tag: "Meliodas" },
  { id: "p2", tag: "Zenaku" },
  { id: "p3", tag: "Viola" },
  { id: "p4", tag: "Mono" },
  { id: "p5", tag: "Pampara" },
  { id: "p6", tag: "Chapfra" },
];

function pct(x: number) {
  return `${Math.round(x * 1000) / 10}%`;
}

// id simple (evita issues con crypto)
function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function Page() {
  const [a1, setA1] = useState("");
  const [a2, setA2] = useState("");
  const [b1, setB1] = useState("");
  const [b2, setB2] = useState("");
  const [minSets, setMinSets] = useState(3);

  const [sets, setSets] = useState<SetRow[]>([]);
  const [msg, setMsg] = useState("");

  const tagById = useMemo(() => new Map(PLAYERS.map((p) => [p.id, p.tag])), []);

  const allSelected = a1 && a2 && b1 && b2;

  function validateUnique() {
    const ids = [a1, a2, b1, b2].filter(Boolean);
    return new Set(ids).size === ids.length;
  }

  function addSet(aGames: number, bGames: number) {
    setMsg("");
    if (!allSelected) return setMsg("Selecciona los 4 jugadores.");
    if (!validateUnique()) return setMsg("No puedes repetir el mismo jugador.");

    const validBO3 =
      (aGames === 2 && (bGames === 0 || bGames === 1)) ||
      (bGames === 2 && (aGames === 0 || aGames === 1));

    if (!validBO3) return setMsg("Score BO3 inválido.");

    const row: SetRow = {
      id: makeId(),
      a1,
      a2,
      b1,
      b2,
      aGames,
      bGames,
      createdAt: new Date().toISOString(),
    };

    setSets((prev) => [row, ...prev]);
  }

  function undoLast() {
    setMsg("");
    setSets((prev) => prev.slice(1));
  }

  const playerStats = useMemo(() => {
    const agg = new Map<string, { wins: number; losses: number }>();

    function addWL(pid: string, w: number, l: number) {
      const cur = agg.get(pid) ?? { wins: 0, losses: 0 };
      cur.wins += w;
      cur.losses += l;
      agg.set(pid, cur);
    }

    for (const s of sets) {
      const aWin = s.aGames > s.bGames;
      for (const pid of [s.a1, s.a2]) addWL(pid, aWin ? 1 : 0, aWin ? 0 : 1);
      for (const pid of [s.b1, s.b2]) addWL(pid, aWin ? 0 : 1, aWin ? 1 : 0);
    }

    const rows = [...agg.entries()].map(([id, v]) => {
      const total = v.wins + v.losses;
      return {
        id,
        tag: tagById.get(id) ?? id,
        wins: v.wins,
        losses: v.losses,
        total,
        winrate: total ? v.wins / total : 0,
      };
    });

    return rows
      .filter((r) => r.total >= minSets)
      .sort((a, b) => b.winrate - a.winrate || b.total - a.total);
  }, [sets, minSets, tagById]);

  const teamStats = useMemo(() => {
    const agg = new Map<string, { wins: number; losses: number }>();
    const teamKey = (x: string, y: string) => [x, y].sort().join("+");

    function addWL(key: string, w: number, l: number) {
      const cur = agg.get(key) ?? { wins: 0, losses: 0 };
      cur.wins += w;
      cur.losses += l;
      agg.set(key, cur);
    }

    for (const s of sets) {
      const aWin = s.aGames > s.bGames;
      addWL(teamKey(s.a1, s.a2), aWin ? 1 : 0, aWin ? 0 : 1);
      addWL(teamKey(s.b1, s.b2), aWin ? 0 : 1, aWin ? 1 : 0);
    }

    const rows = [...agg.entries()].map(([key, v]) => {
      const [p1, p2] = key.split("+");
      const name = `${tagById.get(p1) ?? "?"}+${tagById.get(p2) ?? "?"}`;
      const total = v.wins + v.losses;
      return {
        key,
        name,
        wins: v.wins,
        losses: v.losses,
        total,
        winrate: total ? v.wins / total : 0,
      };
    });

    return rows
      .filter((r) => r.total >= minSets)
      .sort((a, b) => b.winrate - a.winrate || b.total - a.total);
  }, [sets, minSets, tagById]);

  const Select = ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (v: string) => void;
  }) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border px-3 py-2"
    >
      <option value="">—</option>
      {PLAYERS.map((p) => (
        <option key={p.id} value={p.id}>
          {p.tag}
        </option>
      ))}
    </select>
  );

  return (
    <main className="mx-auto max-w-3xl p-4 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Taberna Smash 2026</h1>
        <p className="text-sm opacity-70">
          Registrar sets BO3 (2v2) + winrate por jugador y por dúo
        </p>
      </header>

      {msg && <div className="rounded-xl border p-3 text-sm">{msg}</div>}

      <section className="rounded-2xl border p-4 space-y-4">
        <h2 className="text-xl font-semibold">Registrar set (BO3)</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border p-3 space-y-2">
            <div className="font-semibold">Team A</div>
            <Select value={a1} onChange={setA1} />
            <Select value={a2} onChange={setA2} />
          </div>

          <div className="rounded-xl border p-3 space-y-2">
            <div className="font-semibold">Team B</div>
            <Select value={b1} onChange={setB1} />
            <Select value={b2} onChange={setB2} />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button className="rounded-xl border px-3 py-3 font-bold" disabled={!allSelected} onClick={() => addSet(2, 0)}>
            A 2–0
          </button>
          <button className="rounded-xl border px-3 py-3 font-bold" disabled={!allSelected} onClick={() => addSet(2, 1)}>
            A 2–1
          </button>
          <button className="rounded-xl border px-3 py-3 font-bold" disabled={!allSelected} onClick={() => addSet(1, 2)}>
            B 2–1
          </button>
          <button className="rounded-xl border px-3 py-3 font-bold" disabled={!allSelected} onClick={() => addSet(0, 2)}>
            B 2–0
          </button>
        </div>

        <div className="flex items-center justify-between gap-3">
          <button className="rounded-xl border px-4 py-2 font-semibold" onClick={undoLast}>
            Deshacer último
          </button>

          <div className="flex items-center gap-2 text-sm">
            <span className="opacity-70">Min sets</span>
            <input
              type="number"
              min={1}
              max={99}
              value={minSets}
              onChange={(e) => setMinSets(Number(e.target.value))}
              className="w-20 rounded-xl border px-2 py-1"
            />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border p-4">
          <h3 className="text-lg font-semibold mb-3">Top jugadores</h3>
          {playerStats.length === 0 ? (
            <div className="text-sm opacity-70">Sin datos (o no cumplen min sets).</div>
          ) : (
            <div className="space-y-2">
              {playerStats.map((r, i) => (
                <div key={r.id} className="flex items-center justify-between rounded-xl border px-3 py-2">
                  <div className="font-semibold">#{i + 1} {r.tag}</div>
                  <div className="text-sm">{r.wins}-{r.losses} · {pct(r.winrate)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border p-4">
          <h3 className="text-lg font-semibold mb-3">Top teams (dúos)</h3>
          {teamStats.length === 0 ? (
            <div className="text-sm opacity-70">Sin datos (o no cumplen min sets).</div>
          ) : (
            <div className="space-y-2">
              {teamStats.map((r, i) => (
                <div key={r.key} className="flex items-center justify-between rounded-xl border px-3 py-2">
                  <div className="font-semibold">#{i + 1} {r.name}</div>
                  <div className="text-sm">{r.wins}-{r.losses} · {pct(r.winrate)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border p-4">
        <h3 className="text-lg font-semibold mb-3">Historial</h3>
        {sets.length === 0 ? (
          <div className="text-sm opacity-70">Aún no hay sets registrados.</div>
        ) : (
          <div className="space-y-2">
            {sets.slice(0, 15).map((s) => {
              const a = `${tagById.get(s.a1)}+${tagById.get(s.a2)}`;
              const b = `${tagById.get(s.b1)}+${tagById.get(s.b2)}`;
              return (
                <div key={s.id} className="rounded-xl border px-3 py-2 text-sm flex items-center justify-between">
                  <div>{a} <span className="opacity-60">vs</span> {b}</div>
                  <div className="font-semibold">{s.aGames}-{s.bGames}</div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
