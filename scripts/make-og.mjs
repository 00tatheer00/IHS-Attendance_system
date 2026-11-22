// Saves the link-preview image as a compact JPEG: start the app (npm run dev/start), then
//   node scripts/make-og.mjs [http://localhost:3000]
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { writeFile } from "node:fs/promises";
const base = process.argv[2] ?? "http://localhost:3000";
const res = await fetch(`${base}/og`);
if (!res.ok) throw new Error(`GET /og → ${res.status}`);
const img = await loadImage(Buffer.from(await res.arrayBuffer()));
const c = createCanvas(img.width, img.height);
c.getContext("2d").drawImage(img, 0, 0);
const jpg = c.toBuffer("image/jpeg", 88);
await writeFile("public/og.jpg", jpg);
console.log(`public/og.jpg written (${Math.round(jpg.length / 1024)} KB)`);
