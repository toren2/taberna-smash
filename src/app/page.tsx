"use client";

import { useMemo, useState } from "react";
import { useTabernaData } from "@/hooks/useTabernaData";
import { SetForm } from "@/components/SetForm";
import { PlayerManager } from "@/components/PlayerManager";
import { LegacyMigration } from "@/components/LegacyMigration";
import { ThemeToggle } from "@/components/ThemeToggle";
import { EloChart } from "@/components/EloChart";
import { History } from "@/components/History";
import { HeadToHeadMatrix } from "@/components/HeadToHeadMatrix";
import { BadgesRow } from "@/components/BadgesRow";
import { NightlyMVP } from "@/components/NightlyMVP";
import { CharacterStatsBoard } from "@/components/CharacterStatsBoard";
import { SettingsMenu } from "@/components/SettingsMenu";
import { WeeklySummary } from "@/components/WeeklySummary";
import { PlayerProfileModal } from "@/components/PlayerProfileModal";
import { DuoEntry, DuoStatsPanel, EloEntry, EloRanking, PlayerStatEntry, PlayerStatsPanel } from "@/components/Rankings";
import { computeEloHistory, computeEloMap, ELO_K, ELO_START } from "@/lib/elo";
import { computeBadges, computeH2HMatrix, computePlayerFullStats } from "@/lib/stats";

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function Page() {
  const {
    players,
    sets,
    eloSeasonStart,
    loading,
    connected,
    addSet,
    undoLast,
    clearAll,
    fetchTrash,
    restoreSet,
    hardDeleteSet,
    emptyTrash,
    setEloSeasonStart,
    addPlayer,
    renamePlayer,
    setPlayerActive,
    deletePlayer,
  } = useTabernaData();

  const [activeTab, setActiveTab] = useState<"resumen" | "personajes">("resumen");
  const [showPlayers, setShowPlayers] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  const idToTag = useMemo(() => new Map(players.map((p) => [p.id, p.tag])), [players]);
  const playerIds = useMemo(() => players.map((p) => p.id), [players]);
  const playerTagMap = useMemo(() => Object.fromEntries(players.map((p) => [p.id, p.tag])), [players]);

  const eloMap = useMemo(() => computeEloMap(playerIds, sets, eloSeasonStart), [playerIds, sets, eloSeasonStart]);

  const eloRanking: EloEntry[] = useMemo(
    () =>
      players
        .map((p) => ({ id: p.id, tag: p.tag, elo: eloMap[p.id] ?? ELO_START }))
        .sort((a, b) => b.elo - a.elo),
    [players, eloMap]
  );

  const eloHistory = useMemo(
    () => computeEloHistory(playerIds, playerTagMap, sets, eloSeasonStart),
    [playerIds, playerTagMap, sets, eloSeasonStart]
  );

  const playerStats: PlayerStatEntry[] = useMemo(() => {
    const stats: Record<string, PlayerStatEntry> = Object.fromEntries(
      players.map((p) => [p.id, { id: p.id, tag: p.tag, setsPlayed: 0, setsWon: 0, winRate: 0, kills: 0, deaths: 0, diff: 0 }])
    );

    for (const s of sets) {
      const aWon = s.a_games > s.b_games;
      for (const id of [s.a1, s.a2]) {
        if (!stats[id]) continue;
        stats[id].setsPlayed += 1;
        if (aWon) stats[id].setsWon += 1;
        const kd = s.stats?.[id] ?? { kills: 0, deaths: 0 };
        stats[id].kills += kd.kills;
        stats[id].deaths += kd.deaths;
      }
      for (const id of [s.b1, s.b2]) {
        if (!stats[id]) continue;
        stats[id].setsPlayed += 1;
        if (!aWon) stats[id].setsWon += 1;
        const kd = s.stats?.[id] ?? { kills: 0, deaths: 0 };
        stats[id].kills += kd.kills;
        stats[id].deaths += kd.deaths;
      }
    }

    for (const id of Object.keys(stats)) {
      const x = stats[id];
      x.winRate = x.setsPlayed ? x.setsWon / x.setsPlayed : 0;
      x.diff = x.kills - x.deaths;
    }

    return Object.values(stats).sort((a, b) => b.winRate - a.winRate || b.diff - a.diff || b.setsPlayed - a.setsPlayed);
  }, [players, sets]);

  const duoStats: DuoEntry[] = useMemo(() => {
    const m = new Map<string, DuoEntry>();
    function keyOf(p1: string, p2: string) {
      return [p1, p2].sort().join("|");
    }
    for (const s of sets) {
      const aWon = s.a_games > s.b_games;

      const aKey = keyOf(s.a1, s.a2);
      const aObj = m.get(aKey) ?? {
        duo: `${idToTag.get(s.a1) ?? s.a1} + ${idToTag.get(s.a2) ?? s.a2}`,
        duoIds: [s.a1, s.a2] as [string, string],
        played: 0,
        won: 0,
        winRate: 0,
      };
      aObj.played += 1;
      if (aWon) aObj.won += 1;
      m.set(aKey, aObj);

      const bKey = keyOf(s.b1, s.b2);
      const bObj = m.get(bKey) ?? {
        duo: `${idToTag.get(s.b1) ?? s.b1} + ${idToTag.get(s.b2) ?? s.b2}`,
        duoIds: [s.b1, s.b2] as [string, string],
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

  const playerFullStats = useMemo(() => computePlayerFullStats(players, sets), [players, sets]);
  const h2hMatrix = useMemo(() => computeH2HMatrix(players, sets), [players, sets]);
  const badges = useMemo(() => computeBadges(players, playerFullStats, eloRanking), [players, playerFullStats, eloRanking]);

  const eloSeasonLabel = eloSeasonStart ? `Elo: temporada desde ${fmtDate(eloSeasonStart)}` : "Elo: usando todo el historial";

  function flash(text: string) {
    setMsg(text);
    setTimeout(() => setMsg(""), 1500);
  }

  async function handleUndo() {
    const { error } = await undoLast();
    flash(error ? "No se pudo deshacer." : "Último set eliminado (va a la papelera).");
  }

  async function handleClear() {
    if (!confirm("¿Borrar todo el historial para todo el grupo? (se puede restaurar desde la papelera)")) return;
    const { error } = await clearAll();
    flash(error ? "No se pudo borrar." : "Historial borrado (va a la papelera).");
    setShowSettings(false);
  }

  async function handleResetSeason() {
    if (!confirm("¿Iniciar nueva temporada Elo desde ahora? (no borra historial)")) return;
    const { error } = await setEloSeasonStart(new Date().toISOString());
    flash(error ? "No se pudo reiniciar." : "Temporada Elo reiniciada ✅");
    setShowSettings(false);
  }

  async function handleAllTimeElo() {
    if (!confirm("¿Volver Elo a calcularse con TODO el historial?")) return;
    const { error } = await setEloSeasonStart(null);
    flash(error ? "No se pudo actualizar." : "Elo volverá a usar todo el historial.");
    setShowSettings(false);
  }

  const selectedPlayer = selectedPlayerId ? players.find((p) => p.id === selectedPlayerId) ?? null : null;
  const selectedPlayerRank = selectedPlayerId ? eloRanking.findIndex((e) => e.id === selectedPlayerId) + 1 : 0;

  return (
    <main className="min-h-screen p-4 pb-10">
      <LegacyMigration />
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Taberna Smash</h1>
            <p className="text-[var(--muted)]">2v2 · Sets BO3 · Winrate + Elo por jugador</p>
            <p className="text-xs text-[var(--muted)] mt-1 flex items-center gap-2">
              {eloSeasonLabel} · K={ELO_K} · base {ELO_START}
              <span
                className={`inline-flex items-center gap-1 ${connected ? "text-emerald-500" : "text-amber-500"}`}
                title={connected ? "Conectado en tiempo real" : "Reconectando..."}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-emerald-500" : "bg-amber-500"}`} />
                {connected ? "en vivo" : "conectando"}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <ThemeToggle />
            <button onClick={() => setShowPlayers(true)} className="px-3 py-2 rounded-lg border border-[var(--card-border)] text-sm hover:bg-black/5 dark:hover:bg-white/5">
              Jugadores
            </button>
            <button onClick={handleUndo} disabled={sets.length === 0} className="px-3 py-2 rounded-lg border border-[var(--card-border)] text-sm hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-40">
              Undo
            </button>
            <button onClick={() => setShowSettings(true)} className="px-3 py-2 rounded-lg border border-[var(--card-border)] text-sm hover:bg-black/5 dark:hover:bg-white/5">
              ⚙️ Ajustes
            </button>
          </div>
        </header>

        {msg && <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-3 text-sm text-center">{msg}</div>}

        {!loading && (
          <div className="flex gap-2 border-b border-[var(--card-border)]">
            <button
              onClick={() => setActiveTab("resumen")}
              className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition ${
                activeTab === "resumen"
                  ? "border-indigo-500 text-indigo-400"
                  : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              Resumen
            </button>
            <button
              onClick={() => setActiveTab("personajes")}
              className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition ${
                activeTab === "personajes"
                  ? "border-indigo-500 text-indigo-400"
                  : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              Personajes
            </button>
          </div>
        )}

        {loading ? (
          <div className="text-center text-sm text-[var(--muted)] py-10">Cargando datos...</div>
        ) : activeTab === "personajes" ? (
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-1">
              <SetForm players={players} onSubmit={addSet} />
            </div>
            <div className="lg:col-span-2">
              <CharacterStatsBoard players={players} sets={sets} playerFullStats={playerFullStats} />
            </div>
          </section>
        ) : (
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-1">
              <SetForm players={players} onSubmit={addSet} />
            </div>

            <div className="rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] p-4 lg:col-span-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <BadgesRow badges={badges} players={players} onSelectPlayer={setSelectedPlayerId} />
                <NightlyMVP
                  players={players}
                  sets={sets}
                  eloSeasonStart={eloSeasonStart}
                  onSelectPlayer={setSelectedPlayerId}
                />
                <WeeklySummary
                  players={players}
                  sets={sets}
                  eloSeasonStart={eloSeasonStart}
                  onSelectPlayer={setSelectedPlayerId}
                />
                <EloRanking ranking={eloRanking} seasonLabel={eloSeasonLabel} onSelectPlayer={setSelectedPlayerId} />
                <PlayerStatsPanel stats={playerStats} onSelectPlayer={setSelectedPlayerId} />

                <div className="rounded-xl border border-[var(--card-border)] p-3 md:col-span-2">
                  <h3 className="font-semibold mb-2">Evolución de Elo</h3>
                  <EloChart data={eloHistory} series={players.map((p) => p.tag)} />
                </div>

                <HeadToHeadMatrix players={players} matrix={h2hMatrix} onSelectPlayer={setSelectedPlayerId} />
                <DuoStatsPanel duos={duoStats} onSelectPlayer={setSelectedPlayerId} />
                <History sets={sets} players={players} idToTag={idToTag} onSelectPlayer={setSelectedPlayerId} />
              </div>
            </div>
          </section>
        )}
      </div>

      {showPlayers && (
        <PlayerManager
          players={players}
          onAdd={addPlayer}
          onRename={renamePlayer}
          onSetActive={setPlayerActive}
          onDelete={deletePlayer}
          onClose={() => setShowPlayers(false)}
        />
      )}

      {showSettings && (
        <SettingsMenu
          players={players}
          idToTag={idToTag}
          sets={sets}
          eloSeasonLabel={eloSeasonLabel}
          onResetSeason={handleResetSeason}
          onAllTimeElo={handleAllTimeElo}
          onClearAll={handleClear}
          fetchTrash={fetchTrash}
          onRestore={restoreSet}
          onHardDelete={hardDeleteSet}
          onEmptyTrash={emptyTrash}
          onClose={() => setShowSettings(false)}
        />
      )}

      {selectedPlayer && (
        <PlayerProfileModal
          player={selectedPlayer}
          players={players}
          stats={playerFullStats[selectedPlayer.id]}
          elo={eloMap[selectedPlayer.id] ?? ELO_START}
          eloRank={selectedPlayerRank}
          eloHistory={eloHistory}
          onClose={() => setSelectedPlayerId(null)}
          onSelectPlayer={setSelectedPlayerId}
        />
      )}
    </main>
  );
}
