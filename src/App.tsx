import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Home } from "./pages/Home";
import { Producers } from "./pages/Producers";
import { Calibrado } from "./pages/Calibrado";
import { Reports } from "./pages/Reports";
import { BinUso } from "./pages/BinUso";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/productores" element={<Producers />} />
        <Route path="/calibrado" element={<Calibrado />} />
        <Route
          path="/recepcion"
          element={<Navigate to="/calibrado" replace />}
        />
        <Route path="/op" element={<Navigate to="/" replace />} />
        <Route path="/reportes" element={<Reports />} />
        <Route
          path="/reporteria"
          element={<Navigate to="/reportes" replace />}
        />
        <Route path="/marcar-uso" element={<BinUso />} />
        <Route
          path="/consulta"
          element={<Navigate to="/reportes" replace />}
        />
      </Route>
    </Routes>
  );
}
