import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { newPublicId } from "../lib/id";
import {
  emptyToNull,
  parsePositiveKg,
  parseRackPerchaOptional,
  RACK_PERCHA_MAX,
  RACK_PERCHA_MIN,
} from "../lib/binFields";
import { BinEditDialog } from "../components/BinEditDialog";
import { BinLabelCard, type BinLabelData } from "../components/BinLabelCard";
import type {
  BinLotRow,
  CaliberCodeRow,
  ProducerRow,
} from "../lib/database.types";

type Producer = ProducerRow;

type BinLotWithProducer = BinLotRow & { producers: Producer | null };

type CaliberInputRow = {
  caliberCodeId: string;
  code: string;
  label: string;
  sort_order: number;
  kg: string;
  percha: string;
};

function emptyCaliberInputs(codes: CaliberCodeRow[]): CaliberInputRow[] {
  return codes.map((c) => ({
    caliberCodeId: c.id,
    code: c.code,
    label: c.label,
    sort_order: c.sort_order,
    kg: "",
    percha: "",
  }));
}

function binStatus(bin: BinLotRow): string {
  if (bin.kg_remaining == null) return "Pendiente kg";
  if (bin.kg_remaining <= 0) return "Agotado";
  return `${bin.kg_remaining} kg`;
}

