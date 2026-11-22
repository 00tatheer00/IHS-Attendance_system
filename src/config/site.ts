/** Branding used for the browser tab, installed app and link previews (WhatsApp etc.). */
export const SITE = {
  title: "IHS Attendance System",
  author: "Tatheer",
  tagline: "Check your attendance & download your ID card",
  description:
    "Institute of Health Sciences, Peshawar — search your name or roll number to see your live attendance, every class you attended, and download your student ID card. No login needed.",
} as const;

/**
 * Absolute site URL (link previews need absolute image URLs).
 * Vercel sets VERCEL_PROJECT_PRODUCTION_URL automatically; set NEXT_PUBLIC_SITE_URL
 * if you use a custom domain.
 */
export function siteUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return new URL(explicit);
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  return new URL(vercel ? `https://${vercel}` : "http://localhost:3000");
}
