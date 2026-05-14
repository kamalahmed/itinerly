import { z } from "zod";
import type { SearchQuery } from "@/lib/types";

export const SearchSchema = z
  .object({
    origin: z.string().length(3).toUpperCase(),
    destination: z.string().length(3).toUpperCase(),
    departDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    returnDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    cabin: z
      .enum(["economy", "premium_economy", "business", "first"])
      .default("economy"),
    adults: z.coerce.number().int().min(1).max(9).default(1),
    children: z.coerce.number().int().min(0).max(9).default(0),
    infants: z.coerce.number().int().min(0).max(9).default(0),
    tripType: z
      .enum(["one_way", "round_trip", "multi_city"])
      .default("one_way"),
    preferredAirline: z.string().optional(),
    nonStopOnly: z
      .union([z.boolean(), z.string()])
      .transform((v) => v === true || v === "true" || v === "1")
      .default(false),
  })
  .transform((q): SearchQuery => q);

export type ParsedSearch = z.infer<typeof SearchSchema>;

/** Parse a plain record of search params; returns null on failure. */
export function parseSearchParams(
  params: Record<string, string | string[] | undefined>
): SearchQuery | null {
  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === "string") flat[k] = v;
    else if (Array.isArray(v) && v[0]) flat[k] = v[0];
  }
  const result = SearchSchema.safeParse(flat);
  return result.success ? result.data : null;
}

/** Build a /search querystring from a SearchQuery. */
export function toSearchParams(q: Partial<SearchQuery>): string {
  const p = new URLSearchParams();
  if (q.origin) p.set("origin", q.origin);
  if (q.destination) p.set("destination", q.destination);
  if (q.departDate) p.set("departDate", q.departDate);
  if (q.returnDate) p.set("returnDate", q.returnDate);
  if (q.cabin) p.set("cabin", q.cabin);
  if (q.adults != null) p.set("adults", String(q.adults));
  if (q.children != null) p.set("children", String(q.children));
  if (q.infants != null) p.set("infants", String(q.infants));
  if (q.tripType) p.set("tripType", q.tripType);
  if (q.preferredAirline) p.set("preferredAirline", q.preferredAirline);
  if (q.nonStopOnly) p.set("nonStopOnly", "true");
  return p.toString();
}
