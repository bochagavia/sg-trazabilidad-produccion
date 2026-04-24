import { Link } from "react-router-dom";

const cards = [
  {
    to: "/calibrado",
    title: "Calibrado",
    desc: "Un bin por registro: kg, percha, QR listo para imprimir.",
  },
  {
    to: "/reportes",
    title: "Reportes",
    desc: "Fruta disponible (detalle y Excel), usos y totales en tiempo casi real.",
  },
  {
    to: "/marcar-uso",
    title: "Marcar usado",
    desc: "Escanear el QR: baja el bin entero con fecha y hora.",
  },
];

export function Home() {
  return (
    <div className="space-y-8">
      <p className="max-w-2xl text-zinc-600">
        El calibrado carga datos y kg, y genera el QR listo para imprimir.
        Los reportes unifican inventario exportable y últimos usos de bins.
      </p>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => (
          <li key={c.to}>
            <Link
              to={c.to}
              className="block rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-brand-600/40 hover:shadow-md"
            >
              <h2 className="font-semibold text-zinc-900">{c.title}</h2>
              <p className="mt-2 text-sm text-zinc-600">{c.desc}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
