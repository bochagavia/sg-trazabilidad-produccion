import { useState } from "react";
import { supabase } from "../lib/supabase";
import { parsePublicIdFromScan } from "../lib/qrPublicId";

export function BinUso() {
  const [raw, setRaw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(null);
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
      `Bin marcado como usado. Hora registrada: ${usedAt}. El saldo quedó en 0 kg.`
    );
    setRaw("");
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-zinc-900">Marcar bin usado</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Escaneá o pegá el <strong>contenido del QR</strong> (o solo el{" "}
          <code className="rounded bg-zinc-100 px-1">public_id</code>): se
          guarda la <strong>fecha y hora en el servidor</strong> y se descuenta{" "}
          <strong>todo el saldo</strong> de ese bin (baja entera), igual que con
          el flujo de uso por escaneo.
        </p>
      </div>

      <form
        onSubmit={submit}
        className="max-w-xl space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
      >
        <div>
          <label className="block text-xs font-medium text-zinc-500">
            QR o public_id
          </label>
          <textarea
            className="mt-1 w-full min-h-[88px] rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder='{"c":"32","n":"...","d":"...","i":"public_id_..."} o solo el id'
            autoComplete="off"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
        >
          {loading ? "Registrando…" : "Registrar uso del bin"}
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
