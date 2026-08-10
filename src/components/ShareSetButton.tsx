"use client";

import { useState } from "react";
import { SetRow } from "@/lib/types";
import { renderSetCard } from "@/lib/shareCard";

export function ShareSetButton({ set, idToTag }: { set: SetRow; idToTag: Map<string, string> }) {
  const [busy, setBusy] = useState(false);

  async function handleShare(e: React.MouseEvent) {
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    try {
      const blob = await renderSetCard(set, idToTag);
      if (!blob) return;

      const file = new File([blob], "taberna-smash-set.png", { type: "image/png" });

      if (
        typeof navigator !== "undefined" &&
        navigator.share &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        try {
          await navigator.share({ files: [file], title: "Taberna Smash" });
          return;
        } catch {
          // usuario canceló o falló el share nativo: cae al fallback de descarga
        }
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "taberna-smash-set.png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={handleShare}
      disabled={busy}
      title="Compartir resultado"
      className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg border border-[var(--card-border)] text-sm hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-40"
    >
      {busy ? "…" : "📤"}
    </button>
  );
}
