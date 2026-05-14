import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { makeQuery } from "../fixtures";

const { createMock } = vi.hoisted(() => ({ createMock: vi.fn() }));
vi.mock("@duffel/api", () => ({
  Duffel: vi.fn(() => ({ offerRequests: { create: createMock } })),
}));

import { duffel } from "@/lib/providers/duffel";

function duffelSegment(over: Record<string, unknown> = {}) {
  return {
    marketing_carrier: {
      iata_code: "FZ",
      name: "flydubai",
      logo_symbol_url: "https://img/FZ.png",
    },
    marketing_carrier_flight_number: "502",
    origin: {
      iata_code: "DAC",
      name: "Hazrat Shahjalal International Airport",
      city_name: "Dhaka",
      iata_country_code: "BD",
      time_zone: "Asia/Dhaka",
    },
    destination: {
      iata_code: "DXB",
      name: "Dubai International Airport",
      city_name: "Dubai",
      iata_country_code: "AE",
      time_zone: "Asia/Dubai",
    },
    departing_at: "2026-06-01T08:10:00",
    arriving_at: "2026-06-01T11:50:00",
    duration: "PT5H40M",
    aircraft: { name: "Boeing 737 MAX 8" },
    passengers: [{ cabin_class: "economy" }],
    ...over,
  };
}

function duffelOffer(over: Record<string, unknown> = {}) {
  return {
    id: "off_1",
    total_amount: "322.50",
    base_amount: "230.00",
    tax_amount: "92.50",
    expires_at: "2026-06-01T00:00:00Z",
    slices: [{ duration: "PT5H40M", segments: [duffelSegment()] }],
    ...over,
  };
}

beforeEach(() => {
  process.env.DUFFEL_API_KEY = "duffel_test_key";
  createMock.mockReset();
});

afterEach(() => {
  delete process.env.DUFFEL_API_KEY;
});

describe("duffel provider", () => {
  it("normalizes a one-way offer", async () => {
    createMock.mockResolvedValue({ data: { offers: [duffelOffer()] } });

    const offers = await duffel.searchOffers(makeQuery());
    expect(offers).toHaveLength(1);
    const o = offers[0];
    expect(o.id).toBe("duffel-off_1");
    expect(o.provider).toBe("duffel");
    expect(o.totalPriceUSD).toBe(322.5);
    expect(o.baseFareUSD).toBe(230);
    expect(o.taxesUSD).toBe(92.5);
    expect(o.stops).toBe(0);
    expect(o.expiresAt).toBe("2026-06-01T00:00:00Z");
  });

  it("maps segment fields", async () => {
    createMock.mockResolvedValue({ data: { offers: [duffelOffer()] } });
    const [o] = await duffel.searchOffers(makeQuery());
    const seg = o.outboundSegments[0];
    expect(seg.flightNumber).toBe("FZ 502");
    expect(seg.carrier.name).toBe("flydubai");
    expect(seg.carrier.logo).toBe("https://img/FZ.png");
    expect(seg.origin.iata).toBe("DAC");
    expect(seg.destination.city).toBe("Dubai");
    expect(seg.durationMinutes).toBe(340);
    expect(seg.aircraft).toBe("Boeing 737 MAX 8");
  });

  it("sends one slice for a one-way query", async () => {
    createMock.mockResolvedValue({ data: { offers: [] } });
    await duffel.searchOffers(makeQuery());
    expect(createMock).toHaveBeenCalledOnce();
    expect(createMock.mock.calls[0][0].slices).toHaveLength(1);
  });

  it("sends two slices and maps a return leg for a round-trip query", async () => {
    createMock.mockResolvedValue({
      data: {
        offers: [
          duffelOffer({
            slices: [
              { duration: "PT5H40M", segments: [duffelSegment()] },
              {
                duration: "PT5H30M",
                segments: [
                  duffelSegment({
                    marketing_carrier_flight_number: "503",
                    origin: { iata_code: "DXB", city_name: "Dubai" },
                    destination: { iata_code: "DAC", city_name: "Dhaka" },
                  }),
                ],
              },
            ],
          }),
        ],
      },
    });

    const [o] = await duffel.searchOffers(
      makeQuery({ tripType: "round_trip", returnDate: "2026-06-10" })
    );
    expect(createMock.mock.calls[0][0].slices).toHaveLength(2);
    expect(o.returnSegments).toHaveLength(1);
    expect(o.returnSegments![0].origin.iata).toBe("DXB");
  });

  it("throws when DUFFEL_API_KEY is missing", async () => {
    delete process.env.DUFFEL_API_KEY;
    await expect(duffel.searchOffers(makeQuery())).rejects.toThrow(
      /DUFFEL_API_KEY/
    );
  });
});
