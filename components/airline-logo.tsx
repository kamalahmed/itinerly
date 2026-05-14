import { cn } from "@/lib/utils";

/**
 * Airline "logo" rendered as a branded IATA badge. itinerly ships no bitmap
 * logo assets — a deterministic colored badge avoids broken-image states and
 * is good enough for the itinerary preview. See DECISIONS.md.
 */
const PALETTE = [
  "bg-sky-600",
  "bg-rose-600",
  "bg-emerald-600",
  "bg-amber-600",
  "bg-violet-600",
  "bg-cyan-700",
  "bg-indigo-600",
  "bg-teal-600",
  "bg-orange-600",
  "bg-fuchsia-600",
];

function colorFor(iata: string): string {
  let h = 0;
  for (let i = 0; i < iata.length; i++) h = (h * 31 + iata.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

export function AirlineLogo({
  iata,
  name,
  size = "md",
  className,
}: {
  iata: string;
  name?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dims = {
    sm: "h-7 w-7 text-[10px]",
    md: "h-9 w-9 text-xs",
    lg: "h-12 w-12 text-sm",
  }[size];
  return (
    <span
      title={name ?? iata}
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-lg font-bold text-white",
        colorFor(iata),
        dims,
        className
      )}
    >
      {iata}
    </span>
  );
}
