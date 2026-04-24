import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { BinLotRow, ProducerRow } from "../lib/database.types";
import {
  emptyToNull,
  formatCaliberForStorage,
  parseKgRemaining,
  parseRackPerchaOptional,
  parseUserCaliberNumber,
  RACK_PERCHA_MAX,
  RACK_PERCHA_MIN,
} from "../lib/binFields";

type Producer = ProducerRow;

type Bin = BinLotRow & { producers?: Producer | null };

type Props = {
  open: boolean;
  bin: Bin | null;
  producers: Producer[];
  onClose: () => void;
  onSaved: () => void;
};

function perchaInputValue(raw: string | null | undefined): string {
  if (raw == null || raw === "") return "";
  return String(raw).replace(/\D/g, "").slice(0, 3);
}

export function BinEditDialog({
  open,
  bin,
  producers,
  onClose,
  onSaved,
}: Props) {
  const [producerId, setProducerId] = useState("");
  const [receptionDate, setReceptionDate] = useState("");
  const [lote, setLote] = useState("");
  const [caliber, setCaliber] = useState("");
  const [kg, setKg] = useState("");
  const [percha, setPercha] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !bin) return;
    setProducerId(bin.producer_id);
    setReceptionDate((bin.reception_date ?? "").slice(0, 10));
    setLote(bin.lote ?? "");
    setCaliber(bin.caliber ?? "");
    setKg(bin.kg_remaining == null ? "" : String(bin.kg_remaining));
    setPercha(perchaInputValue(bin.rack_percha));
    setErr(null);
  }, [open, bin]);

  if (!open || !bin) return null;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const editingBin = bin;
    if (editingBin == null) return;
    setErr(null);
    if (!producerId) {
      setErr("Seleccioná un productor.");
      return;
    }
    const calNum = parseUserCaliberNumber(caliber);
    if (calNum == null) {
      setErr(
        "Ingresá un número de calibre mayor que 0 (podés usar coma o punto para decimales).",
      );
      return;
    }
    const kgRes = parseKgRemaining(kg);
    if (!kgRes.ok) {
      setErr(kgRes.message);
      return;
    }
    const perRes = parseRackPerchaOptional(percha);
    if (!perRes.ok) {
      setErr(perRes.message);
      return;
    }

    const nextKg = kgRes.value;
    const caliberText = formatCaliberForStorage(calNum);
    let nextCalibrated = editingBin.calibrated_at;
    if (nextKg == null) {
      nextCalibrated = null;
    } else if (editingBin.kg_remaining == null) {
      nextCalibrated = new Date().toISOString();
    }
    const binId = editingBin.id;

    setSaving(true);
    const { error } = await supabase
      .from("bin_lots")
      .update({
        producer_id: producerId,
        reception_date: receptionDate,
        caliber: caliberText,
        caliber_code_id: null,
        lote: emptyToNull(lote),
        rack_percha: perRes.value,
        kg_remaining: nextKg,
        calibrated_at: nextCalibrated,
      })
      .eq("id", binId);

    setSaving(false);
    if (error) {
      setErr(error.message);
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bin-edit-title"
      onClick={() => {
        if (!saving) onClose();
      }}
    >
      <div
        className="max-h-[min(90vh,720px)] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          id="bin-edit-title"
          className="text-lg font-bold text-zinc-900"
        >
          Editar bin
        </h3>
        <p className="mt-1 text-xs text-zinc-500">
          public_id:{" "}
          <span className="font-mono text-zinc-700">{bin.public_id}</span>{" "}
          (no se modifica aquí; usá &quot;Nuevo código&quot; en la lista si
          aplica).
        </p>

        <form onSubmit={save} className="mt-4 space-y-3">
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
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              value={lote}
              onChange={(e) => setLote(e.target.value)}
              placeholder="Opcional"
            />
          </div>
          <div className="flex flex-wrap items-end gap-2 rounded-lg border border-zinc-200 bg-zinc-50/80 p-3">
            <div className="min-w-0 flex-1 sm:max-w-[7rem]">
              <span className="text-xs font-medium text-zinc-500">
                Calibre (UL°)
              </span>
              <input
                type="text"
                inputMode="decimal"
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-right text-sm font-medium tabular-nums"
                value={caliber}
                onChange={(e) => setCaliber(e.target.value)}
              />
            </div>
            <div className="w-[6.5rem]">
              <span className="text-xs font-medium text-zinc-500">Kg</span>
              <input
                type="text"
                inputMode="decimal"
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-right text-sm tabular-nums"
                value={kg}
                onChange={(e) => setKg(e.target.value)}
                title="Vacío = pendiente de kg (sin calibrar cantidad)"
              />
              <p className="mt-0.5 text-[10px] text-zinc-500">
                Vacío = pendiente
              </p>
            </div>
            <div className="w-[4.5rem]">
              <span className="text-xs font-medium text-zinc-500">Percha</span>
              <input
                type="text"
                inputMode="numeric"
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-right text-sm tabular-nums"
                value={percha}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 3);
                  setPercha(v);
                }}
                title={`${RACK_PERCHA_MIN}–${RACK_PERCHA_MAX} o vacío`}
              />
            </div>
          </div>

          {err && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
              {err}
            </p>
          )}

          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:bg-zinc-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
            >
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
