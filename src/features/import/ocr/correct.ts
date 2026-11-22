/**
 * Conservative post-OCR corrections. Each rule only fires when the result is a
 * known name token, so correct-but-unusual spellings are never changed.
 */
import { FEMALE_NAMES, MALE_NAMES } from "../gender";

const SURNAMES = `khan ali shah ahmad ahmed ullah haq hussain hussein rehman rahman iqbal ishaq ishfaq shafiq tariq rafiq saqib
  qureshi durrani afridi khalil bangash wazir yousaf yousafzai mehmood mahmood jan gul zada zaman nawaz noor bibi begum
  ilyas javed jamil farooq faisal kamal sultan siddiqui saeed zahir zahid zafar waqar qasim qaiser haider anwar akhtar
  aslam aziz azeez abbas arshad asif amin awan khattak mohmand orakzai shinwari mughal raza sardar malik syed din uddin
  rasheed raheem kareem karim hakeem naseem saleem waheed hameed majeed haleem saqib aqib aqil aqsa luqman iqra`
  .split(/\s+/)
  .filter(Boolean);

const VOCAB = new Set<string>([...FEMALE_NAMES, ...MALE_NAMES, ...SURNAMES]);

/** Single-character OCR confusions to try, in order. */
const SWAPS: [RegExp, string][] = [
  [/g/g, "q"],
  [/^i/, "j"],
  [/^l/, "i"],
  [/ll/, "il"],
  [/rn/g, "m"],
  [/ii/g, "ij"],
  [/i/g, "j"],
  [/v/g, "y"],
];

function fixToken(token: string): string {
  const lower = token.toLowerCase();
  if (lower.length < 3 || VOCAB.has(lower)) return token;
  for (const [re, rep] of SWAPS) {
    const cand = lower.replace(re, rep);
    if (cand !== lower && VOCAB.has(cand)) return matchCase(token, cand);
  }
  // Lost space: "Nizamkhan" → "Nizam Khan" (only if the head is a known name)
  for (const tail of ["khan", "bibi", "ali", "shah", "ullah"]) {
    if (lower.endsWith(tail)) {
      const head = lower.slice(0, -tail.length);
      if (head.length >= 3 && VOCAB.has(head)) return `${matchCase(token, head)} ${matchCase("X", tail)}`;
    }
  }
  return token;
}

function matchCase(model: string, word: string) {
  return model[0] === model[0]?.toUpperCase() ? word[0]!.toUpperCase() + word.slice(1) : word;
}

export function correctOcrName(name: string) {
  return name.split(" ").map(fixToken).join(" ");
}

function levenshtein(a: string, b: string) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)] as number[]);
  for (let j = 1; j <= b.length; j++) d[0]![j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i]![j] = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length]![b.length]!;
}

/** "CCAR" → "CAR", "MUT" → "MLT" when exactly one known code is that close. */
export function snapDepartment(code: string, known: string[]) {
  if (known.includes(code)) return code;
  const contained = known.filter((k) => code.includes(k));
  if (contained.length === 1) return contained[0]!;
  const scored = known.map((k) => [k, levenshtein(code, k)] as const).sort((a, b) => a[1] - b[1]);
  const [first, second] = scored;
  if (first && first[1] <= 1 && (!second || second[1] > first[1])) return first[0];
  return code;
}
