import { SetRow } from "./types";

function fmtDateShort(iso: string) {
  try {
    return new Date(iso).toLocaleString("es", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

/** Dibuja una tarjeta de resultado (1080x1350, formato story) y la devuelve como PNG Blob. */
export async function renderSetCard(set: SetRow, idToTag: Map<string, string>): Promise<Blob | null> {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const aWon = set.a_games > set.b_games;
  const teamA = [set.a1, set.a2];
  const teamB = [set.b1, set.b2];

  // fondo
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#161618");
  bg.addColorStop(1, "#0a0a0b");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // marca
  ctx.fillStyle = "#8b8b93";
  ctx.font = "600 34px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("TABERNA SMASH", W / 2, 110);

  ctx.fillStyle = "#e5e5e8";
  ctx.font = "400 28px system-ui, sans-serif";
  ctx.fillText(fmtDateShort(set.created_at), W / 2, 155);

  // marcador
  ctx.font = "800 190px system-ui, sans-serif";
  ctx.fillStyle = aWon ? "#34d399" : "#e5e5e8";
  ctx.textAlign = "right";
  ctx.fillText(`${set.a_games}`, W / 2 - 40, 400);
  ctx.fillStyle = !aWon ? "#34d399" : "#e5e5e8";
  ctx.textAlign = "left";
  ctx.fillText(`${set.b_games}`, W / 2 + 40, 400);

  ctx.fillStyle = "#5a5a63";
  ctx.font = "600 60px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("–", W / 2, 370);

  function drawTeam(ids: string[], won: boolean, xCenter: number) {
    ctx!.textAlign = "center";
    ctx!.font = "700 46px system-ui, sans-serif";
    ctx!.fillStyle = won ? "#34d399" : "#e5e5e8";
    const names = ids.map((id) => idToTag.get(id) ?? id).join(" + ");
    ctx!.fillText(names, xCenter, 500);
    if (won) {
      ctx!.font = "600 30px system-ui, sans-serif";
      ctx!.fillStyle = "#34d399";
      ctx!.fillText("🏆 GANADOR", xCenter, 545);
    }
  }
  drawTeam(teamA, aWon, W / 2 - 260);
  drawTeam(teamB, !aWon, W / 2 + 260);

  // separador
  ctx.strokeStyle = "#2a2a2e";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(80, 610);
  ctx.lineTo(W - 80, 610);
  ctx.stroke();

  // stats por jugador
  const allIds = [...teamA, ...teamB];
  let y = 700;
  ctx.textAlign = "left";
  for (const id of allIds) {
    const kd = set.stats?.[id] ?? { kills: 0, deaths: 0 };
    const tag = idToTag.get(id) ?? id;
    const onA = teamA.includes(id);
    const won = onA ? aWon : !aWon;

    ctx.fillStyle = won ? "#34d399" : "#8b8b93";
    ctx.font = "700 42px system-ui, sans-serif";
    ctx.fillText(tag, 100, y);

    ctx.fillStyle = "#e5e5e8";
    ctx.font = "500 38px system-ui, sans-serif";
    ctx.textAlign = "right";
    const diff = kd.kills - kd.deaths;
    const diffLabel = diff >= 0 ? `+${diff}` : `${diff}`;
    ctx.fillText(`${kd.kills} / ${kd.deaths}  (${diffLabel})`, W - 100, y);
    ctx.textAlign = "left";

    if (kd.character) {
      ctx.fillStyle = "#8b8b93";
      ctx.font = "400 30px system-ui, sans-serif";
      ctx.fillText(kd.character, 100, y + 40);
    }

    y += kd.character ? 110 : 80;
  }

  ctx.fillStyle = "#5a5a63";
  ctx.font = "400 26px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("taberna-smash.vercel.app", W / 2, H - 50);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}
