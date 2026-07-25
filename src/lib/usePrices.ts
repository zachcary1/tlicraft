"use client";

import { useCallback, useEffect, useState } from "react";
import type { PricedItemType } from "@prisma/client";

export type PriceEntry = { value: number; currency: string };

type PriceRow = {
  itemType: PricedItemType;
  itemId: string;
  itemName: string;
  value: number;
  currency: string;
};

function priceKey(itemType: PricedItemType, itemId: string): string {
  return `${itemType}:${itemId}`;
}

// Fetches the latest price per item for the given itemTypes and exposes a getter/setter pair.
// Uses plain fetch (not lib/apiCache's getJSON) since that cache never invalidates — prices
// change whenever the user saves one, so a stale cached read would hide the update.
export function usePrices(itemTypes: PricedItemType[]) {
  const key = itemTypes.join(",");
  const [prices, setPrices] = useState<Record<string, PriceEntry>>({});

  useEffect(() => {
    if (!key) return;
    const params = new URLSearchParams();
    for (const t of key.split(",")) params.append("itemType", t);

    let cancelled = false;
    fetch(`/api/prices?${params.toString()}`)
      .then((res) => res.json())
      .then((rows: PriceRow[]) => {
        if (cancelled) return;
        const next: Record<string, PriceEntry> = {};
        for (const row of rows) next[priceKey(row.itemType, row.itemId)] = { value: row.value, currency: row.currency };
        setPrices(next);
      })
      .catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const getPrice = useCallback(
    (itemType: PricedItemType, itemId: string): PriceEntry | undefined => prices[priceKey(itemType, itemId)],
    [prices],
  );

  const setPrice = useCallback(
    async (itemType: PricedItemType, itemId: string, itemName: string, value: number) => {
      setPrices((prev) => ({ ...prev, [priceKey(itemType, itemId)]: { value, currency: prev[priceKey(itemType, itemId)]?.currency ?? "FE" } }));
      await fetch("/api/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemType, itemId, itemName, value }),
      });
    },
    [],
  );

  return { getPrice, setPrice };
}
