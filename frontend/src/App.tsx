import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout/Layout";
import { Alerts } from "./pages/Alerts/Alerts";
import { Analytics } from "./pages/Analytics/Analytics";
import { Equipment } from "./pages/Equipment/Equipment";
import { Overview } from "./pages/Overview/Overview";
import { Reports } from "./pages/Reports/Reports";
import { Settings } from "./pages/Settings/Settings";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Overview />} />
          <Route path="/equipamentos" element={<Equipment />} />
          <Route path="/alertas" element={<Alerts />} />
          <Route path="/analises" element={<Analytics />} />
          <Route path="/relatorios" element={<Reports />} />
          <Route path="/configuracoes" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
