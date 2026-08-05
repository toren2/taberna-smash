"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const OLD_SETS_KEY = "taberna_smash_sets_v1";
const OLD_SEASON_KEY = "taberna_smash_elo_season_start_v1";
const MIGRATED_FLAG = "taberna_smash_migrated_to_supabase_v1";

type OldKD = { kills?: number; deaths?: number };
type OldSetRow = {
  id?: string;
  a1: string;
  a2: string;
  b1: string;
  b2: string;
  aGames: number;
  bGames: number;
  createdAt: string;
  stats?: Record<string, OldKD>;
};

/**
 * Migración de una sola vez: en la app anterior cada set se guardaba solo en el
 * localStorage del navegador donde se registraba (no había backend compartido).
 * Este componente detecta ese historial local (si existe en este dispositivo) y
 * lo sube a Supabase una única vez, para no perder los datos de la versión vieja.
 */
export function LegacyMigration() {
  const [status, setStatus] = useState<"idle" | "migrating" | "done" | "error">("idle");
  const [count, setCount] = useState(0);

  useEffect(() => {
    async function migrate() {
      try {
        if (typeof window === "undefined") return;
        if (localStorage.getItem(MIGRATED_FLAG)) return;

        const raw = localStorage.getItem(OLD_SETS_KEY);
        if (!raw) {
          localStorage.setItem(MIGRATED_FLAG, "1");
          return;
        }

        const parsed = JSON.parse(raw) as OldSetRow[];
        if (!Array.isArray(parsed) || parsed.length === 0) {
          localStorage.setItem(MIGRATED_FLAG, "1");
          return;
        }

        setStatus("migrating");

        const rows = parsed.map((s) => {
          const stats: Record<string, { kills: number; deaths: number }> = {};
          for (const id of [s.a1, s.a2, s.b1, s.b2]) {
            const kd = s.stats?.[id] ?? {};
            stats[id] = { kills: Number(kd.kills) || 0, deaths: Number(kd.deaths) || 0 };
          }
          return {
            ...(s.id ? { id: s.id } : {}),
            a1: s.a1,
            a2: s.a2,
            b1: s.b1,
            b2: s.b2,
            a_games: s.aGames,
            b_games: s.bGames,
            stats,
            created_at: s.createdAt,
          };
        });

        const { error } = await supabase
          .from("sets")
          .upsert(rows, { onConflict: "id", ignoreDuplicates: true });
        if (error) {
          console.error("Migration error", error);
          setStatus("error");
          return;
        }

        const oldSeason = localStorage.getItem(OLD_SEASON_KEY);
        if (oldSeason) {
          try {
            const seasonValue = JSON.parse(oldSeason);
            if (typeof seasonValue === "string") {
              await supabase
                .from("app_settings")
                .upsert({ key: "elo_season_start", value: seasonValue });
            }
          } catch {
            // ignore malformed season data
          }
        }

        localStorage.setItem(MIGRATED_FLAG, "1");
        setCount(rows.length);
        setStatus("done");
      } catch (err) {
        console.error("Migration failed", err);
        setStatus("error");
      }
    }

    migrate();
  }, []);

  if (status === "migrating") {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] px-4 py-2 text-sm shadow-lg">
        Migrando tu historial guardado en este dispositivo...
      </div>
    );
  }

  if (status === "done" && count > 0) {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 rounded-xl bg-emerald-500 text-zinc-950 px-4 py-2 text-sm font-semibold shadow-lg">
        Se migraron {count} sets antiguos de este dispositivo ✅
      </div>
    );
  }

  return null;
}
