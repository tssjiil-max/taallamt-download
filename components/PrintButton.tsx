"use client";

export function PrintButton({ label = "طباعة" }: { label?: string }) {
  return (
    <button className="btn secondary no-print" type="button" onClick={() => window.print()}>
      🖨️ {label}
    </button>
  );
}
