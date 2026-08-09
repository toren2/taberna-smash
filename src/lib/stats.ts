import { Player, SetRow } from "./types";

export type MatchupInfo = { id: string; tag: string; winRate: number; played: number; won: number };
export type H2HCell = {
  asOpponent: { played: number; won: number };
  asTeammate: { played: number; won: number };
};
export type CharacterStat = {
  character: string;
  played: number;
  won: number;
  winRate: number;
  kills: number;
  deaths: number;
  killsPerSet: number;
  deathsPerSet: number;
};

export type PlayerFullStats = {
  id: string;
  tag: string;
  setsPlayed: number;
  setsWon: number;
  winRate: number;
  kills: number;
  deaths: number;
  diff: number;
  killsPerSet: number;
  deathsPerSet: number;
  currentStreak: { result: "W" | "L" | null; count: number };
  bestWinStreak: number;
  last5: ("W" | "L")[];
  bestRival: MatchupInfo | null;
  worstRival: MatchupInfo | null;
  bestDuo: MatchupInfo | null;
  worstDuo: MatchupInfo | null;
  headToHead: Record<string, H2HCell>;
  favoriteCharacter: CharacterStat | null;
  bestCharacter: CharacterStat | null;
  characterStats: CharacterStat[];
};

const MIN_GAMES_FOR_MATCHUP = 2;

