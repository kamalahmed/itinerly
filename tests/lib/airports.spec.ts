import { describe, it, expect } from "vitest";
import {
  getAirport,
  getAirline,
  getAllAirports,
  searchAirports,
} from "@/lib/airports";

describe("getAirport", () => {
  it("resolves a seeded airport by IATA", async () => {
    const dac = await getAirport("DAC");
    expect(dac).not.toBeNull();
    expect(dac?.city).toBe("Dhaka");
    expect(dac?.country).toBe("Bangladesh");
    expect(dac?.timeZone).toBe("Asia/Dhaka");
  });

  it("returns null for an unknown IATA code", async () => {
    expect(await getAirport("ZZZ")).toBeNull();
  });
});

describe("getAirline", () => {
  it("resolves a seeded airline by IATA", async () => {
    const ek = await getAirline("EK");
    expect(ek?.name).toBe("Emirates");
    expect(ek?.logo).toContain("EK");
  });

  it("returns null for an unknown airline code", async () => {
    expect(await getAirline("ZZ")).toBeNull();
  });
});

describe("getAllAirports", () => {
  it("returns the full seeded airport set", async () => {
    const all = await getAllAirports();
    expect(all.length).toBeGreaterThanOrEqual(60);
    expect(all.some((a) => a.iata === "DAC")).toBe(true);
  });
});

describe("searchAirports", () => {
  it("matches by IATA code", async () => {
    const r = await searchAirports("dxb");
    expect(r[0].iata).toBe("DXB");
  });

  it("matches by city name", async () => {
    const r = await searchAirports("dhaka");
    expect(r.some((a) => a.iata === "DAC")).toBe(true);
  });

  it("matches by airport name substring", async () => {
    const r = await searchAirports("heathrow");
    expect(r.some((a) => a.iata === "LHR")).toBe(true);
  });

  it("caps results at the requested limit", async () => {
    const r = await searchAirports("a", 5);
    expect(r.length).toBeLessThanOrEqual(5);
  });

  it("returns an empty array for a blank query", async () => {
    expect(await searchAirports("   ")).toEqual([]);
  });
});
