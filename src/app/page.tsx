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
  <main className="min-h-screen bg-zinc-950 text-zinc-100 p-4">
    <div className="max-w-4xl mx-auto space-y-6">

      <header className="text-center">
        <h1 className="text-3xl font-bold">Taberna Smash 2026</h1>
        <p className="text-zinc-400 mt-1">
          Registro de sets y estadísticas
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-zinc-900 rounded-xl p-4">
          <h2 className="font-semibold mb-2">Registrar Set</h2>
          <p className="text-sm text-zinc-400">
            Selecciona equipos y resultado
          </p>
        </div>

        <div className="bg-zinc-900 rounded-xl p-4">
          <h2 className="font-semibold mb-2">Ranking</h2>
          <p className="text-sm text-zinc-400">
            Winrate por jugador
          </p>
        </div>
      </section>

      <footer className="text-center text-xs text-zinc-500">
        Taberna Smash · Hecho para el grupo
      </footer>
    </div>
  </main>
);
