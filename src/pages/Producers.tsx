import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { ProducerRow } from "../lib/database.types";

type Producer = ProducerRow;

export function Producers() {
  const [rows, setRows] = useState<Producer[]>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("producers")
      .select("*")
      .order("name");
    if (error) setErr(error.message);
    else {
      setErr(null);
      setRows(data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!name.trim()) {
      setErr("Nombre requerido");
      return;
    }
    const { error } = await supabase.from("producers").insert({
      name: name.trim(),
      code: code.trim() || null,
    });
    if (error) setErr(error.message);
    else {
      setName("");
      setCode("");
      void load();
    }
  }

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-bold text-zinc-900">Productores</h2>

      <form
        onSubmit={add}
        className="no-print flex max-w-xl flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:flex-row sm:flex-wrap sm:items-end"
      >
        <div className="flex-1 min-w-[12rem]">
          <label className="block text-xs font-medium text-zinc-500">
            Nombre
          </label>
          <input
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Agrícola Los Cerezos"
          />
        </div>
        <div className="w-full min-w-[8rem] sm:w-40">
          <label className="block text-xs font-medium text-zinc-500">
            COD PROD (opcional)
          </label>
          <input
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="LC-01"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          Agregar
        </button>
      </form>

      {err && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {err}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-zinc-500">Cargando…</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs font-semibold uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">COD PROD</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-50/80">
                  <td className="px-4 py-3 font-medium text-zinc-900">
                    {p.name}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{p.code ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-zinc-500">
              No hay productores. Crea el primero arriba.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
