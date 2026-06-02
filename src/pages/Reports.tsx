import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import type { BinLotRow, BinUseRow, ProducerRow } from "../lib/database.types";

type BinLot = BinLotRow;
type Producer = ProducerRow;

type StockRow = BinLot & { producers: Producer | null };
type UseFeed = BinUseRow & {
  bin_lots: (BinLot & { producers: Producer | null }) | null;
};

function fmtDateTime(iso: string | null | undefined): string {
  if (iso == null || iso === "") return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString("es-CL", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

const EXCEL_HEADER = [
  "Productor",
  "Fecha pesaje",
  "Lote",
  "Percha",
  "Calibre (UL°)",
  "public_id",
  "Kg restantes",
  "Calibrado (fecha/h)",
  "Alta registro (fecha/h)",
] as const;

/** Columnas: uso + detalle del bin (estado del bin vinculado al momento de exportar). */
const USOS_EXCEL_HEADER = [
  "Fecha y hora de uso",
  "OP",
  "Cliente",
  "Kg retirados (registro de uso)",
  "ID registro de uso (UUID)",
  "Productor",
  "Fecha pesaje (bin)",
  "Lote",
  "Percha",
  "Calibre (UL°)",
  "public_id",
  "Kg restantes actuales (bin)",
  "Calibrado (bin, fecha/h)",
  "Alta registro bin (fecha/h)",
  "ID interno bin (UUID)",
] as const;

const USOS_PAGE = 1000;
const USOS_MAX_ROWS = 100_000;

export function Reports() {
  const [stock, setStock] = useState<StockRow[]>([]);
  const [stockLoading, setStockLoading] = useState(true);
  const [feed, setFeed] = useState<UseFeed[]>([]);
  const [usosExporting, setUsosExporting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const loadStock = useCallback(async () => {
    setStockLoading(true);
    const { data, error } = await supabase
      .from("bin_lots")
      .select("*, producers(*)")
      .not("kg_remaining", "is", null)
      .gt("kg_remaining", 0)
      .order("reception_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      setErr(error.message);
      setStock([]);
    } else {
      setErr(null);
      setStock((data as StockRow[]) ?? []);
    }
    setStockLoading(false);
  }, []);

  const loadFeed = useCallback(async () => {
    const { data, error } = await supabase
      .from("bin_uses")
      .select(
        `
        *,
        bin_lots ( *, producers (*) )
      `
      )
      .order("used_at", { ascending: false })
      .limit(50);

    if (error) setErr(error.message);
    else setFeed((data as UseFeed[]) ?? []);
  }, []);

  const loadAll = useCallback(async () => {
    await Promise.all([loadStock(), loadFeed()]);
  }, [loadStock, loadFeed]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    const ch = supabase
      .channel("reports-unified")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bin_lots" },
        () => void loadStock()
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "bin_uses" },
        () => void loadFeed()
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(ch);
    };
  }, [loadStock, loadFeed]);

  const totalKg = useMemo(
    () => stock.reduce((s, r) => s + Number(r.kg_remaining ?? 0), 0),
    [stock]
  );

  async function exportExcel() {
    const { downloadExcel } = await import("../lib/excelExport");
    const name = `reportes-fruta-disponible-${new Date().toISOString().slice(0, 10)}.xlsx`;
    const dataRows: (string | number)[][] = stock.map((b) => {
      const kg =
        b.kg_remaining != null ? Number(b.kg_remaining) : "";
      return [
        b.producers?.name ?? "",
        b.reception_date ?? "",
        b.lote ?? "",
        b.rack_percha ?? "",
        b.caliber ?? "",
        b.public_id,
        kg,
        fmtDateTime(b.calibrated_at),
        fmtDateTime(b.created_at),
      ];
    });
    downloadExcel(name, "Fruta disponible", [...EXCEL_HEADER], dataRows);
  }

  async function exportUsosExcel() {
    setUsosExporting(true);
    setErr(null);
    const { downloadExcel } = await import("../lib/excelExport");
    const usos: UseFeed[] = [];
    let from = 0;
    for (;;) {
      const { data, error } = await supabase
        .from("bin_uses")
        .select(
          `
        *,
        bin_lots ( *, producers (*) )
      `
        )
        .order("used_at", { ascending: false })
        .range(from, from + USOS_PAGE - 1);
      if (error) {
        setErr(error.message);
        setUsosExporting(false);
        return;
      }
      const chunk = (data as UseFeed[]) ?? [];
      usos.push(...chunk);
      if (chunk.length < USOS_PAGE) break;
      from += USOS_PAGE;
      if (from >= USOS_MAX_ROWS) break;
    }

    const name = `reportes-bines-usados-${new Date().toISOString().slice(0, 10)}.xlsx`;
    const dataRows: (string | number)[][] = usos.map((u) => {
      const b = u.bin_lots;
      const kgRem =
        b?.kg_remaining != null ? Number(b.kg_remaining) : "";
      const kgUso = u.kg != null ? Number(u.kg) : "";
      return [
        fmtDateTime(u.used_at),
        u.op_number ?? "",
        u.client_name ?? "",
        kgUso,
        u.id,
        b?.producers?.name ?? "",
        b?.reception_date ?? "",
        b?.lote ?? "",
        b?.rack_percha ?? "",
        b?.caliber ?? "",
        b?.public_id ?? "",
        kgRem,
        b?.calibrated_at ? fmtDateTime(b.calibrated_at) : "",
        b?.created_at ? fmtDateTime(b.created_at) : "",
        b?.id ?? "",
      ];
    });
    downloadExcel(name, "Bines usados", [...USOS_EXCEL_HEADER], dataRows);
    setUsosExporting(false);
  }

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-xl font-bold text-zinc-900">Reportes</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Fruta con saldo (kg &gt; 0) en detalle, exportable a Excel; y usos de
          bin (últimos 50 en pantalla, export con todos los registros y detalle
          del bin). Los datos se actualizan con la actividad en planta.
        </p>
      </div>

      {err && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {err}
        </p>
      )}

      <section className="space-y-3">
        <h3 className="font-semibold text-zinc-900">Fruta disponible (detalle)</h3>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-zinc-700">
            {stockLoading ? (
              <span className="text-zinc-500">Cargando inventario…</span>
            ) : (
              <>
                <span className="font-semibold text-zinc-900">
                  {stock.length}
                </span>{" "}
                bins con fruta ·{" "}
                <span className="font-semibold text-brand-800">
                  {totalKg.toLocaleString("es-CL", { maximumFractionDigits: 3 })}{" "}
                  kg
                </span>{" "}
                totales
              </>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void loadStock()}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-800 hover:bg-zinc-100"
            >
              Actualizar
            </button>
            <button
              type="button"
              onClick={exportExcel}
              disabled={stock.length === 0}
              className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Exportar Excel
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="bg-zinc-50 text-xs font-semibold uppercase text-zinc-500">
              <tr>
                <th className="px-3 py-3">Productor</th>
                <th className="px-3 py-3">Fecha pesaje</th>
                <th className="px-3 py-3">Lote</th>
                <th className="px-3 py-3">Percha</th>
                <th className="px-3 py-3">Calibre (UL°)</th>
                <th className="px-3 py-3">public_id</th>
                <th className="px-3 py-3 text-right">Kg</th>
                <th className="px-3 py-3">Calibrado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {stock.map((b) => (
                <tr key={b.id} className="hover:bg-zinc-50/80">
                  <td className="px-3 py-2.5 font-medium text-zinc-900">
                    {b.producers?.name ?? "—"}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-zinc-700">
                    {b.reception_date}
                  </td>
                  <td className="px-3 py-2.5 text-zinc-600">{b.lote ?? "—"}</td>
                  <td className="px-3 py-2.5 text-zinc-600">
                    {b.rack_percha ?? "—"}
                  </td>
                  <td className="px-3 py-2.5 text-zinc-700">{b.caliber}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-zinc-600">
                    {b.public_id}
                  </td>
                  <td className="px-3 py-2.5 text-right font-medium text-brand-800 tabular-nums">
                    {b.kg_remaining}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-zinc-600">
                    {b.calibrated_at ? fmtDateTime(b.calibrated_at) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!stockLoading && stock.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-zinc-500">
              Sin fruta con saldo disponible (o nada calibrado aún).
            </p>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h3 className="font-semibold text-zinc-900">
            Usos (últimos en planta, por registro)
          </h3>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void loadFeed()}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-800 hover:bg-zinc-100"
            >
              Actualizar lista
            </button>
            <button
              type="button"
              onClick={exportUsosExcel}
              disabled={usosExporting}
              className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-wait disabled:opacity-60"
            >
              {usosExporting
                ? "Generando…"
                : "Exportar usos a Excel (detalle completo)"}
            </button>
          </div>
        </div>
        <p className="text-xs text-zinc-500">
          En pantalla: últimos 50. El Excel incluye <strong>todos</strong> los
          usos (hasta 100.000 filas) con OP, cliente, productor, lote, percha,
          calibre, ids y fechas del bin.
        </p>
        <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-zinc-50 text-xs font-semibold uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-3">Fecha y hora de uso</th>
                <th className="px-4 py-3">OP</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Productor</th>
                <th className="px-4 py-3">public_id</th>
                <th className="px-4 py-3">Kg</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {feed.map((u) => (
                <tr key={u.id} className="hover:bg-zinc-50/80">
                  <td className="px-4 py-3 text-zinc-800 whitespace-nowrap">
                    {new Date(u.used_at).toLocaleString("es-CL", {
                      dateStyle: "medium",
                      timeStyle: "medium",
                    })}
                  </td>
                  <td className="px-4 py-3 font-medium text-zinc-900 whitespace-nowrap">
                    {u.op_number ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-800">
                    {u.client_name ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-medium text-zinc-900">
                    {u.bin_lots?.producers?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-600">
                    {u.bin_lots?.public_id ?? "—"}
                  </td>
                  <td className="px-4 py-3">{u.kg}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {feed.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-zinc-500">
              Aún no hay usos registrados.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
