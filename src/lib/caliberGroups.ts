import type { CaliberCodeRow } from "./database.types";

/** Códigos maestro estándar (ciruela). */
const MAIN_SIZE_CODES = new Set(["L", "XL", "J", "XJ"]);

/** Orden fijo de secciones en la UI. */
export const CALIBER_GROUP_ORDER: string[] = [
  "Calibres",
  "Descarte",
  "Hasta 40",
  "40 – 55",
  "56 – 69",
  "70 – 85",
  "86 en adelante",
  "Otros",
];

function firstLeadingNumber(code: string): number | null {
  const m = code.trim().match(/^\D*(\d+)/);
  if (!m) return null;
  return Number.parseInt(m[1]!, 10);
}

/**
 * Nombre de grupo para chips y filas de kg (misma lógica que el maestro en BD).
 */
export function caliberGroupLabel(c: CaliberCodeRow): string {
  const key = c.code.trim();
  if (MAIN_SIZE_CODES.has(key)) return "Calibres";
  if (
    key === "0-0" ||
    key.toLowerCase() === "descarte" ||
    c.label.trim() === "Descarte"
  ) {
    return "Descarte";
  }
  const n = firstLeadingNumber(c.code);
  if (n == null) return "Otros";
  if (n < 40) return "Hasta 40";
  if (n < 56) return "40 – 55";
  if (n < 70) return "56 – 69";
  if (n < 86) return "70 – 85";
  return "86 en adelante";
}

function groupSortKey(label: string): number {
  const i = CALIBER_GROUP_ORDER.indexOf(label);
  return i === -1 ? 900 : i;
}

/** Orden visual: por grupo, luego sort_order del maestro. */
export function compareCaliberRows(a: CaliberCodeRow, b: CaliberCodeRow): number {
  const ga = groupSortKey(caliberGroupLabel(a));
  const gb = groupSortKey(caliberGroupLabel(b));
  if (ga !== gb) return ga - gb;
  return a.sort_order - b.sort_order;
}

export function calibersByGroup(
  list: CaliberCodeRow[]
): { group: string; items: CaliberCodeRow[] }[] {
  const map = new Map<string, CaliberCodeRow[]>();
  for (const c of list) {
    const g = caliberGroupLabel(c);
    if (!map.has(g)) map.set(g, []);
    map.get(g)!.push(c);
  }
  for (const arr of map.values()) {
    arr.sort((a, b) => a.sort_order - b.sort_order);
  }
  return [...map.entries()]
    .sort(([a], [b]) => groupSortKey(a) - groupSortKey(b))
    .map(([group, items]) => ({ group, items }));
}
