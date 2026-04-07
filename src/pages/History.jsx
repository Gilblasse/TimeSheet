import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listInvoices } from "../lib/invoiceApi.js";
import { formatInvoiceDate } from "../lib/invoice.js";

export default function History() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    listInvoices()
      .then((data) => setInvoices(data))
      .catch(() => setError("Could not load invoices from Google Sheets."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#f4f4f7", fontFamily: "'DM Sans', sans-serif", padding: "32px 16px" }}>
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        <div style={{ background: "#1a1a2e", borderRadius: 12, padding: "28px 36px", marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 600, color: "#fff" }}>Invoice History</div>
            <div style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "#8a8ab0", marginTop: 4 }}>SkyHorizon Group, LLC</div>
          </div>
          <Link to="/" style={{ color: "#6fcf97", fontSize: 10, textDecoration: "none", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            &larr; Back to Timesheet
          </Link>
        </div>

        <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 16px rgba(0,0,0,0.07)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.2fr 1.2fr 1fr", background: "#1a1a2e", padding: "12px 22px", gap: 16 }}>
            {["Invoice #", "Invoice Date", "Due Date", "Total Due"].map((h, i) => (
              <div key={h} style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "#aaaacc", fontWeight: 500, textAlign: i === 3 ? "right" : "left" }}>{h}</div>
            ))}
          </div>

          {loading && (
            <div style={{ padding: "8px 22px" }}>
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} style={{ display: "grid", gridTemplateColumns: "1.2fr 1.2fr 1.2fr 1fr", gap: 16, padding: "12px 0", borderBottom: idx < 3 ? "1px solid #f0f0f5" : "none" }}>
                  <div className="skeleton" style={{ height: 16 }} />
                  <div className="skeleton" style={{ height: 16 }} />
                  <div className="skeleton" style={{ height: 16 }} />
                  <div className="skeleton" style={{ height: 16, marginLeft: "auto", width: "60%" }} />
                </div>
              ))}
            </div>
          )}

          {!loading && error && (
            <div style={{ padding: "32px 22px", color: "#856404", background: "#fff3cd", fontSize: 13, textAlign: "center" }}>
              {error}
            </div>
          )}

          {!loading && !error && invoices.length === 0 && (
            <div style={{ padding: "48px 22px", color: "#8a8a9a", fontSize: 13, textAlign: "center" }}>
              No invoices yet. Submit a timesheet to generate your first invoice.
            </div>
          )}

          {!loading && !error && invoices.length > 0 && (
            <div>
              {invoices.map((inv, idx) => {
                const number = inv.invoice_number || inv.invoiceNumber;
                const invoiceDate = inv.invoice_date || inv.invoiceDate;
                const dueDate = inv.due_date || inv.dueDate;
                const totalDue = parseFloat(inv.total_due ?? inv.totalDue) || 0;
                return (
                  <Link
                    key={number || idx}
                    to={`/history/${number}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.2fr 1.2fr 1.2fr 1fr",
                      gap: 16,
                      padding: "16px 22px",
                      borderBottom: idx < invoices.length - 1 ? "1px solid #f0f0f5" : "none",
                      textDecoration: "none",
                      color: "#1a1a2e",
                      fontSize: 13,
                      background: idx % 2 === 1 ? "#fafafa" : "#fff",
                    }}
                  >
                    <div style={{ fontWeight: 500 }}>{number}</div>
                    <div>{formatInvoiceDate(invoiceDate)}</div>
                    <div>{formatInvoiceDate(dueDate)}</div>
                    <div style={{ textAlign: "right", fontWeight: 600 }}>${totalDue.toFixed(2)}</div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
