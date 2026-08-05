"use client";

import { Badge } from "@/lib/stats";
import { Player } from "@/lib/types";

export function BadgesRow({
  badges,
  players,
  onSelectPlayer,
}: {
  badges: Badge[];
  players: Player[];
  onSelectPlayer: (id: string) => void;
}) {
  if (badges.length === 0) return null;
  const idToTag = new Map(players.map((p) => [p.id, p.tag]));

  return (
    <div className="rounded-xl border border-[var(--card-border)] p-3 md:col-span-2">
      <h3 className="font-semibold mb-2">Insignias</h3>
      <div className="flex flex-wrap gap-2">
        {badges.map((b) => (
          <div key={b.id} className="flex items-center gap-1.5 rounded-full border border-[var(--card-border)] px-3 py-1.5 text-xs">
            <span>{b.icon}</span>
            <span className="font-medium">{b.label}:</span>
            {b.playerIds.map((id, i) => (
              <span key={id}>
                <button onClick={() => onSelectPlayer(id)} className="hover:underline font-semibold">
                  {idToTag.get(id) ?? id}
                </button>
                {i < b.playerIds.length - 1 ? "," : ""}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
