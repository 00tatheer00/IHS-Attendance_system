/**
 * One colour family per department, used consistently everywhere.
 * Gradients stay inside a single hue (tone-on-tone) so they look rich, not loud.
 * Class strings are written out in full so Tailwind can see them.
 */
export interface DeptTheme {
  /** Icon tile / badge: tone-on-tone gradient + white text */
  solid: string;
  /** Soft tint: light background + strong text */
  soft: string;
  /** Page header: deep tone-on-tone gradient */
  hero: string;
  /** Accent text colour */
  text: string;
  /** Hover border for cards */
  ring: string;
}

const THEMES: Record<string, DeptTheme> = {
  CAR: {
    solid: "bg-linear-to-br from-rose-500 to-rose-600",
    soft: "bg-rose-50 text-rose-700",
    hero: "bg-linear-to-br from-rose-600 via-rose-700 to-rose-900",
    text: "text-rose-600",
    ring: "hover:border-rose-200",
  },
  DEN: {
    solid: "bg-linear-to-br from-sky-500 to-sky-600",
    soft: "bg-sky-50 text-sky-700",
    hero: "bg-linear-to-br from-sky-600 via-sky-700 to-sky-900",
    text: "text-sky-600",
    ring: "hover:border-sky-200",
  },
  EME: {
    solid: "bg-linear-to-br from-amber-500 to-orange-500",
    soft: "bg-amber-50 text-amber-700",
    hero: "bg-linear-to-br from-amber-600 via-orange-700 to-orange-900",
    text: "text-amber-600",
    ring: "hover:border-amber-200",
  },
  MLT: {
    solid: "bg-linear-to-br from-emerald-500 to-emerald-600",
    soft: "bg-emerald-50 text-emerald-700",
    hero: "bg-linear-to-br from-emerald-600 via-emerald-700 to-emerald-900",
    text: "text-emerald-600",
    ring: "hover:border-emerald-200",
  },
  SUR: {
    solid: "bg-linear-to-br from-violet-500 to-violet-600",
    soft: "bg-violet-50 text-violet-700",
    hero: "bg-linear-to-br from-violet-600 via-violet-700 to-violet-900",
    text: "text-violet-600",
    ring: "hover:border-violet-200",
  },
  RAD: {
    solid: "bg-linear-to-br from-fuchsia-500 to-fuchsia-600",
    soft: "bg-fuchsia-50 text-fuchsia-700",
    hero: "bg-linear-to-br from-fuchsia-600 via-fuchsia-700 to-fuchsia-900",
    text: "text-fuchsia-600",
    ring: "hover:border-fuchsia-200",
  },
  OPT: {
    solid: "bg-linear-to-br from-teal-500 to-teal-600",
    soft: "bg-teal-50 text-teal-700",
    hero: "bg-linear-to-br from-teal-600 via-teal-700 to-teal-900",
    text: "text-teal-600",
    ring: "hover:border-teal-200",
  },
};

const FALLBACKS: DeptTheme[] = [
  {
    solid: "bg-linear-to-br from-indigo-500 to-indigo-600",
    soft: "bg-indigo-50 text-indigo-700",
    hero: "bg-linear-to-br from-indigo-600 via-indigo-700 to-indigo-900",
    text: "text-indigo-600",
    ring: "hover:border-indigo-200",
  },
  {
    solid: "bg-linear-to-br from-cyan-500 to-cyan-600",
    soft: "bg-cyan-50 text-cyan-700",
    hero: "bg-linear-to-br from-cyan-600 via-cyan-700 to-cyan-900",
    text: "text-cyan-600",
    ring: "hover:border-cyan-200",
  },
  {
    solid: "bg-linear-to-br from-pink-500 to-pink-600",
    soft: "bg-pink-50 text-pink-700",
    hero: "bg-linear-to-br from-pink-600 via-pink-700 to-pink-900",
    text: "text-pink-600",
    ring: "hover:border-pink-200",
  },
  {
    solid: "bg-linear-to-br from-lime-500 to-lime-600",
    soft: "bg-lime-50 text-lime-700",
    hero: "bg-linear-to-br from-lime-600 via-lime-700 to-lime-900",
    text: "text-lime-600",
    ring: "hover:border-lime-200",
  },
];

export function deptTheme(code: string): DeptTheme {
  if (THEMES[code]) return THEMES[code];
  let h = 0;
  for (const ch of code) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return FALLBACKS[h % FALLBACKS.length]!;
}
