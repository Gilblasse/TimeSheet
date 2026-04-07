// ============================================================
// SkyHorizon Timesheet — Google Apps Script Web App (v4)
//
// UPDATE your existing deployment:
// Deploy > Manage Deployments > pencil icon (Edit)
// Version: "New Version" > Deploy
// (URL stays the same)
//
// v4 adds invoice history: saveInvoice / listInvoices / getInvoice
// ============================================================

const SHEET_NAME = "Timesheet";
const INVOICE_SHEET_NAME = "Invoices";

function doGet(e) {
  const action = e.parameter.action;
  let result;

  try {
    if (action === "read") {
      result = readRows();
    } else if (action === "write") {
      const rows = JSON.parse(decodeURIComponent(e.parameter.rows));
      writeRows(rows);
      result = { success: true };
    } else if (action === "saveInvoice") {
      const invoice = JSON.parse(decodeURIComponent(e.parameter.invoice));
      saveInvoice(invoice);
      result = { success: true, invoiceNumber: invoice.invoiceNumber };
    } else if (action === "listInvoices") {
      result = listInvoices();
    } else if (action === "getInvoice") {
      result = getInvoice(e.parameter.number);
    } else {
      result = { error: "Unknown action: " + action };
    }
  } catch (err) {
    result = { error: err.message };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    // Set header
    sheet.getRange(1, 1, 1, 4).setValues([["Date", "Start", "End", "Hours"]]);
    sheet.getRange(1, 1, 1, 4).setFontWeight("bold");
    sheet.setFrozenRows(1);
    // Force columns B and C to plain text so times aren't auto-converted
    sheet.getRange("B:C").setNumberFormat("@STRING@");
  }
  return sheet;
}

function readRows() {
  const sheet = getOrCreateSheet();
  const data = sheet.getDataRange().getDisplayValues(); // getDisplayValues returns formatted strings
  if (data.length <= 1) return [];
  return data.slice(1)
    .map(row => ({
      date:  row[0] ? formatDate(row[0]) : "",
      start: String(row[1] || ""),
      end:   String(row[2] || ""),
      hours: String(row[3] || "")
    }))
    .filter(r => r.date || r.start);
}

function formatDate(val) {
  // If already in yyyy-MM-dd format, return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  // Try to parse and reformat
  try {
    const d = new Date(val);
    if (isNaN(d)) return val;
    return Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd");
  } catch (e) {
    return val;
  }
}

function writeRows(rows) {
  const sheet = getOrCreateSheet();

  // Clear existing data rows (keep header)
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) sheet.deleteRows(2, lastRow - 1);
  if (!rows || rows.length === 0) return;

  // Write as plain text to prevent auto-conversion
  const values = rows.map(r => [r.date, r.start, r.end, r.hours]);
  const range = sheet.getRange(2, 1, values.length, 4);

  // Force B and C columns to text format before writing
  sheet.getRange(2, 2, values.length, 2).setNumberFormat("@STRING@");
  range.setValues(values);
}

// ============================================================
// Invoice history (v4)
// ============================================================

const INVOICE_HEADERS = [
  "invoice_number",
  "invoice_date",
  "due_date",
  "billed_to",
  "total_hours",
  "rate",
  "total_due",
  "line_items_json",
  "created_at",
];

function getOrCreateInvoiceSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(INVOICE_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(INVOICE_SHEET_NAME);
    sheet.getRange(1, 1, 1, INVOICE_HEADERS.length).setValues([INVOICE_HEADERS]);
    sheet.getRange(1, 1, 1, INVOICE_HEADERS.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
    // Keep invoice_number and dates as plain text so they aren't auto-converted.
    sheet.getRange("A:C").setNumberFormat("@STRING@");
    sheet.getRange("H:H").setNumberFormat("@STRING@");
    sheet.getRange("I:I").setNumberFormat("@STRING@");
  }
  return sheet;
}

function saveInvoice(inv) {
  const sheet = getOrCreateInvoiceSheet();
  const row = [
    String(inv.invoiceNumber || ""),
    String(inv.invoiceDate || ""),
    String(inv.dueDate || ""),
    (inv.billedTo && inv.billedTo.name) || "",
    Number(inv.totalHours) || 0,
    Number(inv.rate) || 0,
    Number(inv.totalDue) || 0,
    JSON.stringify(inv.lineItems || []),
    String(inv.createdAt || new Date().toISOString()),
  ];
  sheet.appendRow(row);
  // Re-assert text format on the newly-appended row for the columns that need it.
  const lastRow = sheet.getLastRow();
  sheet.getRange(lastRow, 1, 1, 3).setNumberFormat("@STRING@");
  sheet.getRange(lastRow, 8, 1, 2).setNumberFormat("@STRING@");
}

function listInvoices() {
  const sheet = getOrCreateInvoiceSheet();
  const values = sheet.getDataRange().getDisplayValues();
  if (values.length <= 1) return [];
  const header = values[0];
  const rows = values.slice(1)
    .filter(r => r[0]) // skip empty rows
    .map(r => {
      const obj = {};
      for (let i = 0; i < header.length; i++) obj[header[i]] = r[i];
      // Coerce numeric columns for client convenience.
      obj.total_hours = parseFloat(obj.total_hours) || 0;
      obj.rate = parseFloat(obj.rate) || 0;
      obj.total_due = parseFloat(obj.total_due) || 0;
      // Don't ship the large line_items_json in the list response.
      delete obj.line_items_json;
      return obj;
    });
  // Sort by invoice_date descending, then by invoice_number descending as tiebreaker.
  rows.sort((a, b) => {
    const d = String(b.invoice_date).localeCompare(String(a.invoice_date));
    if (d !== 0) return d;
    return String(b.invoice_number).localeCompare(String(a.invoice_number));
  });
  return rows;
}

function getInvoice(number) {
  if (!number) return null;
  const sheet = getOrCreateInvoiceSheet();
  const values = sheet.getDataRange().getDisplayValues();
  if (values.length <= 1) return null;
  const header = values[0];
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === number) {
      const obj = {};
      for (let j = 0; j < header.length; j++) obj[header[j]] = values[i][j];
      obj.total_hours = parseFloat(obj.total_hours) || 0;
      obj.rate = parseFloat(obj.rate) || 0;
      obj.total_due = parseFloat(obj.total_due) || 0;
      try {
        obj.line_items = JSON.parse(obj.line_items_json || "[]");
      } catch (err) {
        obj.line_items = [];
      }
      return obj;
    }
  }
  return null;
}
