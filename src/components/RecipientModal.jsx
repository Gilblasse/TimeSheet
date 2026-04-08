import { useEffect, useRef, useState } from "react";

// This component is designed to be conditionally mounted by the parent
// (e.g., {open && <RecipientModal ... />}). State is initialized from the
// defaultTo prop on mount, so unmount/remount naturally resets the form
// without needing a state-reset effect.

const COLORS = {
  navy: "#1a1a2e",
  muted: "#8a8a9a",
  divider: "#e6e6ec",
};

const SANS = "'DM Sans', sans-serif";

const labelStyle = {
  fontSize: 9,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: COLORS.muted,
  fontFamily: SANS,
  fontWeight: 500,
};

export default function RecipientModal({
  defaultTo = "",
  invoiceNumber,
  onCancel,
  onSubmit,
}) {
  const [to, setTo] = useState(defaultTo);
  const inputRef = useRef(null);

  // Focus the email input on mount.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onCancel?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = to.trim();
    if (!trimmed) return;
    onSubmit?.(trimmed);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Create Gmail Draft"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(26, 26, 46, 0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 1000,
        fontFamily: SANS,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel?.();
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          background: "#fff",
          borderRadius: 6,
          padding: "32px 36px 28px",
          width: "100%",
          maxWidth: 420,
          boxShadow: "0 24px 64px rgba(0,0,0,0.25)",
        }}
      >
        <div style={labelStyle}>Create Gmail Draft</div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: COLORS.navy,
            marginTop: 8,
            marginBottom: 22,
          }}
        >
          Invoice {invoiceNumber}
        </div>

        <label style={{ display: "block" }}>
          <div style={{ ...labelStyle, marginBottom: 6 }}>Recipient Email</div>
          <input
            ref={inputRef}
            type="email"
            required
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="name@example.com"
            style={{
              width: "100%",
              fontFamily: SANS,
              fontSize: 14,
              color: COLORS.navy,
              padding: "10px 12px",
              border: `1px solid ${COLORS.divider}`,
              borderRadius: 4,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </label>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            marginTop: 24,
          }}
        >
          <button
            type="button"
            onClick={onCancel}
            style={{
              fontFamily: SANS,
              fontSize: 11,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              padding: "10px 18px",
              background: "#fff",
              color: COLORS.navy,
              border: `1px solid ${COLORS.divider}`,
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
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
              cursor: "pointer",
            }}
          >
            Create Draft
          </button>
        </div>
      </form>
    </div>
  );
}
