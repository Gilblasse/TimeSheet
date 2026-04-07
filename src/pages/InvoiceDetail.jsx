import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Invoice from "../components/Invoice.jsx";
import { getInvoice } from "../lib/invoiceApi.js";
import { BILLED_TO } from "../lib/invoice.js";

export default function InvoiceDetail() {
  const { invoiceNumber } = useParams();
  // Use a single state object so we can reset it atomically when invoiceNumber changes,
  // without an explicit setState() in the effect body (which the lint rule forbids).
  const [state, setState] = useState({ invoice: null, loading: true, error: null, key: invoiceNumber });
  if (state.key !== invoiceNumber) {
    setState({ invoice: null, loading: true, error: null, key: invoiceNumber });
  }
  const { invoice, loading, error } = state;

  useEffect(() => {
    let cancelled = false;
    getInvoice(invoiceNumber)
      .then((data) => {
        if (cancelled) return;
        if (!data) {
          setState((s) => ({ ...s, loading: false, error: "Invoice not found." }));
          return;
        }
        if (data.billedTo && (!data.billedTo.addressLines || data.billedTo.addressLines.length === 0)) {
          data.billedTo.addressLines = BILLED_TO.addressLines;
        }
        setState((s) => ({ ...s, loading: false, invoice: data }));
      })
      .catch(() => {
        if (cancelled) return;
        setState((s) => ({ ...s, loading: false, error: "Failed to load invoice." }));
      });
    return () => { cancelled = true; };
  }, [invoiceNumber]);

  return (
    <div style={{ minHeight: "100vh", background: "#f4f4f7", fontFamily: "'DM Sans', sans-serif", padding: "32px 16px" }}>
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <Link to="/history" style={{ color: "#1a1a2e", fontSize: 11, textDecoration: "none", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            &larr; All Invoices
          </Link>
          <Link to="/" style={{ color: "#8a8a9a", fontSize: 11, textDecoration: "none", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            New Timesheet &rarr;
          </Link>
        </div>

        {loading && (
          <div style={{ background: "#fff", borderRadius: 4, padding: 56, boxShadow: "0 2px 24px rgba(0,0,0,0.08)" }}>
            <div className="skeleton" style={{ height: 36, marginBottom: 24 }} />
            <div className="skeleton" style={{ height: 16, marginBottom: 8 }} />
            <div className="skeleton" style={{ height: 16, marginBottom: 24, width: "60%" }} />
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="skeleton" style={{ height: 24, marginBottom: 8 }} />
            ))}
          </div>
        )}

        {!loading && error && (
          <div style={{ background: "#fff3cd", color: "#856404", padding: "32px 22px", borderRadius: 8, fontSize: 13, textAlign: "center" }}>
            {error}
          </div>
        )}

        {!loading && invoice && <Invoice {...invoice} />}
      </div>
    </div>
  );
}
