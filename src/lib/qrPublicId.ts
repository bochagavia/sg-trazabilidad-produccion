/**
 * Contenido del QR: JSON UTF-8 con claves cortas (sin lote en el código).
 * Claves: c=calibre, n=productor, d=fecha pesaje, i=public_id, k=kg (opcional).
 */

export type QrBinPayload = {
  publicId: string;
  /** Calibre — lo más relevante en planta */
  caliber: string;
  producerName: string;
  receptionDate: string;
  kg?: number | null;
};

const LEGACY_SEP = "|";

function tryPublicIdFromJson(raw: string): string | null {
  const t = raw.trim();
  if (!t.startsWith("{")) return null;
  try {
    const o = JSON.parse(t) as Record<string, unknown>;
    const i = o.i;
    if (typeof i === "string" && i.length > 0) return i;
  } catch {
    /* not JSON */
  }
  return null;
}

/**
 * Construye el texto a codificar en el QR: compacto, calibre primero en el JSON.
 */
export function buildBinQrPayload(data: QrBinPayload): string {
  const o: Record<string, string | number> = {
    c: data.caliber,
    n: data.producerName,
    d: data.receptionDate,
    i: data.publicId,
  };
  if (data.kg != null && Number.isFinite(data.kg) && data.kg > 0) {
    o.k = Math.round(data.kg * 1000) / 1000;
  }
  return JSON.stringify(o);
}

/**
 * De lo escaneado/pedido extrae el `public_id` para consultas a Supabase.
 * Soporta: JSON (actual), `publicId|kg` (legado), o solo public_id.
 */
export function parsePublicIdFromScan(raw: string): string {
  const t = raw.trim();
  const fromJson = tryPublicIdFromJson(t);
  if (fromJson) return fromJson;
  if (t.startsWith("{")) return "";
  const j = t.indexOf(LEGACY_SEP);
  if (j > 0) return t.slice(0, j);
  return t;
}

/** @deprecated Usar `buildBinQrPayload` con el objeto completo. */
export function buildQrPayload(
  publicId: string,
  kg: number | null | undefined
): string {
  if (kg == null || !Number.isFinite(kg) || kg <= 0) return publicId;
  return `${publicId}${LEGACY_SEP}${kg.toFixed(3)}`;
}
