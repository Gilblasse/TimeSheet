import { useState, useEffect } from "react";

const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL;

const emptyRow = () => ({ id: Math.random().toString(36).slice(2), date: "", start: "", end: "", hours: "" });

const calcHours = (start, end) => {
  if (!start || !end) return "";
  const toMin = (t) => {
    const [time, meridiem] = t.split(" ");
    let [h, m] = time.split(":").map(Number);
    if (meridiem === "PM" && h !== 12) h += 12;
    if (meridiem === "AM" && h === 12) h = 0;
    return h * 60 + m;
  };
  try {
    const diff = (toMin(end) - toMin(start)) / 60;
    return diff > 0 ? parseFloat(diff.toFixed(2)) : "";
  } catch { return ""; }
};

const timeOptions = [];
for (let h = 6; h <= 23; h++) {
  for (let m = 0; m < 60; m += 15) {
    const hour = h % 12 === 0 ? 12 : h % 12;
    const meridiem = h < 12 ? "AM" : "PM";
    const min = m === 0 ? "00" : String(m);
    timeOptions.push(`${hour}:${min} ${meridiem}`);
  }
}

const encodeRows = (rows) => { try { return btoa(encodeURIComponent(JSON.stringify(rows))); } catch { return ""; } };
const decodeRows = (str) => { try { return JSON.parse(decodeURIComponent(atob(str))); } catch { return null; } };

