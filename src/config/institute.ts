/**
 * Institute-wide settings shown on ID cards, the login page and reports.
 * Edit here; no other code changes needed.
 */
export const INSTITUTE = {
  name: "Institute of Health Sciences",
  shortName: "IHS",
  affiliation: "University of Peshawar",
  city: "Peshawar",
  // Shown on the back of ID cards. Fill in when available.
  address: "Institute of Health Sciences, Peshawar",
  phone: "",
  logo: "/ihs-logo.png",
} as const;

/** Student portal accounts are created with a synthetic email derived from the roll number. */
export const STUDENT_EMAIL_DOMAIN = "students.ihs.local";

export function studentEmail(rollNo: string) {
  return `${rollNo.trim().toLowerCase()}@${STUDENT_EMAIL_DOMAIN}`;
}

/**
 * Initial student password = last N digits of the CNIC.
 * Supabase requires at least 6 characters, so N = 6.
 * Students are forced to change it on first login.
 */
export const INITIAL_PASSWORD_DIGITS = 6;

export function initialPasswordFromCnic(cnic: string) {
  const digits = cnic.replace(/\D/g, "");
  return digits.length >= INITIAL_PASSWORD_DIGITS ? digits.slice(-INITIAL_PASSWORD_DIGITS) : null;
}

/** Students below this percentage are flagged "at risk". */
export const MIN_ATTENDANCE_PCT = 75;

export const TIMEZONE = "Asia/Karachi";

/** Prefix written into every QR code so foreign QR codes are ignored instantly. */
export const QR_PREFIX = "IHS:";

/**
 * Public student portal (no login): anyone can search students by name,
 * roll number or department and see their attendance.
 * `cardDownload`: allow downloading ID cards (with the attendance QR code)
 * from the public page. Note: anyone could then print a classmate's QR code,
 * so watch the photo/name that pops up on the scanner.
 */
export const PUBLIC_PORTAL = {
  enabled: true,
  cardDownload: true,
} as const;

/**
 * Sections: roll numbers 1–50 are Section A, 51 and above Section B.
 * (Matches public.section_for_roll() in the database.)
 */
export const SECTION_SPLIT_AT = 50;

export function sectionForRoll(rollNo: string): "A" | "B" {
  const n = Number(rollNo.match(/(\d+)$/)?.[1] ?? 0);
  return n <= SECTION_SPLIT_AT ? "A" : "B";
}
