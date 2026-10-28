// Tekstur kartu & tali digambar di <canvas> 2D lalu dipakai sebagai CanvasTexture.
export type BadgeData = {
  photo?: string;
  name: string;
  role: string;
  idLabel: string;
  backLabel: string;
  backUrl: string;
};

export const CARD_W = 1.6;
export const CARD_H = 2.25;
const PX_W = 1024;
const PX_H = Math.round((PX_W * CARD_H) / CARD_W);

function loadImage(src?: string): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function fontVar(name: string, fallback: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function cover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number) {
  const s = Math.max(w / img.width, h / img.height);
  const dw = img.width * s, dh = img.height * s;
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2.4, dw, dh);
}

function slot(ctx: CanvasRenderingContext2D, color: string) {
  // lubang tempat klip, seperti kartu ID sungguhan
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  roundRect(ctx, PX_W / 2 - 70, 34, 140, 26, 13);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  roundRect(ctx, PX_W / 2 - 70, 34, 140, 26, 13);
  ctx.stroke();
}

export async function drawCardFaces(data: BadgeData) {
  await document.fonts?.ready;
  const sans = fontVar("--font-switzer", "Helvetica, Arial, sans-serif");
  const mono = fontVar("--font-geist-mono", "ui-monospace, monospace");
  const [photo, logoDark, logoLight] = await Promise.all([
    loadImage(data.photo),
    loadImage("/logo-on-dark.svg"),
    loadImage("/logo.svg"),
  ]);

  // ── Depan ──
  const f = document.createElement("canvas");
  f.width = PX_W;
  f.height = PX_H;
  const c = f.getContext("2d")!;
  roundRect(c, 0, 0, PX_W, PX_H, 56);
  c.clip();
  c.fillStyle = "#151515";
  c.fillRect(0, 0, PX_W, PX_H);
  if (photo) {
    c.filter = "grayscale(1) contrast(1.08) brightness(0.95)";
    cover(c, photo, PX_W, PX_H);
    c.filter = "none";
  } else if (logoDark) {
    c.globalAlpha = 0.08;
    c.drawImage(logoDark, PX_W * 0.12, PX_H * 0.14, PX_W * 0.76, PX_W * 0.76);
    c.globalAlpha = 1;
  }
  const g = c.createLinearGradient(0, PX_H * 0.45, 0, PX_H);
  g.addColorStop(0, "rgba(10,10,10,0)");
  g.addColorStop(1, "rgba(10,10,10,0.88)");
  c.fillStyle = g;
  c.fillRect(0, 0, PX_W, PX_H);
  const t = c.createLinearGradient(0, 0, 0, PX_H * 0.22);
  t.addColorStop(0, "rgba(10,10,10,0.55)");
  t.addColorStop(1, "rgba(10,10,10,0)");
  c.fillStyle = t;
  c.fillRect(0, 0, PX_W, PX_H * 0.22);

  const pad = 72;
  if (logoDark) c.drawImage(logoDark, pad, 104, 96, 96);
  c.fillStyle = "rgba(244,243,239,0.7)";
  c.font = `400 34px ${mono}`;
  c.textAlign = "right";
  c.textBaseline = "top";
  c.fillText("ID_01", PX_W - pad, 112);
  c.textAlign = "left";

  const lines = data.name.split(/\n/);
  c.fillStyle = "#f4f3ef";
  c.font = `400 132px ${sans}`;
  c.textBaseline = "alphabetic";
  const nameBottom = PX_H - 262;
  lines.forEach((ln, i) => c.fillText(ln, pad - 6, nameBottom - (lines.length - 1 - i) * 124));
  c.font = `400 40px ${mono}`;
  c.fillStyle = "#f4f3ef";
  c.fillText(data.role.toUpperCase(), pad, PX_H - 172);
  c.fillStyle = "rgba(244,243,239,0.55)";
  c.fillRect(pad, PX_H - 140, PX_W - pad * 2, 2);
  c.font = `400 32px ${mono}`;
  c.fillText(data.idLabel.toUpperCase(), pad, PX_H - 92);
  c.textAlign = "right";
  c.fillText(String(new Date().getFullYear()), PX_W - pad, PX_H - 92);
  c.textAlign = "left";
  slot(c, "rgba(244,243,239,0.25)");

  // ── Belakang ──
  const b = document.createElement("canvas");
  b.width = PX_W;
  b.height = PX_H;
  const d = b.getContext("2d")!;
  roundRect(d, 0, 0, PX_W, PX_H, 56);
  d.clip();
  d.fillStyle = "#f4f3ef";
  d.fillRect(0, 0, PX_W, PX_H);
  d.strokeStyle = "rgba(10,10,10,0.08)";
  d.lineWidth = 2;
  for (let x = pad; x < PX_W; x += (PX_W - pad * 2) / 4) {
    d.beginPath();
    d.moveTo(x, 0);
    d.lineTo(x, PX_H);
    d.stroke();
  }
  if (logoLight) d.drawImage(logoLight, PX_W / 2 - 200, PX_H / 2 - 260, 400, 400);
  d.fillStyle = "#0a0a0a";
  d.font = `400 30px ${mono}`;
  d.textAlign = "center";
  d.fillText(data.backLabel.toUpperCase(), PX_W / 2, PX_H / 2 + 230);
  d.fillStyle = "#6e6d69";
  d.font = `400 26px ${mono}`;
  d.fillText(data.backUrl, PX_W / 2, PX_H - 96);
  slot(d, "rgba(10,10,10,0.2)");

  return { front: f, back: b };
}

export function drawBand(text: string) {
  const cv = document.createElement("canvas");
  cv.width = 1024;
  cv.height = 64;
  const c = cv.getContext("2d")!;
  c.fillStyle = "#d4d0cb";
  c.fillRect(0, 0, cv.width, cv.height);
  const mono = fontVar("--font-geist-mono", "ui-monospace, monospace");
  c.fillStyle = "#6e6d69";
  c.font = `400 26px ${mono}`;
  c.textBaseline = "middle";
  const label = `${text.toUpperCase()}   ·   `;
  const w = c.measureText(label).width;
  for (let x = 12; x < cv.width; x += w) c.fillText(label, x, cv.height / 2 + 1);
  return cv;
}
