/**
 * Validaciones compartidas para alta/edición de bins.
 */

export const RACK_PERCHA_MIN = 1;
export const RACK_PERCHA_MAX = 161;

export function emptyToNull(s: string): string | null {
  const t = s.trim();
  return t === "" ? null : t;
}

export function parsePositiveKg(raw: string): number | null {
  const n = Number(raw.replace(",", ".").trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

/** Para edición: vacío = pendiente (null); si hay valor, entero o decimal >= 0. */
export function parseKgRemaining(
  raw: string
):
  | { ok: true; value: number | null }
  | { ok: false; message: string } {
  const t = raw.replace(",", ".").trim();
  if (t === "") return { ok: true, value: null };
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) {
    return { ok: false, message: "Kg: ingresá un número mayor o igual a 0, o dejá vacío si falta calibrar kg." };
  }
  return { ok: true, value: n };
}

// Número de calibre: coma o punto, valor estrictamente > 0
export function parseUserCaliberNumber(raw: string): number | null {
  const t = raw.replace(",", ".").trim();
  if (t === "") return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export function formatCaliberForStorage(n: number): string {
  return String(n);
}

/**
 * Percha vacía = sin ubicación. Si hay texto, entero 1..161.
 */
export function parseRackPerchaOptional(
  raw: string
):
  | { ok: true; value: string | null }
  | { ok: false; message: string } {
  const t = raw.trim();
  if (t === "") return { ok: true, value: null };
  if (!/^\d+$/.test(t)) {
    return {
      ok: false,
      message: `Percha: ingresá solo números enteros entre ${RACK_PERCHA_MIN} y ${RACK_PERCHA_MAX}.`,
    };
  }
  const n = parseInt(t, 10);
  if (n < RACK_PERCHA_MIN || n > RACK_PERCHA_MAX) {
    return {
      ok: false,
      message: `Percha: el número debe estar entre ${RACK_PERCHA_MIN} y ${RACK_PERCHA_MAX}.`,
    };
  }
  return { ok: true, value: String(n) };
}
