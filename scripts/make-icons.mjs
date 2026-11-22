// Generates PWA icons and PNG avatars (for PDF ID cards): node scripts/make-icons.mjs
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { writeFile } from "node:fs/promises";

const logo = await loadImage("public/ihs-logo.png");
async function icon(size, pad, file, bg = "#ffffff") {
  const c = createCanvas(size, size);
  const ctx = c.getContext("2d");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);
  const inner = size * (1 - pad * 2);
  const s = Math.min(inner / logo.width, inner / logo.height);
  const w = logo.width * s, h = logo.height * s;
  ctx.drawImage(logo, (size - w) / 2, (size - h) / 2, w, h);
  await writeFile(file, c.toBuffer("image/png"));
}
await icon(192, 0.06, "public/icons/icon-192.png");
await icon(512, 0.06, "public/icons/icon-512.png");
await icon(512, 0.18, "public/icons/maskable-512.png");
await icon(180, 0.08, "public/icons/apple-touch-icon.png");

for (const name of ["male", "female", "neutral"]) {
  const img = await loadImage(`public/avatars/${name}.svg`);
  const c = createCanvas(600, 600);
  c.getContext("2d").drawImage(img, 0, 0, 600, 600);
  await writeFile(`public/avatars/${name}.png`, c.toBuffer("image/png"));
}
console.log("icons + avatars written");
