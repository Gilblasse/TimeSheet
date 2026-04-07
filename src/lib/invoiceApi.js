// Apps Script wrappers for invoice persistence.
//
// REQUIRED Apps Script changes (paste into your Google Apps Script editor):
//
//   const INVOICE_SHEET = "Invoices";
//
//   function doGet(e) {
//     const action = e.parameter.action;
//     if (action === "saveInvoice") return saveInvoice_(e.parameter.invoice);
//     if (action === "listInvoices") return listInvoices_();
//     if (action === "getInvoice")  return getInvoice_(e.parameter.number);
//     // ... existing read/write actions stay as-is ...
//   }
//
//   function getInvoiceSheet_() {
//     const ss = SpreadsheetApp.getActiveSpreadsheet();
//     let sh = ss.getSheetByName(INVOICE_SHEET);
//     if (!sh) {
//       sh = ss.insertSheet(INVOICE_SHEET);
//       sh.appendRow([
//         "invoice_number","invoice_date","due_date","billed_to",
//         "total_hours","rate","total_due","line_items_json","created_at"
//       ]);
//     }
//     return sh;
//   }
//
//   function saveInvoice_(payload) {
//     const inv = JSON.parse(payload);
//     const sh = getInvoiceSheet_();
//     sh.appendRow([
//       inv.invoiceNumber, inv.invoiceDate, inv.dueDate,
//       (inv.billedTo && inv.billedTo.name) || "",
//       inv.totalHours, inv.rate, inv.totalDue,
//       JSON.stringify(inv.lineItems || []),
//       inv.createdAt || new Date().toISOString()
//     ]);
//     return ContentService.createTextOutput(JSON.stringify({ ok: true }))
//       .setMimeType(ContentService.MimeType.JSON);
//   }
//
//   function listInvoices_() {
//     const sh = getInvoiceSheet_();
//     const values = sh.getDataRange().getValues();
//     const [header, ...rows] = values;
//     const out = rows.map(r => Object.fromEntries(header.map((h, i) => [h, r[i]])));
//     out.sort((a, b) => String(b.invoice_date).localeCompare(String(a.invoice_date)));
//     return ContentService.createTextOutput(JSON.stringify(out))
//       .setMimeType(ContentService.MimeType.JSON);
//   }
//
//   function getInvoice_(number) {
//     const sh = getInvoiceSheet_();
//     const values = sh.getDataRange().getValues();
//     const [header, ...rows] = values;
//     const found = rows.find(r => r[0] === number);
//     if (!found) return ContentService.createTextOutput(JSON.stringify(null))
//       .setMimeType(ContentService.MimeType.JSON);
//     const obj = Object.fromEntries(header.map((h, i) => [h, found[i]]));
//     try { obj.line_items = JSON.parse(obj.line_items_json || "[]"); } catch (_) { obj.line_items = []; }
//     return ContentService.createTextOutput(JSON.stringify(obj))
//       .setMimeType(ContentService.MimeType.JSON);
//   }

const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL;

// Maps a sheet row (snake_case) into the in-memory invoice shape used by <Invoice />.
const normalizeInvoice = (row) => {
  if (!row) return null;
  const lineItems = Array.isArray(row.line_items)
    ? row.line_items
    : (() => { try { return JSON.parse(row.line_items_json || "[]"); } catch { return []; } })();
  return {
    invoiceNumber: row.invoice_number,
    invoiceDate: row.invoice_date,
    dueDate: row.due_date,
    billedTo: { name: row.billed_to, addressLines: [] },
    lineItems,
    totalHours: parseFloat(row.total_hours) || 0,
    rate: parseFloat(row.rate) || 0,
    totalDue: parseFloat(row.total_due) || 0,
    createdAt: row.created_at,
  };
};

// Save uses no-cors GET (matches existing handleSave pattern in Timesheet).
// We can't read the response body, but the row will be appended.
export const saveInvoice = async (invoice) => {
  if (!APPS_SCRIPT_URL) throw new Error("VITE_APPS_SCRIPT_URL not configured");
  const payload = encodeURIComponent(JSON.stringify(invoice));
  const url = `${APPS_SCRIPT_URL}?action=saveInvoice&invoice=${payload}`;
  await fetch(url, { method: "GET", mode: "no-cors" });
  return true;
};

export const listInvoices = async () => {
  if (!APPS_SCRIPT_URL) return [];
  const res = await fetch(`${APPS_SCRIPT_URL}?action=listInvoices`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
};

export const getInvoice = async (invoiceNumber) => {
  if (!APPS_SCRIPT_URL) return null;
  const res = await fetch(`${APPS_SCRIPT_URL}?action=getInvoice&number=${encodeURIComponent(invoiceNumber)}`);
  const data = await res.json();
  return normalizeInvoice(data);
};
