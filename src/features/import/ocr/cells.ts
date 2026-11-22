import { extractRoll, normalizeRoll, type RawRow } from "../normalize";

/**
 * Picks the roll-number column (the one where most cells look like roll
 * numbers); the next two columns are taken as Name and Father Name, which
 * matches the IHS class lists (S.No | Roll No | Name | Father Name).
 */
export function cellsToRawRows(cells: string[][], source: string): RawRow[] {
  if (!cells.length) return [];
  const ncols = cells[0]!.length;
  let rollCol = -1, best = 0;
  for (let c = 0; c < ncols; c++) {
    const hits = cells.filter((r) => normalizeRoll(r[c] ?? "")).length;
    if (hits > best) { best = hits; rollCol = c; }
  }
  if (rollCol < 0 || best < 2) return [];

  return cells
    .filter((r) => normalizeRoll(r[rollCol] ?? ""))
    .map((r) => {
      let rollCell = r[rollCol]!;
      let name = r[rollCol + 1] ?? "";
      // Wide roll numbers overflow their cell in both directions:
      //   "CAR-F26-1" | "00|Muneeza Mansoor"  → digits belong to the roll
      //   "RAD-F26-101|Hijab" | "BiBi"         → "Hijab" belongs to the name
      const lead = name.match(/^\s*(\d{1,2})(?=[\s|\][]|[A-Za-z]|$)/);
      if (lead && /-\d{1,2}\s*$/.test(rollCell)) {
        rollCell = rollCell.trimEnd() + lead[1];
        name = name.slice(lead[0].length);
      }
      const { rest } = extractRoll(rollCell);
      return { roll: rollCell, name: `${rest} ${name}`, father: r[rollCol + 2] ?? "", source };
    });
}
