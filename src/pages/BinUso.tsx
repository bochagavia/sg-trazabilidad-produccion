import { useState } from "react";
import { supabase } from "../lib/supabase";
import { parsePublicIdFromScan } from "../lib/qrPublicId";

export function BinUso() {
  const [raw, setRaw] = useState("");
  const [op, setOp] = useState("");
  const [cliente, setCliente] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(null);

    const opVal = op.trim();
    const clienteVal = cliente.trim();
    if (!opVal) {
      setErr("Ingresá el número de OP.");
      return;
    }
    if (!clienteVal) {
      setErr("Ingresá el cliente.");
      return;
    }

    const t = raw.trim();
    if (!t) {
      setErr("Pegá el QR o el public_id del bin.");
      return;
    }
    const publicId = parsePublicIdFromScan(t);
    if (!publicId) {
      setErr(
        "No se pudo leer el public_id (campo i en el JSON). Verificá el escaneo.",
      );
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.rpc("register_bin_use", {
      p_public_id: publicId,
      p_op_number: opVal,
      p_client_name: clienteVal,
    });
    setLoading(false);

    if (error) {
      setErr(error.message);
      return;
    }

    const usedAt =
      typeof data === "string"
        ? new Date(data).toLocaleString("es-CL", {
            dateStyle: "medium",
            timeStyle: "medium",
          })
        : String(data);

    setOk(
      `Bin ingresado al proceso. OP ${opVal} · ${clienteVal}. Hora: ${usedAt}. Saldo en 0 kg.`
    );
    setRaw("");
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-zinc-900">Ingreso a proceso</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Escaneá el <strong>QR del bin</strong>, indicá <strong>OP</strong> y{" "}
          <strong>cliente</strong>, y confirmá. Se registra la hora en el servidor
          y se descuenta <strong>todo el saldo</strong> del bin.
        </p>
      </div>

      <form
        onSubmit={submit}
        className="max-w-xl space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-zinc-500">
              OP <span className="text-red-600">*</span>
            </label>
            <input
              required
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              value={op}
              onChange={(e) => setOp(e.target.value)}
              placeholder="Ej. 2401"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500">
              Cliente <span className="text-red-600">*</span>
            </label>
            <input
              required
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
              placeholder="Nombre cliente"
              autoComplete="off"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-500">
            QR o public_id <span className="text-red-600">*</span>
          </label>
          <textarea
            required
            className="mt-1 w-full min-h-[88px] rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder='{"c":"30/38","n":"...","d":"...","i":"public_id_..."} o solo el id'
            autoComplete="off"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
        >
          {loading ? "Registrando…" : "Registrar ingreso a proceso"}
        </button>
      </form>

      {err && (
        <p className="max-w-xl rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {err}
        </p>
      )}

      {ok && (
        <p className="max-w-xl rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {ok}
        </p>
      )}
    </div>
  );
}
