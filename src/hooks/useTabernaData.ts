"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Player, SetRow } from "@/lib/types";

function mapSetRow(row: Record<string, unknown>): SetRow {
  return {
    id: row.id as string,
    a1: row.a1 as string,
    a2: row.a2 as string,
    b1: row.b1 as string,
    b2: row.b2 as string,
    a_games: row.a_games as number,
    b_games: row.b_games as number,
    stats: (row.stats as SetRow["stats"]) ?? {},
    created_at: row.created_at as string,
  };
}

export function useTabernaData() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [sets, setSets] = useState<SetRow[]>([]);
  const [eloSeasonStart, setEloSeasonStartState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(true);

  const loadAll = useCallback(async () => {
    const [playersRes, setsRes, settingsRes] = await Promise.all([
      supabase.from("players").select("*").order("sort_order", { ascending: true }),
      supabase.from("sets").select("*").order("created_at", { ascending: false }),
      supabase.from("app_settings").select("*").eq("key", "elo_season_start").maybeSingle(),
    ]);

    if (!playersRes.error && playersRes.data) setPlayers(playersRes.data as Player[]);
    if (!setsRes.error && setsRes.data) setSets((setsRes.data as Record<string, unknown>[]).map(mapSetRow));
    if (!settingsRes.error) setEloSeasonStartState((settingsRes.data?.value as string | undefined) ?? null);

    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de datos desde Supabase al montar
    loadAll();

    const channel = supabase
      .channel("taberna-smash-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "players" }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "sets" }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "app_settings" }, () => loadAll())
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadAll]);

  const addSet = useCallback(
    async (row: Omit<SetRow, "id" | "created_at">) => {
      const { error } = await supabase.from("sets").insert({
        a1: row.a1,
        a2: row.a2,
        b1: row.b1,
        b2: row.b2,
        a_games: row.a_games,
        b_games: row.b_games,
        stats: row.stats,
      });
      return { error };
    },
    []
  );

  const undoLast = useCallback(async () => {
    if (sets.length === 0) return { error: null };
    const last = sets[0];
    const { error } = await supabase.from("sets").delete().eq("id", last.id);
    return { error };
  }, [sets]);

  const clearAll = useCallback(async () => {
    const { error } = await supabase.from("sets").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    return { error };
  }, []);

  const setEloSeasonStart = useCallback(async (value: string | null) => {
    if (value === null) {
      const { error } = await supabase.from("app_settings").delete().eq("key", "elo_season_start");
      if (!error) setEloSeasonStartState(null);
      return { error };
    }
    const { error } = await supabase
      .from("app_settings")
      .upsert({ key: "elo_season_start", value });
    if (!error) setEloSeasonStartState(value);
    return { error };
  }, []);

  const addPlayer = useCallback(
    async (id: string, tag: string) => {
      const sortOrder = players.length ? Math.max(...players.map((p) => p.sort_order)) + 1 : 0;
      const { error } = await supabase.from("players").insert({ id, tag, sort_order: sortOrder });
      return { error };
    },
    [players]
  );

  const renamePlayer = useCallback(async (id: string, tag: string) => {
    const { error } = await supabase.from("players").update({ tag }).eq("id", id);
    return { error };
  }, []);

  const setPlayerActive = useCallback(async (id: string, active: boolean) => {
    const { error } = await supabase.from("players").update({ active }).eq("id", id);
    return { error };
  }, []);

  const deletePlayer = useCallback(async (id: string) => {
    const { error } = await supabase.from("players").delete().eq("id", id);
    return { error };
  }, []);

  return {
    players,
    sets,
    eloSeasonStart,
    loading,
    connected,
    addSet,
    undoLast,
    clearAll,
    setEloSeasonStart,
    addPlayer,
    renamePlayer,
    setPlayerActive,
    deletePlayer,
    refresh: loadAll,
  };
}
