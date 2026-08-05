"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza con el atributo seteado por el script inline anti-flash antes de la hidratación
    setTheme(current === "light" ? "light" : "dark");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("taberna_theme", next);
    } catch {}
  }

  return (
    <button
      onClick={toggle}
      className="px-3 py-2 rounded-lg border border-[var(--card-border)] text-sm hover:bg-black/5 dark:hover:bg-white/5"
      title="Cambiar tema"
    >
      {theme === "dark" ? "☀️ Claro" : "🌙 Oscuro"}
    </button>
  );
}
