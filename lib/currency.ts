/**
 * Currency helpers. Hard-coded USD→BDT rate for now — a real FX API will be
 * wired in later. English/USD remains the primary display; BDT shown alongside.
 */
export const USD_TO_BDT = 119;

export function usdToBdt(usd: number): number {
  return Math.round(usd * USD_TO_BDT);
}

export function formatUSD(usd: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(usd);
}

export function formatBDT(bdt: number): string {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(bdt);
}

/** "$320 · ৳38,080" */
export function formatDual(usd: number): string {
  return `${formatUSD(usd)} · ${formatBDT(usdToBdt(usd))}`;
}
