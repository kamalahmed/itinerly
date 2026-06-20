import { describe, it, expect } from "vitest";
import { connectingOffers } from "@/lib/connections";
import { makeQuery } from "../fixtures";

describe("connectingOffers", () => {
  it("builds a 2-segment Emirates connection DAC→DXB→LHR", async () => {
    const offers = await connectingOffers(
      makeQuery({ destination: "LHR", departDate: "2026-08-15" })
    );
    const ek = offers.find((o) => o.outboundSegments[0].carrier.iata === "EK");
    expect(ek).toBeDefined();
    expect(ek!.stops).toBe(1);
    expect(ek!.outboundSegments).toHaveLength(2);

    const [s1, s2] = ek!.outboundSegments;
    expect(s1.flightNumber).toBe("EK 585");
    expect(s1.origin.iata).toBe("DAC");
    expect(s1.destination.iata).toBe("DXB");
    expect(s2.flightNumber).toBe("EK 001");
    expect(s2.origin.iata).toBe("DXB");
    expect(s2.destination.iata).toBe("LHR");

    // Leg 1 departs the search date; final arrival lands the same calendar day.
    expect(s1.departureLocal.slice(0, 10)).toBe("2026-08-15");
    expect(s2.arrivalLocal.slice(0, 10)).toBe("2026-08-15");
    expect(s2.arrivalLocal.slice(11, 16)).toBe("12:25");

    // Total duration includes both legs plus the hub layover.
    expect(ek!.totalDurationMinutes).toBeGreaterThan(
      s1.durationMinutes + s2.durationMinutes
    );
  });

  it("handles an overnight connection that lands the next day (EK DAC→IAD)", async () => {
    const offers = await connectingOffers(
      makeQuery({ destination: "IAD", departDate: "2026-08-15" })
    );
    const ek = offers.find((o) => o.outboundSegments[0].carrier.iata === "EK");
    expect(ek).toBeDefined();
    const [s1, s2] = ek!.outboundSegments;
    // EK587 departs 19:30 on the 15th, arrives DXB 22:30 the same day.
    expect(s1.departureLocal.slice(0, 10)).toBe("2026-08-15");
    expect(s1.arrivalLocal.slice(0, 10)).toBe("2026-08-15");
    // EK231 departs DXB 01:40 the next day and lands IAD the next day.
    expect(s2.departureLocal.slice(0, 10)).toBe("2026-08-16");
    expect(s2.arrivalLocal.slice(0, 10)).toBe("2026-08-16");
  });

  it("returns nothing for round-trip (connections are one-way for now)", async () => {
    const offers = await connectingOffers(
      makeQuery({ destination: "LHR", tripType: "round_trip", returnDate: "2026-08-29" })
    );
    expect(offers).toEqual([]);
  });
});