export default function Timesheet() {
  const [rows, setRows] = useState([emptyRow()]);
  const [submitted, setSubmitted] = useState(false);
  const [invoiceText, setInvoiceText] = useState("");
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [saveStatus, setSaveStatus] = useState("idle");
  const [statusMsg, setStatusMsg] = useState(null);
  const [loading, setLoading] = useState(true);

  const showMsg = (text, isError = false) => {
    setStatusMsg({ text, isError });
    setTimeout(() => setStatusMsg(null), 4000);
  };

  const loadFromSheets = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${APPS_SCRIPT_URL}?action=read`);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setRows(data.map(r => ({
          id: Math.random().toString(36).slice(2),
          date: r.date || "",
          start: r.start || "",
          end: r.end || "",
          hours: r.hours || "",
        })));
        showMsg(`\u2713 Loaded ${data.length} row${data.length !== 1 ? "s" : ""} from Google Sheets`);
        return;
      }
    } catch {
      // fall through to hash restore
    } finally {
      setLoading(false);
    }
    // Fallback: restore from URL hash
    const hash = window.location.hash.slice(1);
    if (hash) {
      const loaded = decodeRows(hash);
      if (Array.isArray(loaded) && loaded.length > 0) {
        setRows(loaded);
        showMsg(`\u2713 Restored ${loaded.length} row${loaded.length !== 1 ? "s" : ""} from last session`);
      }
    }
  };

  useEffect(() => {
    loadFromSheets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    setSaveStatus("saving");
    window.location.hash = encodeRows(rows);
    const filled = rows.filter(r => r.date || r.start || r.end);
    const rowsParam = encodeURIComponent(JSON.stringify(filled));
    const syncUrl = `${APPS_SCRIPT_URL}?action=write&rows=${rowsParam}`;
    try {
      await fetch(syncUrl, { method: "GET", mode: "no-cors" });
      setSaveStatus("saved");
      showMsg("\u2713 Saved & synced to Google Sheets!");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch {
      setSaveStatus("error");
      showMsg("\u26a0 Sync failed - data saved locally", true);
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  const updateRow = (id, field, value) => {
    setSaveStatus("idle");
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const next = { ...r, [field]: value };
      if (field === "start" || field === "end") {
        next.hours = calcHours(field === "start" ? value : r.start, field === "end" ? value : r.end);
      }
      return next;
    }));
  };

  const addRow = () => setRows(prev => [...prev, emptyRow()]);
  const removeRow = (id) => setRows(prev => { const u = prev.filter(r => r.id !== id); return u.length === 0 ? [emptyRow()] : u; });
  const clearAll = () => { setRows([emptyRow()]); setSubmitted(false); setInvoiceText(""); setSaveStatus("idle"); window.location.hash = ""; };

  const totalHours = rows.reduce((sum, r) => sum + (parseFloat(r.hours) || 0), 0);

  const handleSubmit = async () => {
    const filled = rows.filter(r => r.date && r.start && r.end);
    if (!filled.length) return;
    setLoadingInvoice(true); setSubmitted(true);
    const timesheetData = filled.map(r => `${r.date} | ${r.start} CST | ${r.end} CST | ${r.hours} hrs`).join("\n");
    const prompt = `You are an invoice assistant. Here is a new timesheet from SkyHorizon Group, LLC to be invoiced to RBW Studio LLC.\n\nTIMESHEET:\n${timesheetData}\n\nTotal Hours: ${totalHours.toFixed(2)}\nRate: $25/hr\nTotal Due: $${(totalHours * 25).toFixed(2)}\n\nPlease confirm receipt and summarize: date range, total hours, total due at $25/hr, and any notes. Then confirm you're ready to generate the next invoice on go-ahead.`;
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, messages: [{ role: "user", content: prompt }] }),
      });
      const data = await res.json();
      setInvoiceText(data.content?.map(c => c.text || "").join("") || "Ready to generate your invoice.");
    } catch { setInvoiceText("Timesheet received. Ready to generate your invoice."); }
    setLoadingInvoice(false);
  };

  const saveBg = saveStatus === "saved" ? "#27ae60" : saveStatus === "error" ? "#e74c3c" : saveStatus === "saving" ? "#8a8ab0" : "#2d6a4f";
  const saveLabel = saveStatus === "saving" ? "Syncing..." : saveStatus === "saved" ? "\u2713 Saved" : saveStatus === "error" ? "\u26a0 Retry" : "\ud83d\udcbe Save";

  return (
    <div style={{ minHeight: "100vh", background: "#f4f4f7", fontFamily: "'DM Sans', sans-serif", padding: "32px 16px" }}>
      <div style={{ maxWidth: 820, margin: "0 auto" }}>

        {statusMsg && (
          <div data-testid="status-msg" style={{ background: statusMsg.isError ? "#fff3cd" : "#d4edda", color: statusMsg.isError ? "#856404" : "#155724", borderRadius: 8, padding: "10px 18px", marginBottom: 16, fontSize: 12, textAlign: "center", border: `1px solid ${statusMsg.isError ? "#ffc107" : "#c3e6cb"}` }}>
            {statusMsg.text}
          </div>
        )}

        <div style={{ background: "#1a1a2e", borderRadius: 12, padding: "28px 36px", marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 600, color: "#fff" }}>SkyHorizon Group, LLC</div>
            <div style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "#8a8ab0", marginTop: 4 }}>Daily Timesheet</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "#8a8ab0" }}>Billed To</div>
            <div style={{ color: "#fff", fontSize: 13, marginTop: 4 }}>RBW Studio LLC</div>
            <div style={{ color: "#6fcf97", fontSize: 10, marginTop: 6 }}>Google Sheets connected</div>
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 16px rgba(0,0,0,0.07)", marginBottom: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1.4fr 1.4fr 0.8fr 36px", background: "#1a1a2e", padding: "12px 20px", gap: 18 }}>
            {["Date", "Start (CST)", "End (CST)", "Hours", ""].map((h, i) => (
              <div key={i} style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "#aaaacc", fontWeight: 500, textAlign: i === 3 ? "right" : "left" }}>{h}</div>
            ))}
          </div>
          <div style={{ padding: "8px 20px" }}>
            {loading && (
              <div style={{ padding: "18px 0", textAlign: "center", color: "#8a8ab0", fontSize: 12, letterSpacing: "0.06em" }}>
                Loading from Google Sheets...
              </div>
            )}
            {!loading && rows.map((row, idx) => (
              <div key={row.id} style={{ display: "grid", gridTemplateColumns: "1.6fr 1.4fr 1.4fr 0.8fr 36px", gap: 18, alignItems: "center", padding: "6px 0", borderBottom: idx < rows.length - 1 ? "1px solid #f0f0f5" : "none" }}>
                <input aria-label={`date-${idx}`} type="date" value={row.date} onChange={e => updateRow(row.id, "date", e.target.value)}
                  style={{ border: "1px solid #e0e0ea", borderRadius: 6, padding: "7px 10px", fontSize: 12, color: "#1a1a2e", outline: "none", width: "100%", background: "#fafafa" }} />
                <select aria-label={`start-${idx}`} value={row.start} onChange={e => updateRow(row.id, "start", e.target.value)}
                  style={{ border: "1px solid #e0e0ea", borderRadius: 6, padding: "7px 10px", fontSize: 12, color: row.start ? "#1a1a2e" : "#aaa", outline: "none", width: "100%", background: "#fafafa" }}>
                  <option value="">Start</option>
                  {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <select aria-label={`end-${idx}`} value={row.end} onChange={e => updateRow(row.id, "end", e.target.value)}
                  style={{ border: "1px solid #e0e0ea", borderRadius: 6, padding: "7px 10px", fontSize: 12, color: row.end ? "#1a1a2e" : "#aaa", outline: "none", width: "100%", background: "#fafafa" }}>
                  <option value="">End</option>
                  {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <div data-testid={`hours-${idx}`} style={{ textAlign: "right", fontSize: 13, fontWeight: 500, color: row.hours ? "#1a1a2e" : "#ccc" }}>{row.hours || "\u2014"}</div>
                <button aria-label={`remove-${idx}`} onClick={() => removeRow(row.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#c0c0cc", fontSize: 18, padding: 4 }}>x</button>
              </div>
            ))}
          </div>
          <div style={{ padding: "12px 20px", borderTop: "1px solid #f0f0f5" }}>
            <button onClick={addRow} style={{ background: "none", border: "1.5px dashed #c0c0d0", borderRadius: 6, padding: "8px 18px", fontSize: 11, color: "#8a8ab0", cursor: "pointer", letterSpacing: "0.08em", textTransform: "uppercase" }}>+ Add Row</button>
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: 12, padding: "18px 28px", marginBottom: 20, boxShadow: "0 2px 16px rgba(0,0,0,0.07)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", gap: 36 }}>
            {[["Total Hours", `${totalHours.toFixed(2)} hrs`], ["Rate", "$25.00/hr"], ["Est. Total", `$${(totalHours * 25).toFixed(2)}`]].map(([label, val]) => (
              <div key={label}>
                <div style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "#8a8a9a", marginBottom: 4 }}>{label}</div>
                <div data-testid={`total-${label.replace(/\s+/g,'-').toLowerCase()}`} style={{ fontSize: 20, fontWeight: 600, color: "#1a1a2e", fontFamily: "'Cormorant Garamond', serif" }}>{val}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button onClick={clearAll} style={{ background: "none", border: "1px solid #e0e0ea", borderRadius: 8, padding: "10px 18px", fontSize: 11, color: "#8a8a9a", cursor: "pointer", letterSpacing: "0.06em", textTransform: "uppercase" }}>Clear</button>
            <button onClick={loadFromSheets} disabled={loading} style={{ background: "none", border: "1px solid #e0e0ea", borderRadius: 8, padding: "10px 18px", fontSize: 11, color: loading ? "#c0c0cc" : "#8a8a9a", cursor: loading ? "not-allowed" : "pointer", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              {loading ? "Loading..." : "\u21bb Refresh"}
            </button>
            <button data-testid="save-btn" onClick={handleSave} disabled={saveStatus === "saving"}
              style={{ background: saveBg, border: "none", borderRadius: 8, padding: "10px 28px", fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", cursor: saveStatus === "saving" ? "not-allowed" : "pointer", color: "#fff" }}>
              {saveLabel}
            </button>
            <button onClick={handleSubmit} disabled={loadingInvoice || !rows.some(r => r.date && r.start && r.end)}
              style={{ background: loadingInvoice ? "#8a8ab0" : "#1a1a2e", border: "none", borderRadius: 8, padding: "10px 22px", fontSize: 11, color: "#fff", cursor: loadingInvoice ? "not-allowed" : "pointer", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 500 }}>
              {loadingInvoice ? "Submitting..." : "Submit for Invoice"}
            </button>
          </div>
        </div>

        {submitted && (
          <div style={{ background: "#fff", borderRadius: 12, padding: "24px 28px", boxShadow: "0 2px 16px rgba(0,0,0,0.07)", borderLeft: "4px solid #1a1a2e" }}>
            <div style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "#8a8a9a", marginBottom: 12 }}>Claude's Response</div>
            {loadingInvoice
              ? <div style={{ color: "#8a8ab0", fontSize: 13 }}>Reviewing your timesheet...</div>
              : <div style={{ fontSize: 13, color: "#2a2a3e", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{invoiceText}</div>}
          </div>
        )}

      </div>
    </div>
  );
}
