"use client";

import * as React from "react";
import { ChevronDown, Plane, Clock, Luggage } from "lucide-react";
import type { FlightOffer, FlightSegment } from "@/lib/types";
import { formatDuration, timeOf } from "@/lib/normalize";
import { formatUSD, formatBDT, usdToBdt } from "@/lib/currency";
import { bnCity } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { createBookingDraft } from "@/app/booking/actions";
import { AirlineLogo } from "@/components/airline-logo";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function CityLabel({ city, iata }: { city: string; iata: string }) {
  const bn = bnCity(city);
  if (!bn) return <span>{iata}</span>;
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-help underline decoration-dotted underline-offset-2">
            {iata}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          {city} · {bn}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function SegmentRow({ seg }: { seg: FlightSegment }) {
  const dayOffset =
    new Date(seg.arrivalLocal).getUTCDate() -
    new Date(seg.departureLocal).getUTCDate();
  return (
    <div className="flex items-start gap-3 py-2">
      <AirlineLogo iata={seg.carrier.iata} name={seg.carrier.name} size="sm" />
      <div className="flex-1">
        <div className="flex items-center gap-2 text-sm font-medium">
          {seg.carrier.name}
          <span className="text-muted-foreground">· {seg.flightNumber}</span>
          {seg.aircraft && (
            <span className="text-xs text-muted-foreground">
              · {seg.aircraft}
            </span>
          )}
        </div>
        <div className="mt-1 grid grid-cols-[auto_1fr_auto] items-center gap-2 text-sm">
          <div>
            <span className="font-semibold">{timeOf(seg.departureLocal)}</span>{" "}
            <span className="text-muted-foreground">{seg.origin.iata}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Separator className="flex-1" />
            <Clock className="h-3 w-3" />
            {formatDuration(seg.durationMinutes)}
            <Separator className="flex-1" />
          </div>
          <div className="text-right">
            <span className="font-semibold">{timeOf(seg.arrivalLocal)}</span>{" "}
            <span className="text-muted-foreground">
              {seg.destination.iata}
            </span>
          </div>
        </div>
        <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
          <span>
            {seg.origin.city} → {seg.destination.city}
          </span>
          <span className="capitalize">{seg.cabin.replace("_", " ")}</span>
          {seg.baggage && (
            <span className="flex items-center gap-1">
              <Luggage className="h-3 w-3" />
              {seg.baggage}
            </span>
          )}
          {dayOffset !== 0 && (
            <span className="font-medium text-amber-600">
              Arrives {dayOffset > 0 ? `+${dayOffset}` : dayOffset} day
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function ItineraryStrip({
  segments,
  label,
}: {
  segments: FlightSegment[];
  label: string;
}) {
  const first = segments[0];
  const last = segments[segments.length - 1];
  const totalMin = segments.reduce((s, x) => s + x.durationMinutes, 0);
  const stops = segments.length - 1;
  return (
    <div className="flex items-center gap-4">
      <AirlineLogo
        iata={first.carrier.iata}
        name={first.carrier.name}
        size="md"
      />
      <div className="flex flex-1 items-center gap-3">
        <div className="text-center">
          <div className="text-lg font-bold leading-none">
            {timeOf(first.departureLocal)}
          </div>
          <div className="text-xs text-muted-foreground">
            <CityLabel city={first.origin.city} iata={first.origin.iata} />
          </div>
        </div>
        <div className="flex flex-1 flex-col items-center">
          <div className="text-[11px] text-muted-foreground">
            {formatDuration(totalMin)}
          </div>
          <div className="flex w-full items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            <Separator className="flex-1" />
            <Plane className="h-3 w-3 rotate-90 text-primary" />
            <Separator className="flex-1" />
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          </div>
          <div className="text-[11px] font-medium text-muted-foreground">
            {stops === 0 ? "Non-stop" : `${stops} stop${stops > 1 ? "s" : ""}`}
          </div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold leading-none">
            {timeOf(last.arrivalLocal)}
          </div>
          <div className="text-xs text-muted-foreground">
            <CityLabel
              city={last.destination.city}
              iata={last.destination.iata}
            />
          </div>
        </div>
      </div>
      <span className="hidden text-xs text-muted-foreground sm:block">
        {label}
      </span>
    </div>
  );
}

export function FlightCard({ offer }: { offer: FlightOffer }) {
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const isRoundTrip = !!offer.returnSegments?.length;

  return (
    <div className="rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md">
      <div className="grid gap-4 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="space-y-3">
          <ItineraryStrip
            segments={offer.outboundSegments}
            label="Outbound"
          />
          {isRoundTrip && (
            <>
              <Separator />
              <ItineraryStrip
                segments={offer.returnSegments!}
                label="Return"
              />
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 border-t pt-3 sm:flex-col sm:items-end sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
          <div className="text-right">
            <div className="text-xl font-bold text-foreground">
              {formatUSD(offer.totalPriceUSD)}
            </div>
            <div className="text-xs text-muted-foreground">
              {formatBDT(usdToBdt(offer.totalPriceUSD))}
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              total · {offer.provider}
            </div>
          </div>
          <form
            action={async () => {
              setSubmitting(true);
              await createBookingDraft(offer);
            }}
          >
            <Button type="submit" disabled={submitting}>
              {submitting ? "Selecting…" : "Select"}
            </Button>
          </form>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-center gap-1 border-t py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent"
      >
        Flight details
        <ChevronDown
          className={cn("h-3 w-3 transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="border-t bg-muted/30 px-4 py-2">
          <p className="pt-1 text-xs font-semibold uppercase text-muted-foreground">
            Outbound
          </p>
          {offer.outboundSegments.map((s, i) => (
            <SegmentRow key={`out-${i}`} seg={s} />
          ))}
          {isRoundTrip && (
            <>
              <p className="pt-1 text-xs font-semibold uppercase text-muted-foreground">
                Return
              </p>
              {offer.returnSegments!.map((s, i) => (
                <SegmentRow key={`ret-${i}`} seg={s} />
              ))}
            </>
          )}
          <Separator className="my-2" />
          <div className="flex justify-between py-1 text-xs text-muted-foreground">
            <span>
              Base fare {formatUSD(offer.baseFareUSD)} · Taxes &amp; surcharges{" "}
              {formatUSD(offer.taxesUSD)}
            </span>
            <span className="font-semibold text-foreground">
              {formatUSD(offer.totalPriceUSD)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
