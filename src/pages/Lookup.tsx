import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { parsePublicIdFromScan } from "../lib/qrPublicId";
import { BinEditDialog } from "../components/BinEditDialog";
import type { BinLotRow, BinUseRow, ProducerRow } from "../lib/database.types";

type BinLot = BinLotRow;
type Producer = ProducerRow;

type BinDetail = BinLot & {
  producers: Producer | null;
  bin_uses: Pick<BinUseRow, "id" | "used_at" | "kg">[];
};

const binDetailSelect = `
  *,
  producers (*),
  bin_uses (
    id,
    used_at,
    kg
  )
`;

export function Lookup() {
  const [q, setQ] = useState("");
  const [row, setRow] = useState<BinDetail | null>(null);
  const [searched, setSearched] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [producers, setProducers] = useState<Producer[]>([]);
  const [editing, setEditing] = useState(false);

  const loadProducers = useCallback(async () => {
    const { data } = await supabase
      .from("producers")
      .select("*")
      .order("name");
    setProducers(data ?? []);
  }, []);

  useEffect(() => {
    void loadProducers();
  }, [loadProducers]);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const raw = q.trim();
    if (!raw) {
      setErr("Ingresa el public_id");
      return;
    }
    const id = parsePublicIdFromScan(raw);
    if (!id) {
      setErr("No se pudo leer el public_id (campo i) del QR. Verificá el escaneo.");
      return;
    }
    setLoading(true);
    setSearched(false);
    const { data, error } = await supabase
      .from("bin_lots")
      .select(binDetailSelect)
      .eq("public_id", id)
      .maybeSingle();

    setLoading(false);
    if (error) {
      setErr(error.message);
      setRow(null);
      setSearched(true);
      return;
    }
    setSearched(true);
    setRow(data as BinDetail | null);
  }

  async function refreshCurrentBin() {
    if (!row) return;
    const { data, error } = await supabase
      .from("bin_lots")
      .select(binDetailSelect)
      .eq("public_id", row.public_id)
      .maybeSingle();
    if (error) {
      setErr(error.message);
      return;
    }
    setRow(data as BinDetail | null);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-zinc-900">Consulta por QR</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Pegá el QR (JSON con calibre, productor, fecha, id, kg; sin lote en el
          código); la búsqueda usa <code className="rounded bg-zinc-100 px-1">i</code>{" "}
          (public_id). También acepta solo el id o el legado{" "}
          <code className="rounded bg-zinc-100 px-1">id|kg</code>.
        </p>
      </div>

      <form
        onSubmit={search}
        className="flex max-w-xl flex-col gap-3 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label className="block text-xs font-medium text-zinc-500">
            Contenido del QR
          </label>
          <input
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="JSON del QR o solo public_id"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
        >
          {loading ? "Buscando…" : "Buscar"}
        </button>
      </form>

      {err && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {err}
        </p>
      )}

      {searched && row === null && !err && (
        <p className="text-sm text-zinc-600">No se encontró ese public_id.</p>
      )}

      {row && (
        <div className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold text-zinc-900">Bin / lote</h3>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-100"
            >
              Editar
            </button>
          </div>
          <div>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-zinc-500">Productor</dt>
                <dd className="font-medium text-zinc-900">
                  {row.producers?.name ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Fecha pesaje</dt>
                <dd className="text-zinc-800">{row.reception_date}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Calibre (UL°)</dt>
                <dd className="text-zinc-800">{row.caliber}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Lote</dt>
                <dd className="text-zinc-800">{row.lote ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Percha</dt>
                <dd className="text-zinc-800">{row.rack_percha ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Kg restantes (app)</dt>
                <dd className="font-medium text-brand-800">
                  {row.kg_remaining == null
                    ? "Pendiente kg"
                    : row.kg_remaining}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-zinc-500">public_id</dt>
                <dd className="font-mono text-xs break-all text-zinc-800">
                  {row.public_id}
                </dd>
              </div>
            </dl>
          </div>

          <div>
            <h3 className="font-semibold text-zinc-900">Usos (fecha y hora)</h3>
            <ul className="mt-3 divide-y divide-zinc-100 text-sm">
              {(row.bin_uses ?? []).length === 0 && (
                <li className="py-2 text-zinc-500">Sin usos registrados.</li>
              )}
              {[...(row.bin_uses ?? [])]
                .sort(
                  (a, b) =>
                    new Date(b.used_at).getTime() -
                    new Date(a.used_at).getTime()
                )
                .map((u) => (
                <li
                  key={u.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2"
                >
                  <span className="text-zinc-800">
                    {new Date(u.used_at).toLocaleString("es-CL", {
                      dateStyle: "medium",
                      timeStyle: "medium",
                    })}
                  </span>
                  <span className="text-zinc-600">{u.kg} kg</span>
                </li>
                ))}
            </ul>
          </div>
        </div>
      )}

      <BinEditDialog
        open={editing && row != null}
        bin={editing && row != null ? row : null}
        producers={producers}
        onClose={() => setEditing(false)}
        onSaved={() => void refreshCurrentBin()}
      />
    </div>
  );
}

