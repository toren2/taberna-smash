import { Player, SetRow } from "./types";
import { ELO_START, applySetToElo } from "./elo";

export type WeekKey = string; // "YYYY-MM-DD" del lunes de esa semana (hora local)

function startOfWeek(d: Date): Date {
  const day = d.getDay(); // 0=domingo ... 6=sábado
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function keyOf(d: Date): WeekKey {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function weekKeyOf(iso: string): WeekKey {
  return keyOf(startOfWeek(new Date(iso)));
}

/** Semanas con al menos un set registrado, más recientes primero. Cada key es el lunes de esa semana. */
export function listWeekKeys(sets: SetRow[]): WeekKey[] {
  const keys = new Set<string>();
  for (const s of sets) keys.add(weekKeyOf(s.created_at));
  return Array.from(keys).sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
}

export function fmtWeekRange(key: WeekKey) {
  const [y, m, d] = key.split("-").map(Number);
  const monday = new Date(y, m - 1, d);
  const sunday = new Date(y, m - 1, d + 6);
  const fmt = (dt: Date) => dt.toLocaleDateString("es", { day: "numeric", month: "short" });
  return `${fmt(monday)} – ${fmt(sunday)}`;
}

export type WeekPlayerStat = {
  id: string;
  tag: string;
  setsPlayed: number;
  setsWon: number;
  winRate: number;
  kills: number;
  deaths: number;
  diff: number;
  eloStart: number;
  eloEnd: number;
  eloDelta: number;
  topCharacter: string | null;
};

export type WeekSummary = {
  week: WeekKey;
  setsCount: number;
  players: WeekPlayerStat[];
  mvp: WeekPlayerStat | null;
};

/** Resumen de una semana (lunes a domingo): winrate, K/D y Elo ganado/perdido por jugador, más MVP. */
export function computeWeekSummary(
  players: Player[],
  allSets: SetRow[],
  seasonStart: string | null,
  week: WeekKey
): WeekSummary {
  const chrono = [...allSets].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  const seasonStartMs = seasonStart ? new Date(seasonStart).getTime() : null;

  const elo: Record<string, number> = {};
  for (const p of players) elo[p.id] = ELO_START;

  const eloAtStart: Record<string, number> = {};
  let started = false;

  const weekSets: SetRow[] = [];

  for (const s of chrono) {
    const t = new Date(s.created_at).getTime();
    const inSeason = seasonStartMs === null || t >= seasonStartMs;
    const key = weekKeyOf(s.created_at);

    if (key === week && !started) {
      for (const p of players) eloAtStart[p.id] = elo[p.id] ?? ELO_START;
      started = true;
    }

    if (key === week) weekSets.push(s);

    if (inSeason) applySetToElo(elo, s);
  }

  if (!started) {
    for (const p of players) eloAtStart[p.id] = elo[p.id] ?? ELO_START;
  }

  const statsMap: Record<
    string,
    { setsPlayed: number; setsWon: number; kills: number; deaths: number; chars: Record<string, number> }
  > = {};
  for (const p of players) statsMap[p.id] = { setsPlayed: 0, setsWon: 0, kills: 0, deaths: 0, chars: {} };

  for (const s of weekSets) {
    const aWon = s.a_games > s.b_games;
    for (const id of [s.a1, s.a2, s.b1, s.b2]) {
      if (!statsMap[id]) continue;
      const onTeamA = id === s.a1 || id === s.a2;
      const won = onTeamA ? aWon : !aWon;
      statsMap[id].setsPlayed += 1;
      if (won) statsMap[id].setsWon += 1;
      const kd = s.stats?.[id];
      if (kd) {
        statsMap[id].kills += kd.kills ?? 0;
        statsMap[id].deaths += kd.deaths ?? 0;
        if (kd.character) {
          statsMap[id].chars[kd.character] = (statsMap[id].chars[kd.character] ?? 0) + 1;
        }
      }
    }
  }

  const playerStats: WeekPlayerStat[] = players
    .map((p) => {
      const st = statsMap[p.id];
      const eloStart = eloAtStart[p.id] ?? ELO_START;
      const eloEnd = elo[p.id] ?? ELO_START;

      let topCharacter: string | null = null;
      let topCount = 0;
      for (const [c, n] of Object.entries(st.chars)) {
        if (n > topCount) {
          topCount = n;
          topCharacter = c;
        }
      }

      return {
        id: p.id,
        tag: p.tag,
        setsPlayed: st.setsPlayed,
        setsWon: st.setsWon,
        winRate: st.setsPlayed ? st.setsWon / st.setsPlayed : 0,
        kills: st.kills,
        deaths: st.deaths,
        diff: st.kills - st.deaths,
        eloStart,
        eloEnd,
        eloDelta: eloEnd - eloStart,
        topCharacter,
      };
    })
    .filter((p) => p.setsPlayed > 0)
    .sort((a, b) => b.eloDelta - a.eloDelta || b.winRate - a.winRate || b.diff - a.diff);

  return {
    week,
    setsCount: weekSets.length,
    players: playerStats,
    mvp: playerStats[0] ?? null,
  };
}
