import {
  formatInvoiceDate,
  formatTimeWithTz,
  formatHours,
  SENDER,
} from "../lib/invoice.js";

const COLORS = {
  navy: "#1A1A2D",
  text: "#2A2A3D",
  totals: "#494969",
  muted: "#89899A",
  subMuted: "#696989",
  divider: "#EBEBEF",
  rowAlt: "#F9F9FB",
  headerText: "#FFFFFF",
  headerMuted: "#CFCFE0",
};

const SERIF = "'Cormorant Garamond', serif";
const SANS = "'DM Sans', sans-serif";

const sectionLabel = {
  fontSize: 9,
  letterSpacing: "0.25em",
  textTransform: "uppercase",
  color: COLORS.muted,
  fontFamily: SANS,
  fontWeight: 400,
};

const COLUMNS = "1.3fr 1.1fr 1.1fr 0.7fr";

export default function Invoice({
  invoiceNumber,
  invoiceDate,
  dueDate,
  billedTo,
  lineItems = [],
  totalHours = 0,
  rate = 25,
  totalDue = 0,
}) {
  return (
    <div
      data-testid="invoice"
      style={{
        background: "#fff",
        maxWidth: 820,
        margin: "0 auto",
        padding: "56px 64px 48px",
        fontFamily: SANS,
        color: COLORS.text,
        boxShadow: "0 2px 24px rgba(0,0,0,0.08)",
        borderRadius: 4,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 28,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: SERIF,
              fontSize: 28,
              fontWeight: 700,
              color: COLORS.navy,
              lineHeight: 1.1,
            }}
          >
            {SENDER.name}
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 10,
              letterSpacing: "0.35em",
              textTransform: "uppercase",
              color: COLORS.muted,
              fontFamily: SANS,
            }}
          >
            Professional Services
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontFamily: SERIF,
              fontSize: 42,
              fontWeight: 400,
              letterSpacing: "0.06em",
              color: COLORS.navy,
              lineHeight: 1,
            }}
          >
            INVOICE
          </div>
          <div
            style={{
              ...sectionLabel,
              fontSize: 10,
              letterSpacing: "0.2em",
              marginTop: 10,
            }}
          >
            NO. {invoiceNumber}
          </div>
        </div>
      </div>

      {/* Meta row: Billed To / Invoice Date / Due Date */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 16,
          borderTop: `2px solid ${COLORS.navy}`,
          paddingTop: 14,
          marginBottom: 36,
        }}
      >
        <div style={{ textAlign: "left", lineHeight: 1.3 }}>
          <div style={sectionLabel}>Billed To</div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              marginTop: 3,
              color: COLORS.navy,
            }}
          >
            {billedTo?.name}
          </div>
          {(billedTo?.addressLines || []).map((line) => (
            <div
              key={line}
              style={{
                fontSize: 11,
                color: COLORS.subMuted,
                marginTop: 3,
              }}
            >
              {line}
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", lineHeight: 1.3 }}>
          <div style={sectionLabel}>Invoice Date</div>
          <div
            style={{
              fontSize: 13,
              marginTop: 3,
              color: COLORS.navy,
            }}
          >
            {formatInvoiceDate(invoiceDate)}
          </div>
        </div>
        <div style={{ textAlign: "right", lineHeight: 1.3 }}>
          <div style={sectionLabel}>Due Date</div>
          <div
            style={{
              fontSize: 13,
              marginTop: 3,
              color: COLORS.navy,
            }}
          >
            {formatInvoiceDate(dueDate)}
          </div>
        </div>
      </div>

      {/* Line items table */}
      <div style={{ marginBottom: 28 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: COLUMNS,
            background: COLORS.navy,
            padding: "11px 18px",
            gap: 12,
          }}
        >
          {[
            ["DATE", "left"],
            ["START", "left"],
            ["END", "left"],
            ["HOURS", "right"],
          ].map(([label, align]) => (
            <div
              key={label}
              style={{
                fontSize: 9,
                letterSpacing: "0.25em",
                textTransform: "uppercase",
                color: COLORS.headerText,
                fontWeight: 400,
                fontFamily: SANS,
                textAlign: align,
              }}
            >
              {label}
            </div>
          ))}
        </div>
        {lineItems.map((row, idx) => (
          <div
            key={`${row.date}-${idx}`}
            style={{
              display: "grid",
              gridTemplateColumns: COLUMNS,
              gap: 12,
              padding: "10px 18px",
              background: idx % 2 === 1 ? COLORS.rowAlt : "#fff",
              borderBottom: `1px solid ${COLORS.divider}`,
              borderTop: idx === 0 ? `1px solid ${COLORS.divider}` : "none",
              fontSize: 12,
              color: COLORS.text,
            }}
          >
            <div style={{ textAlign: "right", paddingRight: 40 }}>
              {formatInvoiceDate(row.date)}
            </div>
            <div style={{ paddingLeft: 24 }}>{formatTimeWithTz(row.start)}</div>
            <div>{formatTimeWithTz(row.end)}</div>
            <div style={{ textAlign: "right" }}>{formatHours(row.hours)}</div>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <div style={{ width: 320 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "12px 8px",
              borderTop: `1px solid ${COLORS.divider}`,
              borderBottom: `1px solid ${COLORS.divider}`,
              fontSize: 12,
              color: COLORS.totals,
            }}
          >
            <span>Total Hours</span>
            <span>{formatHours(totalHours)} hrs</span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "12px 8px",
              borderBottom: `1px solid ${COLORS.divider}`,
              fontSize: 12,
              color: COLORS.totals,
            }}
          >
            <span>Rate</span>
            <span>${rate.toFixed(2)} / hr</span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              padding: "16px 8px 4px",
              borderTop: `2px solid ${COLORS.navy}`,
            }}
          >
            <span
              style={{
                fontFamily: SERIF,
                fontSize: 20,
                color: COLORS.navy,
              }}
            >
              Total Due
            </span>
            <span
              style={{
                fontFamily: SERIF,
                fontSize: 20,
                color: COLORS.navy,
              }}
            >
              ${totalDue.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
