import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Invoice from "../components/Invoice.jsx";
import RecipientModal from "../components/RecipientModal.jsx";
import { createInvoiceDraft, getInvoice } from "../lib/invoiceApi.js";
import { BILLED_TO, SENDER, formatInvoiceDate } from "../lib/invoice.js";
import { downloadInvoicePdf, getInvoicePdfBase64 } from "../lib/invoicePdf.js";

const COLORS = {
  navy: "#1a1a2e",
  muted: "#8a8a9a",
  divider: "#e6e6ec",
  okBg: "#e6f4ea",
  okFg: "#1e6b3a",
  errBg: "#fdecea",
  errFg: "#a32a1f",
};

const SANS = "'DM Sans', sans-serif";

const buildSubject = (invoice) =>
  `Invoice ${invoice.invoiceNumber} from ${SENDER.name}`;

const buildBody = (invoice) =>
  `Hello,\n\n` +
  `Please find attached Invoice ${invoice.invoiceNumber} dated ${formatInvoiceDate(invoice.invoiceDate)}.\n\n` +
  `Total due: $${(invoice.totalDue || 0).toFixed(2)}\n` +
  `Due by: ${formatInvoiceDate(invoice.dueDate)}\n\n` +
  `Thank you for your business.\n\n— ${SENDER.name}`;

export default function InvoiceDetail() {
  const { invoiceNumber } = useParams();
  // Use a single state object so we can reset it atomically when invoiceNumber changes,
  // without an explicit setState() in the effect body (which the lint rule forbids).
  const [state, setState] = useState({ invoice: null, loading: true, error: null, key: invoiceNumber });
  if (state.key !== invoiceNumber) {
    setState({ invoice: null, loading: true, error: null, key: invoiceNumber });
  }
  const { invoice, loading, error } = state;

  const [busy, setBusy] = useState("idle"); // "idle" | "download" | "draft"
  const [modalOpen, setModalOpen] = useState(false);
  const [feedback, setFeedback] = useState(null); // null | { kind, msg }
  const invoiceRef = useRef(null);

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

  // Auto-clear feedback after a few seconds.
  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(t);
  }, [feedback]);

  const handleDownload = async () => {
    if (!invoice || busy !== "idle") return;
    setBusy("download");
    setFeedback(null);
    try {
      await downloadInvoicePdf(invoiceRef.current, invoice.invoiceNumber);
      setFeedback({ kind: "ok", msg: "Downloaded." });
    } catch (err) {
      setFeedback({ kind: "err", msg: err?.message || "Failed to download PDF." });
    } finally {
      setBusy("idle");
    }
  };

  const handleOpenDraftModal = () => {
    if (!invoice || busy !== "idle") return;
    setFeedback(null);
    setModalOpen(true);
  };

  const handleSubmitDraft = async (to) => {
    setModalOpen(false);
    if (!invoice) return;

    // Open the Gmail Drafts tab IMMEDIATELY, before any await, so the
    // browser still considers this a direct response to the user click
    // and doesn't trip the popup blocker. We redirect/close it later
    // depending on whether the draft creation succeeds.
    const draftWindow = window.open("about:blank", "_blank");

    setBusy("draft");
    setFeedback(null);
    try {
      const pdfBase64 = await getInvoicePdfBase64(invoiceRef.current);
      await createInvoiceDraft({
        invoiceNumber: invoice.invoiceNumber,
        to,
        subject: buildSubject(invoice),
        body: buildBody(invoice),
        pdfBase64,
      });
      // Apps Script returned { success: true, draftId }. We don't build a
      // direct URL to the specific draft (Gmail URLs need the Gmail-side
      // messageId, not the Apps Script draft id), so the Drafts list is the
      // closest landing point.
      if (draftWindow) {
        draftWindow.location.href = "https://mail.google.com/mail/#drafts";
      }
      setFeedback({ kind: "ok", msg: "Draft created — opening Gmail Drafts." });
    } catch (err) {
      if (draftWindow) draftWindow.close();
      setFeedback({ kind: "err", msg: err?.message || "Failed to create draft." });
    } finally {
      setBusy("idle");
    }
  };

  const actionsDisabled = loading || !!error || !invoice || busy !== "idle";

  return (
    <div style={{ minHeight: "100vh", background: "#f4f4f7", fontFamily: SANS, padding: "32px 16px" }}>
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <Link to="/history" style={{ color: COLORS.navy, fontSize: 11, textDecoration: "none", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            &larr; All Invoices
          </Link>
          <Link to="/" style={{ color: COLORS.muted, fontSize: 11, textDecoration: "none", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            New Timesheet &rarr;
          </Link>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: 10,
            marginBottom: 18,
            minHeight: 32,
          }}
        >
          {feedback && (
            <div
              role="status"
              style={{
                fontSize: 11,
                letterSpacing: "0.04em",
                padding: "6px 12px",
                borderRadius: 4,
                background: feedback.kind === "ok" ? COLORS.okBg : COLORS.errBg,
                color: feedback.kind === "ok" ? COLORS.okFg : COLORS.errFg,
              }}
            >
              {feedback.msg}
            </div>
          )}
          <button
            type="button"
            onClick={handleDownload}
            disabled={actionsDisabled}
            style={{
              fontFamily: SANS,
              fontSize: 11,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              padding: "10px 18px",
              background: "#fff",
              color: COLORS.navy,
              border: `1px solid ${COLORS.navy}`,
              borderRadius: 4,
              cursor: actionsDisabled ? "not-allowed" : "pointer",
              opacity: actionsDisabled ? 0.55 : 1,
            }}
          >
            {busy === "download" ? "Generating…" : "Download PDF"}
          </button>
          <button
            type="button"
            onClick={handleOpenDraftModal}
            disabled={actionsDisabled}
            style={{
              fontFamily: SANS,
              fontSize: 11,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              padding: "10px 18px",
              background: COLORS.navy,
              color: "#fff",
              border: `1px solid ${COLORS.navy}`,
              borderRadius: 4,
              cursor: actionsDisabled ? "not-allowed" : "pointer",
              opacity: actionsDisabled ? 0.55 : 1,
            }}
          >
            {busy === "draft" ? "Creating…" : "Create Gmail Draft"}
          </button>
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

        {!loading && invoice && (
          <div ref={invoiceRef}>
            <Invoice {...invoice} />
          </div>
        )}
      </div>

      {modalOpen && (
        <RecipientModal
          invoiceNumber={invoice?.invoiceNumber}
          onCancel={() => setModalOpen(false)}
          onSubmit={handleSubmitDraft}
        />
      )}
    </div>
  );
}
