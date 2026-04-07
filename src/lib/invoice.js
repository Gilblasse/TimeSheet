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

// Counts existing invoices in the same year and produces RBW-YYYY-NN.
export const generateInvoiceNumber = (existingInvoices, year) => {
  const y = year || new Date().getFullYear();
  const countThisYear = (existingInvoices || []).filter((inv) => {
    const num = inv?.invoice_number || inv?.invoiceNumber || "";
    return num.startsWith(`${INVOICE_PREFIX}-${y}-`);
  }).length;
  const seq = String(countThisYear + 1).padStart(2, "0");
  return `${INVOICE_PREFIX}-${y}-${seq}`;
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
