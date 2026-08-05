"use client";

import { Player } from "@/lib/types";
import { H2HMatrixCell } from "@/lib/stats";
import { Avatar } from "./Avatar";

export function HeadToHeadMatrix({
  players,
  matrix,
  onSelectPlayer,
}: {
  players: Player[];
  matrix: Record<string, Record<string, H2HMatrixCell>>;
  onSelectPlayer: (id: string) => void;
}) {
  if (players.length === 0) return null;

  return (
    <div className="rounded-xl border border-[var(--card-border)] p-3 md:col-span-2 overflow-x-auto">
      <h3 className="font-semibold mb-2">Matriz head-to-head (winrate como rivales)</h3>
      <table className="border-collapse text-xs min-w-full">
        <thead>
          <tr>
            <th className="p-1"></th>
            {players.map((p) => (
              <th key={p.id} className="p-1 text-center">
                <button onClick={() => onSelectPlayer(p.id)} className="flex flex-col items-center gap-1 mx-auto hover:opacity-80">
                  <Avatar id={p.id} tag={p.tag} size={24} />
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {players.map((rowP) => (
            <tr key={rowP.id}>
              <td className="p-1 pr-2 whitespace-nowrap">
                <button onClick={() => onSelectPlayer(rowP.id)} className="flex items-center gap-1.5 hover:underline">
                  <Avatar id={rowP.id} tag={rowP.tag} size={20} />
                  <span className="font-medium">{rowP.tag}</span>
                </button>
              </td>
              {players.map((colP) => {
                if (rowP.id === colP.id) {
                  return (
                    <td key={colP.id} className="p-1 text-center text-[var(--muted)]">
                      —
                    </td>
                  );
                }
                const cell = matrix[rowP.id]?.[colP.id];
                if (!cell || cell.played === 0) {
                  return (
                    <td key={colP.id} className="p-1 text-center text-[var(--muted)]">
                      ·
                    </td>
                  );
                }
                const pctVal = Math.round(cell.winRate * 100);
                const color = pctVal >= 60 ? "text-emerald-500" : pctVal <= 40 ? "text-red-400" : "";
                return (
                  <td key={colP.id} className={`p-1 text-center tabular-nums ${color}`} title={`${cell.won}/${cell.played} sets`}>
                    {pctVal}%
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
