import { Plane } from "lucide-react";
import type { FlightOffer, FlightSegment } from "@/lib/types";
import { formatDuration, timeOf } from "@/lib/normalize";
import { formatUSD, formatBDT, usdToBdt } from "@/lib/currency";
import { AirlineLogo } from "@/components/airline-logo";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

function Leg({ segments, label }: { segments: FlightSegment[]; label: string }) {
  const first = segments[0];
  const last = segments[segments.length - 1];
  const total = segments.reduce((s, x) => s + x.durationMinutes, 0);
  const date = new Date(first.departureLocal).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Badge variant="secondary">{label}</Badge>
        <span className="text-xs text-muted-foreground">{date}</span>
      </div>
      <div className="flex items-center gap-3">
        <AirlineLogo
          iata={first.carrier.iata}
          name={first.carrier.name}
          size="sm"
        />
        <div className="text-center">
          <div className="font-bold leading-none">
            {timeOf(first.departureLocal)}
          </div>
          <div className="text-xs text-muted-foreground">
            {first.origin.iata}
          </div>
        </div>
        <div className="flex flex-1 flex-col items-center text-xs text-muted-foreground">
          <span>{formatDuration(total)}</span>
          <div className="flex w-full items-center gap-1">
            <Separator className="flex-1" />
            <Plane className="h-3 w-3 rotate-90 text-primary" />
            <Separator className="flex-1" />
          </div>
          <span>
            {segments.length === 1
              ? "Non-stop"
              : `${segments.length - 1} stop`}
          </span>
        </div>
        <div className="text-center">
          <div className="font-bold leading-none">
            {timeOf(last.arrivalLocal)}
          </div>
          <div className="text-xs text-muted-foreground">
            {last.destination.iata}
          </div>
        </div>
      </div>
      <div className="text-xs text-muted-foreground">
        {segments
          .map((s) => `${s.carrier.name} ${s.flightNumber}`)
          .join(" · ")}
      </div>
    </div>
  );
}

export function BookingSummary({ offer }: { offer: FlightOffer }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="mb-3 font-semibold">Itinerary</p>
      <div className="space-y-4">
        <Leg segments={offer.outboundSegments} label="Outbound" />
        {offer.returnSegments?.length ? (
          <>
            <Separator />
            <Leg segments={offer.returnSegments} label="Return" />
          </>
        ) : null}
      </div>
      <Separator className="my-4" />
      <div className="space-y-1 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>Base fare</span>
          <span>{formatUSD(offer.baseFareUSD)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Taxes &amp; surcharges</span>
          <span>{formatUSD(offer.taxesUSD)}</span>
        </div>
        <div className="flex justify-between pt-1 text-base font-bold">
          <span>Total</span>
          <span>{formatUSD(offer.totalPriceUSD)}</span>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Approx. in BDT</span>
          <span>{formatBDT(usdToBdt(offer.totalPriceUSD))}</span>
        </div>
      </div>
    </div>
  );
}
