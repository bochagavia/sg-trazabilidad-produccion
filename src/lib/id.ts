/** URL-safe opaque id (16 hex). El QR incluye JSON (calibre, productor, fecha, i, k) vía `buildBinQrPayload`. */
export function newPublicId(): string {
  const u = globalThis.crypto.randomUUID().replace(/-/g, "");
  return u.slice(0, 16);
}
