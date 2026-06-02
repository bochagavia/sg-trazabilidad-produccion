import type { CaliberCodeRow } from "./database.types";

/** Orden fijo de secciones en la UI. */
export const CALIBER_GROUP_ORDER: string[] = [
  "Calibres",
  "Pepilla",
  "Descarte",
  "Otros",
];

function groupSortKey(label: string): number {
  const i = CALIBER_GROUP_ORDER.indexOf(label);
  return i === -1 ? 900 : i;
}

/**
 * Nombre de grupo para filas de kg en calibrado.
 */
export function caliberGroupLabel(c: CaliberCodeRow): string {
  const key = c.code.trim();
  const upper = key.toUpperCase();
  if (upper === "PEPILLA") {
    return "Pepilla";
  }
  if (
    key === "0-0" ||
    upper === "DESCARTE" ||
    c.label.trim().toLowerCase() === "descarte"
  ) {
    return "Descarte";
  }
  if (/^\d+-\d+$/.test(key)) return "Calibres";
  return "Otros";
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
