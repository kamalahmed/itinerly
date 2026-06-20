/**
 * Schedule math for curated real flights.
 *
 * Research gives a real flight number, a (reliable) local departure time, and a
 * (sometimes imprecise) local arrival time at the destination. These helpers
 * turn that into a self-consistent { durationMinutes, arrivalTimeLocal,
 * arrivalDayOffset } that is always timezone-correct, trusting the researched
 * arrival only when it implies a sane block time.
 */

/** Minutes east of UTC for an IANA zone. The Bangladesh-outbound destinations
 * we cover don't observe DST, so a fixed reference instant is sufficient. */
export function tzOffsetMinutes(tz: string): number {
  const ref = new Date("2026-06-15T12:00:00Z");
  const asUtc = new Date(ref.toLocaleString("en-US", { timeZone: "UTC" }));
  const asTz = new Date(ref.toLocaleString("en-US", { timeZone: tz }));
  return Math.round((asTz.getTime() - asUtc.getTime()) / 60000);
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export interface ResolvedSchedule {
  durationMinutes: number;
  arrivalTimeLocal: string;
  arrivalDayOffset: number;
}

/**
 * @param departLocal  "HH:MM" local at the origin
 * @param arriveLocal  "HH:MM" local at the destination, or null
 * @param originTz / destTz  IANA timezones
 * @param nominalBlock fallback block time (minutes) for the route
 * @param tolerance    how far the researched-implied block may sit from nominal
 *                     before we distrust it (default 60 min)
 */
export function resolveSchedule(
  departLocal: string,
  arriveLocal: string | null,
  originTz: string,
  destTz: string,
  nominalBlock: number,
  tolerance = 45
): ResolvedSchedule {
  const origOff = tzOffsetMinutes(originTz);
  const destOff = tzOffsetMinutes(destTz);
  const dep = toMinutes(departLocal);

  let block = nominalBlock;
  if (arriveLocal) {
    const arr = toMinutes(arriveLocal);
    let implied = arr - dep + (origOff - destOff);
    while (implied <= 0) implied += 1440;
    if (Math.abs(implied - nominalBlock) <= tolerance) block = implied;
  }

  // Arrival expressed in destination local time, derived from dep + block so it
  // is always consistent with the duration we display.
  const arrTotal = dep - origOff + block + destOff;
  const arrivalDayOffset = Math.floor(arrTotal / 1440);
  const arrMin = ((arrTotal % 1440) + 1440) % 1440;
  const arrivalTimeLocal = `${pad(Math.floor(arrMin / 60))}:${pad(arrMin % 60)}`;

  return { durationMinutes: block, arrivalTimeLocal, arrivalDayOffset };
}