export function Calibrado() {
  const [producers, setProducers] = useState<Producer[]>([]);
  const [producerId, setProducerId] = useState("");
  const [receptionDate, setReceptionDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [caliberRows, setCaliberRows] = useState<CaliberInputRow[]>([]);
  const [calibersLoading, setCalibersLoading] = useState(true);
  const [calibersErr, setCalibersErr] = useState<string | null>(null);

  const [lote, setLote] = useState("");

  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [labels, setLabels] = useState<BinLabelData[] | null>(null);

  const [history, setHistory] = useState<BinLotWithProducer[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyErr, setHistoryErr] = useState<string | null>(null);
  const [reprintLabel, setReprintLabel] = useState<BinLabelData | null>(null);
  const [rotatingId, setRotatingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<BinLotWithProducer | null>(null);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    const { data, error } = await supabase
      .from("bin_lots")
      .select("*, producers(*)")
      .order("created_at", { ascending: false });

    if (error) {
      setHistoryErr(error.message);
      setHistory([]);
    } else {
      setHistoryErr(null);
      setHistory((data as BinLotWithProducer[]) ?? []);
    }
    setHistoryLoading(false);
  }, []);

  const loadProducers = useCallback(async () => {
    const { data } = await supabase
      .from("producers")
      .select("*")
      .order("name");
    setProducers(data ?? []);
    if (data?.length && !producerId) setProducerId(data[0].id);
  }, [producerId]);

  const loadCalibers = useCallback(async () => {
    setCalibersLoading(true);
    const { data, error } = await supabase
      .from("caliber_codes")
      .select("*")
      .eq("active", true)
      .order("sort_order");

    if (error) {
      setCalibersErr(error.message);
      setCaliberRows([]);
    } else {
      setCalibersErr(null);
      const codes = (data as CaliberCodeRow[]) ?? [];
      setCaliberRows(emptyCaliberInputs(codes));
    }
    setCalibersLoading(false);
  }, []);

  useEffect(() => {
    void loadProducers();
  }, [loadProducers]);

  useEffect(() => {
    void loadCalibers();
  }, [loadCalibers]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const producerName = useMemo(() => {
    const p = producers.find((x) => x.id === producerId);
    return p?.name ?? "";
  }, [producers, producerId]);

  const baseMeta = useMemo(() => ({ lote: emptyToNull(lote) }), [lote]);

  function labelFromMeta(
    publicId: string,
    caliberText: string,
    kg: number,
    percha: string | null
  ): BinLabelData {
    return {
      publicId,
      kg,
      producerName,
      receptionDate,
      caliber: caliberText,
      lote: baseMeta.lote,
      rackPercha: percha,
    };
  }

  function rowToLabel(row: BinLotWithProducer): BinLabelData {
    const kgr = row.kg_remaining;
    return {
      publicId: row.public_id,
      kg: kgr != null && kgr > 0 ? Number(kgr) : null,
      producerName: row.producers?.name ?? "—",
      receptionDate: row.reception_date,
      caliber: row.caliber,
      lote: row.lote,
      rackPercha: row.rack_percha ?? null,
    };
  }

  function openReprint(row: BinLotWithProducer) {
    setReprintLabel(rowToLabel(row));
    setLabels(null);
    requestAnimationFrame(() => {
      document.getElementById("reprint-preview")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  async function rotatePublicId(row: BinLotWithProducer) {
    if (row.kg_remaining != null) return;
    if (
      !globalThis.confirm(
        "Se asignará un nuevo código al bin. La etiqueta impresa antigua dejará de ser válida. ¿Continuar?"
      )
    ) {
      return;
    }
    setErr(null);
    setHistoryErr(null);
    setRotatingId(row.id);
    const nextId = newPublicId();
    const { error } = await supabase
      .from("bin_lots")
      .update({ public_id: nextId })
      .eq("id", row.id);

    setRotatingId(null);
    if (error) {
      setHistoryErr(error.message);
      return;
    }
    await loadHistory();
    const updated = { ...row, public_id: nextId };
    setReprintLabel(rowToLabel(updated));
  }

  function updateCaliberRow(
    caliberCodeId: string,
    patch: Partial<Pick<CaliberInputRow, "kg" | "percha">>
  ) {
    setCaliberRows((rows) =>
      rows.map((r) =>
        r.caliberCodeId === caliberCodeId ? { ...r, ...patch } : r
      )
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!producerId) {
      setErr("Selecciona un productor");
      return;
    }
    if (caliberRows.length === 0) {
      setErr("No hay calibres cargados en el maestro.");
      return;
    }

    const nowIso = new Date().toISOString();
    const inserts: Array<{
      public_id: string;
      producer_id: string;
      reception_date: string;
      caliber: string;
      caliber_code_id: string;
      kg_remaining: number;
      calibrated_at: string;
      lote: string | null;
      rack_percha: string | null;
    }> = [];
    const nextLabels: BinLabelData[] = [];

    for (const r of caliberRows) {
      const kg = parsePositiveKg(r.kg);
      if (kg == null) continue;

      const perRes = parseRackPerchaOptional(r.percha);
      if (!perRes.ok) {
        setErr(`${r.label}: ${perRes.message}`);
        return;
      }
      const rp = perRes.value;
      const public_id = newPublicId();
      inserts.push({
        public_id,
        producer_id: producerId,
        reception_date: receptionDate,
        caliber: r.code,
        caliber_code_id: r.caliberCodeId,
        kg_remaining: kg,
        calibrated_at: nowIso,
        ...baseMeta,
        rack_percha: rp,
      });
      nextLabels.push(labelFromMeta(public_id, r.code, kg, rp));
    }

    if (inserts.length === 0) {
      setErr("Ingresá kg en al menos un calibre (los demás se omiten).");
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("bin_lots").insert(inserts);
    setLoading(false);
    if (error) {
      setErr(error.message);
      return;
    }

    setReprintLabel(null);
    setLabels(nextLabels);
    setCaliberRows((rows) =>
      rows.map((r) => ({ ...r, kg: "", percha: "" }))
    );
    void loadHistory();
  }

  function printLabels() {
    window.print();
  }

  function resetFlow() {
    setLabels(null);
    setReprintLabel(null);
    setCaliberRows((rows) =>
      rows.map((r) => ({ ...r, kg: "", percha: "" }))
    );
    setLote("");
    setErr(null);
  }

  return (
    <div className="space-y-10">
      <div className="no-print space-y-2">
        <h2 className="text-xl font-bold text-zinc-900">Calibrado</h2>
        <p className="text-sm text-zinc-600">
          Completá <strong>kg y percha</strong> solo en los calibres que correspondan:
          se crea <strong>un bin por calibre con kg</strong>. Los calibres sin kg no se
          guardan. El <strong>QR</strong> lleva calibre, productor, fecha, id y kg.
        </p>
      </div>

      <form
        onSubmit={submit}
        className="no-print max-w-4xl space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
      >
        <div>
          <label className="block text-xs font-medium text-zinc-500">
            Productor
          </label>
          <select
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            value={producerId}
            onChange={(e) => setProducerId(e.target.value)}
          >
            {producers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-500">
            Fecha pesaje
          </label>
          <input
            type="date"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            value={receptionDate}
            onChange={(e) => setReceptionDate(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-500">
            Lote
          </label>
          <input
            className="mt-1 w-full max-w-md rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            value={lote}
            onChange={(e) => setLote(e.target.value)}
            placeholder="Opcional"
          />
        </div>

        <div className="space-y-4">
          <p className="text-xs text-zinc-600">
            Todos los calibres del maestro aparecen abajo.{" "}
            <strong>Percha</strong> opcional: entero {RACK_PERCHA_MIN} a{" "}
            {RACK_PERCHA_MAX}.
          </p>

          {calibersErr && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
              {calibersErr}
            </p>
          )}

          {calibersLoading ? (
            <p className="text-sm text-zinc-500">Cargando calibres…</p>
          ) : caliberRows.length === 0 ? (
            <p className="text-sm text-amber-800">
              No hay calibres activos en el maestro. Revisá la tabla{" "}
              <code className="text-xs">caliber_codes</code> en Supabase.
            </p>
          ) : (
            <fieldset className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4">
              <legend className="px-1 text-sm font-medium text-zinc-700">
                Calibres, kg y percha
              </legend>
              <div className="overflow-x-auto rounded-lg border border-zinc-200/90 bg-white">
                <table className="w-full min-w-[420px] text-sm">
                  <thead className="bg-zinc-50 text-xs font-semibold uppercase text-zinc-500">
                    <tr>
                      <th className="px-3 py-2 text-left">Calibre</th>
                      <th className="w-[6.5rem] px-3 py-2 text-right">Kg</th>
                      <th className="w-[4.5rem] px-3 py-2 text-right">Percha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {caliberRows.map((row) => (
                      <tr key={row.caliberCodeId}>
                        <td className="px-3 py-2 font-medium text-zinc-900">
                          {row.label}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            inputMode="decimal"
                            autoComplete="off"
                            placeholder="—"
                            aria-label={`Kg calibre ${row.label}`}
                            className="w-full rounded-md border border-zinc-300 px-2 py-1.5 text-right text-sm tabular-nums"
                            value={row.kg}
                            onChange={(e) =>
                              updateCaliberRow(row.caliberCodeId, {
                                kg: e.target.value,
                              })
                            }
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            inputMode="numeric"
                            autoComplete="off"
                            title={`Percha opcional: entero ${RACK_PERCHA_MIN} a ${RACK_PERCHA_MAX}`}
                            placeholder="—"
                            aria-label={`Percha calibre ${row.label}`}
                            className="w-full rounded-md border border-zinc-300 px-2 py-1.5 text-right text-sm tabular-nums"
                            value={row.percha}
                            onChange={(e) => {
                              const v = e.target.value
                                .replace(/\D/g, "")
                                .slice(0, 3);
                              updateCaliberRow(row.caliberCodeId, {
                                percha: v,
                              });
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </fieldset>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || calibersLoading || caliberRows.length === 0}
          className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
        >
          {loading ? "Guardando…" : "Guardar calibres e imprimir"}
        </button>
      </form>

      {err && (
        <p className="no-print rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {err}
        </p>
      )}

      <section className="no-print space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="text-lg font-bold text-zinc-900">
              Calibrados registrados
            </h3>
            <p className="text-sm text-zinc-600">
              Más nuevos primero. Podés editar datos, reimprimir o regenerar el QR
              si aplica.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadHistory()}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-800 hover:bg-zinc-100"
          >
            Actualizar lista
          </button>
        </div>

        {historyErr && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
            {historyErr}
          </p>
        )}

        {historyLoading ? (
          <p className="text-sm text-zinc-500">Cargando historial…</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-zinc-50 text-xs font-semibold uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Registro</th>
                  <th className="px-4 py-3">Fecha pesaje</th>
                  <th className="px-4 py-3">Productor</th>
                  <th className="px-4 py-3">Lote</th>
                  <th className="px-4 py-3">Percha</th>
                  <th className="px-4 py-3">Calibre</th>
                  <th className="px-4 py-3">public_id</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {history.map((row) => (
                  <tr key={row.id} className="hover:bg-zinc-50/80">
                    <td className="px-4 py-3 text-zinc-700 whitespace-nowrap">
                      {new Date(row.created_at).toLocaleString("es-CL")}
                    </td>
                    <td className="px-4 py-3 text-zinc-700 whitespace-nowrap">
                      {row.reception_date}
                    </td>
                    <td className="px-4 py-3 font-medium text-zinc-900">
                      {row.producers?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {row.lote ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-600 whitespace-nowrap">
                      {row.rack_percha ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-700">{row.caliber}</td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-600">
                      {row.public_id}
                    </td>
                    <td className="px-4 py-3 text-zinc-700">
                      {binStatus(row)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditing(row)}
                          className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-100"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => openReprint(row)}
                          className="rounded-lg bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
                        >
                          Reimprimir
                        </button>
                        {row.kg_remaining == null && (
                          <button
                            type="button"
                            disabled={rotatingId === row.id}
                            onClick={() => void rotatePublicId(row)}
                            className="rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                          >
                            {rotatingId === row.id ? "…" : "Nuevo código"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {history.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-zinc-500">
                No hay calibrados aún.
              </p>
            )}
          </div>
        )}
      </section>

      {(labels && labels.length > 0) || reprintLabel ? (
        <div id="reprint-preview" className="space-y-4 scroll-mt-8">
          <div className="no-print flex flex-wrap gap-2">
            <button
              type="button"
              onClick={printLabels}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Imprimir
              {labels && labels.length > 1
                ? ` (${labels.length} etiquetas)`
                : ""}
            </button>
            <button
              type="button"
              onClick={resetFlow}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
            >
              Cerrar vista
            </button>
          </div>

          <div className="space-y-6 print:space-y-0">
            {labels && labels.length > 0
              ? labels.map((label) => (
                  <BinLabelCard key={label.publicId} label={label} />
                ))
              : reprintLabel && <BinLabelCard label={reprintLabel} />}
          </div>
        </div>
      ) : null}

      <BinEditDialog
        open={editing != null}
        bin={editing}
        producers={producers}
        onClose={() => setEditing(null)}
        onSaved={() => void loadHistory()}
      />
    </div>
  );
}
