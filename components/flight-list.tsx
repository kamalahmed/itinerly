"use client";

import * as React from "react";
import { SlidersHorizontal } from "lucide-react";
import type { FlightOffer } from "@/lib/types";
import { formatUSD } from "@/lib/currency";
import { FlightCard } from "@/components/flight-card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SortKey = "price" | "duration" | "departure";

const TIME_BUCKETS = [
  { id: "early", label: "Before 06:00", from: 0, to: 360 },
  { id: "morning", label: "06:00 – 12:00", from: 360, to: 720 },
  { id: "afternoon", label: "12:00 – 18:00", from: 720, to: 1080 },
  { id: "evening", label: "After 18:00", from: 1080, to: 1440 },
];

function depMinutes(o: FlightOffer): number {
  const t = o.outboundSegments[0].departureLocal.slice(11, 16);
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function FlightList({ offers }: { offers: FlightOffer[] }) {
  const airlines = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const o of offers) {
      for (const s of o.outboundSegments) map.set(s.carrier.iata, s.carrier.name);
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [offers]);

  const priceBounds = React.useMemo(() => {
    if (offers.length === 0) return { min: 0, max: 0 };
    const prices = offers.map((o) => o.totalPriceUSD);
    return { min: Math.floor(Math.min(...prices)), max: Math.ceil(Math.max(...prices)) };
  }, [offers]);

  const [sort, setSort] = React.useState<SortKey>("price");
  const [nonStopOnly, setNonStopOnly] = React.useState(false);
  const [maxPrice, setMaxPrice] = React.useState(priceBounds.max);
  const [selectedAirlines, setSelectedAirlines] = React.useState<Set<string>>(
    new Set()
  );
  const [selectedBuckets, setSelectedBuckets] = React.useState<Set<string>>(
    new Set()
  );
  const [showFilters, setShowFilters] = React.useState(false);

  React.useEffect(() => {
    setMaxPrice(priceBounds.max);
  }, [priceBounds.max]);

  const filtered = React.useMemo(() => {
    let list = offers.filter((o) => o.totalPriceUSD <= maxPrice);
    if (nonStopOnly) list = list.filter((o) => o.stops === 0);
    if (selectedAirlines.size > 0) {
      list = list.filter((o) =>
        o.outboundSegments.some((s) => selectedAirlines.has(s.carrier.iata))
      );
    }
    if (selectedBuckets.size > 0) {
      list = list.filter((o) => {
        const d = depMinutes(o);
        return TIME_BUCKETS.some(
          (b) => selectedBuckets.has(b.id) && d >= b.from && d < b.to
        );
      });
    }
    const sorted = [...list];
    if (sort === "price")
      sorted.sort((a, b) => a.totalPriceUSD - b.totalPriceUSD);
    else if (sort === "duration")
      sorted.sort(
        (a, b) => a.totalDurationMinutes - b.totalDurationMinutes
      );
    else sorted.sort((a, b) => depMinutes(a) - depMinutes(b));
    return sorted;
  }, [offers, maxPrice, nonStopOnly, selectedAirlines, selectedBuckets, sort]);

  function toggle(set: Set<string>, key: string): Set<string> {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  }

  const filters = (
    <div className="space-y-5">
      <div>
        <Label className="text-sm font-semibold">Stops</Label>
        <label className="mt-2 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={nonStopOnly}
            onChange={(e) => setNonStopOnly(e.target.checked)}
            className="h-4 w-4 accent-[hsl(var(--primary))]"
          />
          Non-stop only
        </label>
      </div>
      <Separator />
      <div>
        <Label className="text-sm font-semibold">
          Max price · {formatUSD(maxPrice)}
        </Label>
        <input
          type="range"
          min={priceBounds.min}
          max={priceBounds.max}
          value={maxPrice}
          onChange={(e) => setMaxPrice(Number(e.target.value))}
          className="mt-2 w-full accent-[hsl(var(--primary))]"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{formatUSD(priceBounds.min)}</span>
          <span>{formatUSD(priceBounds.max)}</span>
        </div>
      </div>
      <Separator />
      <div>
        <Label className="text-sm font-semibold">Departure time</Label>
        <div className="mt-2 space-y-1.5">
          {TIME_BUCKETS.map((b) => (
            <label key={b.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selectedBuckets.has(b.id)}
                onChange={() =>
                  setSelectedBuckets((s) => toggle(s, b.id))
                }
                className="h-4 w-4 accent-[hsl(var(--primary))]"
              />
              {b.label}
            </label>
          ))}
        </div>
      </div>
      <Separator />
      <div>
        <Label className="text-sm font-semibold">Airlines</Label>
        <div className="mt-2 space-y-1.5">
          {airlines.map(([iata, name]) => (
            <label key={iata} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selectedAirlines.has(iata)}
                onChange={() =>
                  setSelectedAirlines((s) => toggle(s, iata))
                }
                className="h-4 w-4 accent-[hsl(var(--primary))]"
              />
              {name}
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      <aside className="hidden lg:block">
        <div className="sticky top-20 rounded-xl border bg-card p-4">
          <p className="mb-3 flex items-center gap-2 font-semibold">
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </p>
          {filters}
        </div>
      </aside>

      <div>
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {filtered.length} of {offers.length} flight
            {offers.length === 1 ? "" : "s"}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="lg:hidden"
              onClick={() => setShowFilters((v) => !v)}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
            </Button>
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger className="w-[170px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="price">Cheapest first</SelectItem>
                <SelectItem value="duration">Shortest first</SelectItem>
                <SelectItem value="departure">Earliest departure</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {showFilters && (
          <div className="mb-4 rounded-xl border bg-card p-4 lg:hidden">
            {filters}
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
            No flights match your filters.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((o) => (
              <FlightCard key={o.id} offer={o} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
