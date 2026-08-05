"use client";

import { useState } from "react";

const COLORS = [
  "#34d399",
  "#60a5fa",
  "#f472b6",
  "#fbbf24",
  "#a78bfa",
  "#f87171",
  "#22d3ee",
  "#a3e635",
];

function colorFor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return COLORS[hash % COLORS.length];
}

export function Avatar({
  id,
  tag,
  size = 32,
  onClick,
  className = "",
}: {
  id: string;
  tag: string;
  size?: number;
  onClick?: () => void;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const initial = tag.trim().charAt(0).toUpperCase() || "?";

  const commonClass = `inline-flex items-center justify-center rounded-full overflow-hidden shrink-0 select-none ${
    onClick ? "cursor-pointer hover:ring-2 hover:ring-[var(--accent)] transition" : ""
  } ${className}`;

  if (failed) {
    return (
      <div
        className={commonClass}
        style={{ width: size, height: size, background: colorFor(id) }}
        onClick={onClick}
        title={tag}
      >
        <span className="font-bold text-zinc-950" style={{ fontSize: size * 0.42 }}>
          {initial}
        </span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/players/${id}.jpg`}
      alt={tag}
      width={size}
      height={size}
      onError={() => setFailed(true)}
      onClick={onClick}
      className={commonClass}
      style={{ width: size, height: size, objectFit: "cover" }}
    />
  );
}
