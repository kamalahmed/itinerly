/** Shared helpers for turning provider data into the internal FlightOffer shape. */

/** "08:10" + 330 min, on a YYYY-MM-DD date → { departureLocal, arrivalLocal, dayOffset }. */
export function computeLocalTimes(
  departDate: string,
  departureTimeLocal: string,
  durationMinutes: number
): { departureLocal: string; arrivalLocal: string; dayOffset: number } {
  const [h, m] = departureTimeLocal.split(":").map(Number);
  const depMinutes = h * 60 + m;
  const arrTotal = depMinutes + durationMinutes;
  const dayOffset = Math.floor(arrTotal / (24 * 60));
  const arrMinutes = arrTotal % (24 * 60);

  const departureLocal = `${departDate}T${pad(h)}:${pad(m)}:00`;
  const arrDate = addDays(departDate, dayOffset);
  const arrivalLocal = `${arrDate}T${pad(Math.floor(arrMinutes / 60))}:${pad(
    arrMinutes % 60
  )}:00`;

  return { departureLocal, arrivalLocal, dayOffset };
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** "2026-05-19T08:10:00" → "08:10" */
export function timeOf(iso: string): string {
  return iso.slice(11, 16);
}

/** Minutes between two local ISO timestamps (ignores timezone offset). */
export function minutesBetween(startIso: string, endIso: string): number {
  return Math.round(
    (new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000
  );
}

/** Day offset between the date parts of two local ISO timestamps. */
export function dayOffsetBetween(startIso: string, endIso: string): number {
  const a = new Date(startIso.slice(0, 10) + "T00:00:00");
  const b = new Date(endIso.slice(0, 10) + "T00:00:00");
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function addDays(date: string, days: number): string {
  if (days === 0) return date;
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