function chronological(sets: SetRow[]) {
  return [...sets].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

export function computePlayerFullStats(
  players: Player[],
  sets: SetRow[]
): Record<string, PlayerFullStats> {
  const idToTag = new Map(players.map((p) => [p.id, p.tag]));
  const chrono = chronological(sets);

  const result: Record<string, PlayerFullStats> = {};

  for (const p of players) {
    const pid = p.id;

    let setsPlayed = 0;
    let setsWon = 0;
    let kills = 0;
    let deaths = 0;

    const rivalStats = new Map<string, { played: number; won: number }>();
    const duoStats = new Map<string, { played: number; won: number }>();
    const headToHead = new Map<string, H2HCell>();
    const charStats = new Map<string, { played: number; won: number; kills: number; deaths: number }>();

    const resultsInOrder: ("W" | "L")[] = [];

    for (const s of chrono) {
      const involved = [s.a1, s.a2, s.b1, s.b2];
      if (!involved.includes(pid)) continue;

      const onTeamA = s.a1 === pid || s.a2 === pid;
      const partnerId = onTeamA ? (s.a1 === pid ? s.a2 : s.a1) : (s.b1 === pid ? s.b2 : s.b1);
      const opponentIds = onTeamA ? [s.b1, s.b2] : [s.a1, s.a2];
      const aWon = s.a_games > s.b_games;
      const won = onTeamA ? aWon : !aWon;

      setsPlayed += 1;
      if (won) setsWon += 1;
      resultsInOrder.push(won ? "W" : "L");

      const kd = s.stats?.[pid] ?? { kills: 0, deaths: 0 };
      kills += kd.kills ?? 0;
      deaths += kd.deaths ?? 0;

      if (kd.character) {
        const cs = charStats.get(kd.character) ?? { played: 0, won: 0, kills: 0, deaths: 0 };
        cs.played += 1;
        if (won) cs.won += 1;
        cs.kills += kd.kills ?? 0;
        cs.deaths += kd.deaths ?? 0;
        charStats.set(kd.character, cs);
      }

      // duo (partner)
      const duo = duoStats.get(partnerId) ?? { played: 0, won: 0 };
      duo.played += 1;
      if (won) duo.won += 1;
      duoStats.set(partnerId, duo);

      // rivals (opponents)
      for (const oppId of opponentIds) {
        const riv = rivalStats.get(oppId) ?? { played: 0, won: 0 };
        riv.played += 1;
        if (won) riv.won += 1;
        rivalStats.set(oppId, riv);
      }

      // head-to-head vs every other player involved
      for (const otherId of involved) {
        if (otherId === pid) continue;
        const cell = headToHead.get(otherId) ?? {
          asOpponent: { played: 0, won: 0 },
          asTeammate: { played: 0, won: 0 },
        };
        if (otherId === partnerId) {
          cell.asTeammate.played += 1;
          if (won) cell.asTeammate.won += 1;
        } else {
          cell.asOpponent.played += 1;
          if (won) cell.asOpponent.won += 1;
        }
        headToHead.set(otherId, cell);
      }
    }

    // streaks
    let bestWinStreak = 0;
    let running = 0;
    for (const r of resultsInOrder) {
      if (r === "W") {
        running += 1;
        bestWinStreak = Math.max(bestWinStreak, running);
      } else {
        running = 0;
      }
    }

    let currentStreak: { result: "W" | "L" | null; count: number } = { result: null, count: 0 };
    for (let i = resultsInOrder.length - 1; i >= 0; i--) {
      const r = resultsInOrder[i];
      if (currentStreak.result === null) {
        currentStreak = { result: r, count: 1 };
      } else if (r === currentStreak.result) {
        currentStreak.count += 1;
      } else {
        break;
      }
    }

    const last5 = resultsInOrder.slice(-5);

    function toMatchupList(map: Map<string, { played: number; won: number }>): MatchupInfo[] {
      return Array.from(map.entries())
        .filter(([, v]) => v.played >= MIN_GAMES_FOR_MATCHUP)
        .map(([id, v]) => ({
          id,
          tag: idToTag.get(id) ?? id,
          played: v.played,
          won: v.won,
          winRate: v.played ? v.won / v.played : 0,
        }));
    }

    const rivalList = toMatchupList(rivalStats).sort((a, b) => b.winRate - a.winRate || b.played - a.played);
    const duoList = toMatchupList(duoStats).sort((a, b) => b.winRate - a.winRate || b.played - a.played);

    const charList: CharacterStat[] = Array.from(charStats.entries())
      .map(([character, v]) => ({
        character,
        played: v.played,
        won: v.won,
        winRate: v.played ? v.won / v.played : 0,
        kills: v.kills,
        deaths: v.deaths,
        killsPerSet: v.played ? v.kills / v.played : 0,
        deathsPerSet: v.played ? v.deaths / v.played : 0,
      }))
      .sort((a, b) => b.played - a.played);
    const favoriteCharacter = charList[0] ?? null;
    const bestCharacter =
      [...charList]
        .filter((c) => c.played >= MIN_GAMES_FOR_MATCHUP)
        .sort((a, b) => b.winRate - a.winRate || b.played - a.played)[0] ?? null;

    const h2hObj: Record<string, H2HCell> = {};
    for (const [id, cell] of headToHead.entries()) h2hObj[id] = cell;

    result[pid] = {
      id: pid,
      tag: p.tag,
      setsPlayed,
      setsWon,
      winRate: setsPlayed ? setsWon / setsPlayed : 0,
      kills,
      deaths,
      diff: kills - deaths,
      killsPerSet: setsPlayed ? kills / setsPlayed : 0,
      deathsPerSet: setsPlayed ? deaths / setsPlayed : 0,
      currentStreak,
      bestWinStreak,
      last5,
      bestRival: rivalList[0] ?? null,
      worstRival: rivalList[rivalList.length - 1] ?? null,
      bestDuo: duoList[0] ?? null,
      worstDuo: duoList[duoList.length - 1] ?? null,
      headToHead: h2hObj,
      favoriteCharacter,
      bestCharacter,
      characterStats: charList,
    };
  }

  return result;
}

export type H2HMatrixCell = { played: number; won: number; winRate: number };

/** Matriz global: matrix[a][b] = stats de "a" jugando CONTRA "b" (como rivales). */
export function computeH2HMatrix(
  players: Player[],
  sets: SetRow[]
): Record<string, Record<string, H2HMatrixCell>> {
  const matrix: Record<string, Record<string, H2HMatrixCell>> = {};
  for (const p of players) matrix[p.id] = {};

  for (const s of sets) {
    const aWon = s.a_games > s.b_games;
    const teamA = [s.a1, s.a2];
    const teamB = [s.b1, s.b2];

    for (const a of teamA) {
      for (const b of teamB) {
        if (!matrix[a]) matrix[a] = {};
        const cell = matrix[a][b] ?? { played: 0, won: 0, winRate: 0 };
        cell.played += 1;
        if (aWon) cell.won += 1;
        matrix[a][b] = cell;

        if (!matrix[b]) matrix[b] = {};
        const cellB = matrix[b][a] ?? { played: 0, won: 0, winRate: 0 };
        cellB.played += 1;
        if (!aWon) cellB.won += 1;
        matrix[b][a] = cellB;
      }
    }
  }

  for (const a of Object.keys(matrix)) {
    for (const b of Object.keys(matrix[a])) {
      const c = matrix[a][b];
      c.winRate = c.played ? c.won / c.played : 0;
    }
  }

  return matrix;
}

export type Badge = { id: string; icon: string; label: string; playerIds: string[] };

export function computeBadges(
  players: Player[],
  playerStats: Record<string, PlayerFullStats>,
  eloRanking: { id: string; elo: number }[]
): Badge[] {
  const badges: Badge[] = [];
  const withSets = players.filter((p) => (playerStats[p.id]?.setsPlayed ?? 0) > 0);
  if (withSets.length === 0) return badges;

  if (eloRanking.length > 0 && (playerStats[eloRanking[0].id]?.setsPlayed ?? 0) > 0) {
    badges.push({ id: "elo-king", icon: "👑", label: "Rey del Elo", playerIds: [eloRanking[0].id] });
  }

  const onFire = withSets.filter((p) => (playerStats[p.id]?.currentStreak.result === "W" ? playerStats[p.id].currentStreak.count : 0) >= 3);
  if (onFire.length > 0) {
    badges.push({ id: "on-fire", icon: "🔥", label: "En racha", playerIds: onFire.map((p) => p.id) });
  }

  const topKills = [...withSets].sort((a, b) => (playerStats[b.id]?.kills ?? 0) - (playerStats[a.id]?.kills ?? 0))[0];
  if (topKills && (playerStats[topKills.id]?.kills ?? 0) > 0) {
    badges.push({ id: "top-kills", icon: "🗡️", label: "Más kills", playerIds: [topKills.id] });
  }

  const eligibleWall = withSets.filter((p) => (playerStats[p.id]?.setsPlayed ?? 0) >= 3);
  if (eligibleWall.length > 0) {
    const bestWall = [...eligibleWall].sort((a, b) => (playerStats[a.id]?.deathsPerSet ?? 0) - (playerStats[b.id]?.deathsPerSet ?? 0))[0];
    badges.push({ id: "wall", icon: "🛡️", label: "Muralla (menos muertes/set)", playerIds: [bestWall.id] });
  }

  const mostPlayed = [...withSets].sort((a, b) => (playerStats[b.id]?.setsPlayed ?? 0) - (playerStats[a.id]?.setsPlayed ?? 0))[0];
  if (mostPlayed) {
    badges.push({ id: "veteran", icon: "🎮", label: "Más partidas", playerIds: [mostPlayed.id] });
  }

  // mejor dúo global (par con mejor winrate, min 2 partidos juntos)
  let bestDuoPair: { ids: [string, string]; winRate: number; played: number } | null = null;
  for (const p of withSets) {
    const duo = playerStats[p.id]?.bestDuo;
    if (!duo) continue;
    if (!bestDuoPair || duo.winRate > bestDuoPair.winRate || (duo.winRate === bestDuoPair.winRate && duo.played > bestDuoPair.played)) {
      bestDuoPair = { ids: [p.id, duo.id], winRate: duo.winRate, played: duo.played };
    }
  }
  if (bestDuoPair) {
    badges.push({ id: "golden-duo", icon: "🤝", label: "Dúo dorado", playerIds: bestDuoPair.ids });
  }

  return badges;
}
