// Invoice constants and pure helpers.

export const SENDER = {
  name: "SkyHorizon Group, LLC",
  tagline: "Professional Services",
};

export const BILLED_TO = {
  name: "RBW Studio LLC",
  addressLines: ["575 Boices Lane", "Kingston, NY 12401-1083"],
};

export const RATE = 25;
export const NET_TERMS_DAYS = 35;
export const INVOICE_PREFIX = "RBW";
// Per-year minimum suffix. 2026 starts at 08 (manual catch-up for invoices
// that were issued before this app went live); every other year starts at 01.
const YEAR_MIN_SUFFIX = { 2026: 8 };
const DEFAULT_MIN_SUFFIX = 1;
export const minSuffixForYear = (year) =>
  YEAR_MIN_SUFFIX[year] ?? DEFAULT_MIN_SUFFIX;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// "2026-03-16" -> "March 16, 2026"
export const formatInvoiceDate = (iso) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${MONTHS[m - 1]} ${d}, ${y}`;
};

// "9:00 AM" -> "9:00 AM CST"
export const formatTimeWithTz = (time) => {
  if (!time) return "";
  return /CST|CDT|EST|EDT|PST|PDT|UTC/.test(time) ? time : `${time} CST`;
};

// Hours to one decimal: 9 -> "9.0", 7.5 -> "7.5"
export const formatHours = (h) => {
  const n = parseFloat(h);
  if (Number.isNaN(n)) return "";
  return n.toFixed(1);
};

// invoiceDate (ISO) + 35 days -> ISO. Mar 16, 2026 -> Apr 20, 2026.
export const computeDueDate = (invoiceDateIso) => {
  if (!invoiceDateIso) return "";
  const [y, m, d] = invoiceDateIso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + NET_TERMS_DAYS);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
};

// Produces RBW-YYYY-NN. For each year, the suffix is the larger of:
//   (a) the per-year minimum (see YEAR_MIN_SUFFIX — 2026 starts at 08), or
//   (b) one greater than the highest existing suffix for that year.
// Using "highest existing" instead of "count" makes the sequence robust
// against deleted rows in the Invoices sheet (otherwise a deletion would
// cause the next generated number to collide with an existing one).
export const generateInvoiceNumber = (existingInvoices, year) => {
  const y = year || new Date().getFullYear();
  const prefix = `${INVOICE_PREFIX}-${y}-`;
  const highestForYear = (existingInvoices || []).reduce((max, inv) => {
    const num = inv?.invoice_number || inv?.invoiceNumber || "";
    if (!num.startsWith(prefix)) return max;
    const suffix = parseInt(num.slice(prefix.length), 10);
    return Number.isFinite(suffix) && suffix > max ? suffix : max;
  }, 0);
  const next = Math.max(highestForYear + 1, minSuffixForYear(y));
  return `${prefix}${String(next).padStart(2, "0")}`;
};

// Fallback if listInvoices fails — never block submission.
export const fallbackInvoiceNumber = () => {
  const y = new Date().getFullYear();
  const suffix = String(Date.now()).slice(-4);
  return `${INVOICE_PREFIX}-${y}-${suffix}`;
};

// Today as ISO YYYY-MM-DD in local time.
export const todayIso = () => {
  const dt = new Date();
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
};

// Build a structured invoice object from timesheet rows.
export const buildInvoice = ({ rows, invoiceNumber, invoiceDateIso }) => {
  const lineItems = rows
    .filter((r) => r.date && r.start && r.end)
    .map((r) => ({
      date: r.date,
      start: r.start,
      end: r.end,
      hours: parseFloat(r.hours) || 0,
    }));
  const totalHours = lineItems.reduce((s, r) => s + r.hours, 0);
  const totalDue = totalHours * RATE;
  return {
    invoiceNumber,
    invoiceDate: invoiceDateIso,
    dueDate: computeDueDate(invoiceDateIso),
    billedTo: BILLED_TO,
    sender: SENDER,
    lineItems,
    totalHours,
    rate: RATE,
    totalDue,
    createdAt: new Date().toISOString(),
  };
};
