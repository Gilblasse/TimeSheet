import {
  formatInvoiceDate,
  formatTimeWithTz,
  formatHours,
  SENDER,
} from "../lib/invoice.js";

const COLORS = {
  navy: "#1a1a2e",
  text: "#1a1a2e",
  muted: "#8a8a9a",
  divider: "#e6e6ec",
  rowAlt: "#fafafa",
  page: "#f4f4f7",
};

const SERIF = "'Cormorant Garamond', serif";
const SANS = "'DM Sans', sans-serif";

const labelStyle = {
  fontSize: 9,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: COLORS.muted,
  fontFamily: SANS,
  fontWeight: 500,
};

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
      {/* Top accent bar */}
      <div
        style={{
          height: 3,
          background: "linear-gradient(90deg, #c8c8e0 0%, #8a8ab0 50%, #c8c8e0 100%)",
          marginBottom: 36,
          marginLeft: -64,
          marginRight: -64,
          marginTop: -56,
        }}
      />

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <div style={{ fontFamily: SERIF, fontSize: 30, fontWeight: 700, color: COLORS.navy, lineHeight: 1.1 }}>
            {SENDER.name}
          </div>
          <div style={{ ...labelStyle, marginTop: 8 }}>{SENDER.tagline}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontFamily: SERIF,
              fontSize: 44,
              fontWeight: 500,
              letterSpacing: "0.18em",
              color: COLORS.navy,
              lineHeight: 1,
            }}
          >
            INVOICE
          </div>
          <div style={{ ...labelStyle, marginTop: 10 }}>NO. {invoiceNumber}</div>
        </div>
      </div>

      <div style={{ borderTop: `1px solid ${COLORS.navy}`, marginBottom: 28 }} />

      {/* Meta row: Billed To / Invoice Date / Due Date */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 32 }}>
        <div>
          <div style={labelStyle}>Billed To</div>
          <div style={{ fontSize: 14, fontWeight: 600, marginTop: 8, color: COLORS.navy }}>
            {billedTo?.name}
          </div>
          {(billedTo?.addressLines || []).map((line) => (
            <div key={line} style={{ fontSize: 11, color: COLORS.muted, marginTop: 2 }}>
              {line}
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={labelStyle}>Invoice Date</div>
          <div style={{ fontSize: 14, marginTop: 8, color: COLORS.navy }}>{formatInvoiceDate(invoiceDate)}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={labelStyle}>Due Date</div>
          <div style={{ fontSize: 14, marginTop: 8, color: COLORS.navy }}>{formatInvoiceDate(dueDate)}</div>
        </div>
      </div>

      {/* Line items table */}
      <div style={{ marginBottom: 28 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 1.2fr 1.2fr 0.8fr",
            background: COLORS.navy,
            padding: "12px 18px",
            gap: 12,
          }}
        >
          {[
            ["Date", "left"],
            ["Start", "left"],
            ["End", "left"],
            ["Hours", "right"],
          ].map(([label, align]) => (
            <div
              key={label}
              style={{
                fontSize: 9,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#cfcfe0",
                fontWeight: 500,
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
              gridTemplateColumns: "1.4fr 1.2fr 1.2fr 0.8fr",
              gap: 12,
              padding: "12px 18px",
              background: idx % 2 === 1 ? COLORS.rowAlt : "#fff",
              borderBottom: `1px solid ${COLORS.divider}`,
              fontSize: 12,
              color: COLORS.navy,
            }}
          >
            <div>{formatInvoiceDate(row.date)}</div>
            <div>{formatTimeWithTz(row.start)}</div>
            <div>{formatTimeWithTz(row.end)}</div>
            <div style={{ textAlign: "right" }}>{formatHours(row.hours)}</div>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 40 }}>
        <div style={{ width: "45%", minWidth: 280 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "10px 16px",
              background: COLORS.rowAlt,
              fontSize: 12,
            }}
          >
            <span style={{ color: COLORS.navy }}>Total Hours</span>
            <span style={{ color: COLORS.navy, fontWeight: 500 }}>{formatHours(totalHours)} hrs</span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "10px 16px",
              fontSize: 12,
              borderBottom: `1px solid ${COLORS.divider}`,
            }}
          >
            <span style={{ color: COLORS.navy }}>Rate</span>
            <span style={{ color: COLORS.navy, fontWeight: 500 }}>${rate.toFixed(2)} / hr</span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              padding: "20px 16px 4px",
            }}
          >
            <span style={{ fontFamily: SERIF, fontSize: 26, color: COLORS.navy }}>Total Due</span>
            <span style={{ fontSize: 26, fontWeight: 600, color: COLORS.navy }}>
              ${totalDue.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          borderTop: `1px solid ${COLORS.divider}`,
          paddingTop: 18,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          fontSize: 11,
          color: COLORS.muted,
        }}
      >
        <div>
          <div>Thank you for your business.</div>
          <div style={{ marginTop: 4 }}>Please remit payment by {formatInvoiceDate(dueDate)}.</div>
        </div>
        <div>1 of 1</div>
      </div>
    </div>
  );
}
