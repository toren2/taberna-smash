import { SetRow } from "./types";

export const ELO_START = 1000;
export const ELO_K = 32;

export function expectedScore(rA: number, rB: number) {
  return 1 / (1 + Math.pow(10, (rB - rA) / 400));
}

export function roundElo(n: number) {
  return Math.round(n);
}

/** Calcula el Elo final de cada jugador tras aplicar los sets en orden cronológico. */
export function computeEloMap(
  playerIds: string[],
  sets: SetRow[],
  seasonStart: string | null
) {
  const elo: Record<string, number> = {};
  for (const id of playerIds) elo[id] = ELO_START;

  const seasonStartMs = seasonStart ? new Date(seasonStart).getTime() : null;
  const chronological = [...sets].sort(
    (x, y) => new Date(x.created_at).getTime() - new Date(y.created_at).getTime()
  );

  for (const s of chronological) {
    const t = new Date(s.created_at).getTime();
    if (seasonStartMs !== null && t < seasonStartMs) continue;
    applySetToElo(elo, s);
  }

  return elo;
}

function applySetToElo(elo: Record<string, number>, s: SetRow) {
  const aWon = s.a_games > s.b_games;

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

export type EloPoint = { index: number; date: string } & Record<string, number | string>;

/** Serie temporal de Elo (uno por set) para graficar la evolución de cada jugador. */
export function computeEloHistory(
  playerIds: string[],
  playerTags: Record<string, string>,
  sets: SetRow[],
  seasonStart: string | null
): EloPoint[] {
  const elo: Record<string, number> = {};
  for (const id of playerIds) elo[id] = ELO_START;

  const seasonStartMs = seasonStart ? new Date(seasonStart).getTime() : null;
  const chronological = [...sets].sort(
    (x, y) => new Date(x.created_at).getTime() - new Date(y.created_at).getTime()
  );

  const points: EloPoint[] = [];
  let idx = 0;

  const startPoint: EloPoint = { index: 0, date: "Inicio" };
  for (const id of playerIds) startPoint[playerTags[id] ?? id] = ELO_START;
  points.push(startPoint);

  for (const s of chronological) {
    const t = new Date(s.created_at).getTime();
    if (seasonStartMs !== null && t < seasonStartMs) continue;
    applySetToElo(elo, s);
    idx += 1;
    const point: EloPoint = {
      index: idx,
      date: new Date(s.created_at).toLocaleDateString(),
    };
    for (const id of playerIds) point[playerTags[id] ?? id] = elo[id] ?? ELO_START;
    points.push(point);
  }

  return points;
}
