"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { addDays } from "date-fns";
import { ArrowLeftRight, Minus, Plus, Search, Users } from "lucide-react";
import type { Airport, Cabin, TripType } from "@/lib/types";
import { toSearchParams } from "@/lib/search-schema";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { AirportCombobox } from "@/components/airport-combobox";
import { DatePicker } from "@/components/date-picker";

export interface SearchFormInitial {
  origin?: Airport;
  destination?: Airport;
  departDate?: string;
  returnDate?: string;
  cabin?: Cabin;
  adults?: number;
  children?: number;
  infants?: number;
  tripType?: TripType;
}

const CABINS: { value: Cabin; label: string }[] = [
  { value: "economy", label: "Economy" },
  { value: "premium_economy", label: "Premium Economy" },
  { value: "business", label: "Business" },
  { value: "first", label: "First" },
];

function toDate(s?: string): Date | undefined {
  return s ? new Date(s + "T00:00:00") : undefined;
}
function toIso(d?: Date): string | undefined {
  return d ? d.toISOString().slice(0, 10) : undefined;
}

export function SearchForm({
  initial,
  className,
}: {
  initial?: SearchFormInitial;
  className?: string;
}) {
  const router = useRouter();
  const [tripType, setTripType] = React.useState<TripType>(
    initial?.tripType ?? "one_way"
  );
  const [origin, setOrigin] = React.useState<Airport | undefined>(
    initial?.origin
  );
  const [destination, setDestination] = React.useState<Airport | undefined>(
    initial?.destination
  );
  const [departDate, setDepartDate] = React.useState<Date | undefined>(
    toDate(initial?.departDate) ?? addDays(new Date(), 14)
  );
  const [returnDate, setReturnDate] = React.useState<Date | undefined>(
    toDate(initial?.returnDate)
  );
  const [cabin, setCabin] = React.useState<Cabin>(initial?.cabin ?? "economy");
  const [adults, setAdults] = React.useState(initial?.adults ?? 1);
  const [children, setChildren] = React.useState(initial?.children ?? 0);
  const [infants, setInfants] = React.useState(initial?.infants ?? 0);
  const [error, setError] = React.useState<string | null>(null);

  function swap() {
    setOrigin(destination);
    setDestination(origin);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!origin || !destination) {
      setError("Select both an origin and a destination.");
      return;
    }
    if (origin.iata === destination.iata) {
      setError("Origin and destination must differ.");
      return;
    }
    if (!departDate) {
      setError("Pick a departure date.");
      return;
    }
    if (tripType === "round_trip" && !returnDate) {
      setError("Pick a return date for a round trip.");
      return;
    }
    setError(null);
    const qs = toSearchParams({
      origin: origin.iata,
      destination: destination.iata,
      departDate: toIso(departDate),
      returnDate: tripType === "round_trip" ? toIso(returnDate) : undefined,
      cabin,
      adults,
      children,
      infants,
      tripType,
    });
    router.push(`/search?${qs}`);
  }

  const paxLabel = `${adults + children + infants} ${
    adults + children + infants === 1 ? "passenger" : "passengers"
  }`;

  return (
    <form
      onSubmit={submit}
      className={`rounded-2xl border bg-card p-4 shadow-lg sm:p-6 ${
        className ?? ""
      }`}
    >
      <Tabs
        value={tripType}
        onValueChange={(v) => setTripType(v as TripType)}
        className="mb-4"
      >
        <TabsList>
          <TabsTrigger value="one_way">One-way</TabsTrigger>
          <TabsTrigger value="round_trip">Round-trip</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid gap-3 lg:grid-cols-[1fr_auto_1fr]">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">From</Label>
          <AirportCombobox
            value={origin}
            onChange={setOrigin}
            placeholder="Origin airport"
            icon="origin"
          />
        </div>
        <div className="flex items-end justify-center pb-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={swap}
            aria-label="Swap origin and destination"
          >
            <ArrowLeftRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">To</Label>
          <AirportCombobox
            value={destination}
            onChange={setDestination}
            placeholder="Destination airport"
            icon="destination"
          />
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Departure</Label>
          <DatePicker
            value={departDate}
            onChange={setDepartDate}
            fromDate={new Date()}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Return</Label>
          <DatePicker
            value={returnDate}
            onChange={setReturnDate}
            placeholder={
              tripType === "round_trip" ? "Pick a date" : "One-way"
            }
            fromDate={departDate ?? new Date()}
            disabled={() => tripType !== "round_trip"}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Passengers</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start gap-2 font-normal"
              >
                <Users className="h-4 w-4 text-primary" />
                {paxLabel}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 space-y-3">
              <PaxRow
                label="Adults"
                hint="12+ years"
                value={adults}
                min={1}
                onChange={setAdults}
              />
              <PaxRow
                label="Children"
                hint="2–11 years"
                value={children}
                min={0}
                onChange={setChildren}
              />
              <PaxRow
                label="Infants"
                hint="Under 2 years"
                value={infants}
                min={0}
                max={adults}
                onChange={setInfants}
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Cabin</Label>
          <Select value={cabin} onValueChange={(v) => setCabin(v as Cabin)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CABINS.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && (
        <p className="mt-3 text-sm font-medium text-destructive">{error}</p>
      )}

      <Button type="submit" size="lg" className="mt-4 w-full sm:w-auto">
        <Search className="h-4 w-4" />
        Search flights
      </Button>
    </form>
  );
}

function PaxRow({
  label,
  hint,
  value,
  min,
  max = 9,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max?: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
        >
          <Minus className="h-3 w-3" />
        </Button>
        <span className="w-5 text-center text-sm font-semibold">{value}</span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
