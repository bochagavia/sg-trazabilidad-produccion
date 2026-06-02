import { NavLink, Outlet } from "react-router-dom";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? "bg-brand-700 text-white"
      : "text-zinc-700 hover:bg-zinc-200/80"
  }`;

export function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="no-print border-b border-zinc-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
              SG · Ciruela
            </p>
            <h1 className="text-lg font-bold text-zinc-900">
              Trazabilidad materia prima
            </h1>
          </div>
          <nav className="flex flex-wrap gap-1">
            <NavLink to="/" end className={linkClass}>
              Calibrado
            </NavLink>
            <NavLink to="/productores" className={linkClass}>
              Productores
            </NavLink>
            <NavLink to="/reportes" className={linkClass}>
              Reportes
            </NavLink>
            <NavLink to="/marcar-uso" className={linkClass}>
              Ingreso proceso
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
