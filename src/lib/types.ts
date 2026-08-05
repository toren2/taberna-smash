export type Player = {
  id: string;
  tag: string;
  active: boolean;
  sort_order: number;
  created_at: string;
};

export type KD = { kills: number; deaths: number; character?: string };

export type SetRow = {
  id: string;
  a1: string;
  a2: string;
  b1: string;
  b2: string;
  a_games: number;
  b_games: number;
  stats: Record<string, KD>;
  created_at: string;
};

export type ScoreOption = "2-0" | "2-1" | "1-2" | "0-2";

export function kdDefault(): KD {
  return { kills: 0, deaths: 0 };
}

export function clampInt(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}
