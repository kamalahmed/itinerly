import { describe, it, expect } from "vitest";
import {
  computeLocalTimes,
  formatDuration,
  timeOf,
  minutesBetween,
  dayOffsetBetween,
} from "@/lib/normalize";

describe("computeLocalTimes", () => {
  it("computes a same-day arrival", () => {
    const r = computeLocalTimes("2026-06-01", "09:55", 325);
    expect(r.departureLocal).toBe("2026-06-01T09:55:00");
    expect(r.arrivalLocal).toBe("2026-06-01T15:20:00");
    expect(r.dayOffset).toBe(0);
  });

  it("rolls over to the next day when the flight crosses midnight", () => {
    const r = computeLocalTimes("2026-06-01", "22:30", 330);
    expect(r.arrivalLocal).toBe("2026-06-02T04:00:00");
    expect(r.dayOffset).toBe(1);
  });

  it("handles multi-day long-haul durations", () => {
    const r = computeLocalTimes("2026-06-01", "23:00", 60 * 26);
    expect(r.dayOffset).toBe(2);
    expect(r.arrivalLocal.startsWith("2026-06-03")).toBe(true);
  });

  it("pads single-digit hours and minutes", () => {
    const r = computeLocalTimes("2026-06-01", "6:5", 50);
    expect(r.departureLocal).toBe("2026-06-01T06:05:00");
    expect(r.arrivalLocal).toBe("2026-06-01T06:55:00");
  });
});

describe("formatDuration", () => {
  it("formats hours and minutes", () => {
    expect(formatDuration(325)).toBe("5h 25m");
  });
  it("drops minutes when zero", () => {
    expect(formatDuration(120)).toBe("2h");
  });
  it("handles sub-hour durations", () => {
    expect(formatDuration(45)).toBe("0h 45m");
  });
});

describe("timeOf", () => {
  it("extracts HH:MM from an ISO local string", () => {
    expect(timeOf("2026-06-01T09:55:00")).toBe("09:55");
  });
});

describe("minutesBetween", () => {
  it("returns the minute difference between two ISO timestamps", () => {
    expect(
      minutesBetween("2026-06-01T09:00:00", "2026-06-01T11:30:00")
    ).toBe(150);
  });
});

describe("dayOffsetBetween", () => {
  it("returns 0 for same-day timestamps", () => {
    expect(
      dayOffsetBetween("2026-06-01T22:00:00", "2026-06-01T23:30:00")
    ).toBe(0);
  });
  it("returns 1 across a midnight boundary", () => {
    expect(
      dayOffsetBetween("2026-06-01T22:00:00", "2026-06-02T03:00:00")
    ).toBe(1);
  });
});
