import { describe, it, expect } from "vitest";
import { tzOffsetMinutes, resolveSchedule } from "@/lib/schedule";

const DAC = "Asia/Dhaka"; // +6
const DXB = "Asia/Dubai"; // +4
const SIN = "Asia/Singapore"; // +8

describe("tzOffsetMinutes", () => {
  it("returns the correct UTC offsets", () => {
    expect(tzOffsetMinutes(DAC)).toBe(360);
    expect(tzOffsetMinutes(DXB)).toBe(240);
    expect(tzOffsetMinutes(SIN)).toBe(480);
  });
});

describe("resolveSchedule", () => {
  it("keeps a sane researched arrival (FZ502 DAC-DXB 08:10→12:00)", () => {
    const r = resolveSchedule("08:10", "12:00", DAC, DXB, 330);
    expect(r.arrivalTimeLocal).toBe("12:00");
    expect(r.arrivalDayOffset).toBe(0);
    expect(r.durationMinutes).toBe(350); // 5h50m block, within tolerance
  });

  it("handles an overnight arrival (FZ524 DAC-DXB 22:00→01:05+1)", () => {
    const r = resolveSchedule("22:00", "01:05", DAC, DXB, 330);
    expect(r.arrivalTimeLocal).toBe("01:05");
    expect(r.arrivalDayOffset).toBe(1);
    expect(r.durationMinutes).toBe(305);
  });

  it("rejects an implausible researched arrival and falls back to nominal", () => {
    // EK587 was researched as 19:30→21:45, implying a 4h15m DAC-DXB block —
    // too short, so we use the nominal 5h30m and derive a consistent arrival.
    const r = resolveSchedule("19:30", "21:45", DAC, DXB, 330);
    expect(r.durationMinutes).toBe(330);
    expect(r.arrivalTimeLocal).toBe("23:00"); // 19:30 + 5h30m, tz-adjusted
    expect(r.arrivalDayOffset).toBe(0);
  });

  it("derives arrival from nominal block when no arrival is provided", () => {
    const r = resolveSchedule("08:25", null, DAC, SIN, 255);
    expect(r.durationMinutes).toBe(255);
    // 08:25 +255m block, +2h tz (SIN ahead of DAC) → 14:40 same day
    expect(r.arrivalTimeLocal).toBe("14:40");
    expect(r.arrivalDayOffset).toBe(0);
  });
});
