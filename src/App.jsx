import { BrowserRouter, Routes, Route } from "react-router-dom";
import Timesheet from "./components/Timesheet.jsx";
import History from "./pages/History.jsx";
import InvoiceDetail from "./pages/InvoiceDetail.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Timesheet />} />
        <Route path="/history" element={<History />} />
        <Route path="/history/:invoiceNumber" element={<InvoiceDetail />} />
      </Routes>
    </BrowserRouter>
  );
}
