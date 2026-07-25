"use client";

import { useState } from "react";
import type { PriceEntry } from "@/lib/usePrices";

// Same asymmetric pill used for FE-cost badges in crafting/ItemCard.tsx (bg #848485, "0 6px 0
// 6px" radius, drop shadow) — self-contained here rather than imported, since this component is
// shared across unrelated page directories.
function FEIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <img
      src="/icons/materials/Flame%20Elementium.webp"
      alt="Flame Elementium"
      className={`inline-block object-contain shrink-0 ${className}`}
    />
  );
}

// Small inline editable price pill — click to type a value, Enter/blur saves, Escape cancels.
// Defaults to "0 FE" (with the Flame Elementium icon) when no price has been saved yet.
export default function PriceBadge({
  price,
  onSave,
  className = "",
}: {
  price: PriceEntry | undefined;
  onSave: (value: number) => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  function startEdit(e: React.MouseEvent) {
    e.stopPropagation();
    setDraft(price ? String(price.value) : "");
    setEditing(true);
  }

  function commit() {
    const n = parseFloat(draft);
    if (Number.isFinite(n) && n >= 0) onSave(n);
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        min="0"
        step="any"
        value={draft}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setEditing(false);
        }}
        placeholder="FE"
        className={`w-16 bg-[#d5d6d6] border border-[#1c1c1c] px-1.5 py-0.5 text-xs text-[#1a1a1a] focus:outline-none focus:border-zinc-600 ${className}`}
        style={{ borderRadius: "0 4px 0 4px" }}
      />
    );
  }

  return (
    <button
      onClick={startEdit}
      title="Click to set price"
      className={`shrink-0 flex items-center gap-1.5 text-[15px] font-semibold tracking-[-0.02em] bg-[#848485] text-[#e0ddd8] px-2.5 py-0.5 transition-colors hover:bg-[#93938f] ${className}`}
      style={{ borderRadius: "0 4px 0 4px", boxShadow: "0 2px 6px rgba(0,0,0,0.35)" }}
    >
      <span className="font-bold">{price ? Math.round(price.value).toLocaleString("en-US") : "0"}</span>
      <FEIcon />
    </button>
  );
}
