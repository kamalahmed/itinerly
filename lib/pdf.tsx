import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  renderToBuffer,
} from "@react-pdf/renderer";
import bwipjs from "bwip-js/node";
import type { FlightOffer, FlightSegment, PassengerDetails } from "@/lib/types";
import { formatDuration, timeOf, minutesBetween } from "@/lib/normalize";
import { formatUSD, formatBDT, usdToBdt } from "@/lib/currency";

/** Document heading — a clean, professional travel-itinerary title. */
export const DOC_TITLE = "Flight Itinerary";

/**
 * A single understated, honest footer line. This is an itinerary / reservation
 * summary, not a payment receipt — stated once, plainly, without a wall of
 * warnings.
 */
export const FOOTER_NOTE =
  "Travel itinerary and reservation summary — not a receipt of payment or a guarantee of confirmed seating.";

// ---------------------------------------------------------------------------
// Content model (pure, testable) — keeps presentation separate from data.
// ---------------------------------------------------------------------------

export interface ItinerarySegmentView {
  flightNumber: string;
  airlineName: string;
  airlineCode: string;
  cabin: string;
  aircraft?: string;
  baggage?: string;
  origin: { code: string; city: string; terminal?: string };
  destination: { code: string; city: string; terminal?: string };
  departTime: string;
  departDate: string;
  arriveTime: string;
  arriveDate: string;
  duration: string;
}

export interface ItineraryModel {
  brand: string;
  docTitle: string;
  pnr: string;
  issuedAt: string;
  status: string;
  passengers: {
    name: string;
    dob: string;
    nationality: string;
    passport: string;
  }[];
  legs: {
    label: string;
    segments: ItinerarySegmentView[];
    layovers: string[]; // layovers[i] sits between segments[i] and segments[i+1]
  }[];
  fare: { base: string; taxes: string; total: string; totalBdt: string };
  footerNote: string;
}

/** Deterministic "Sat, 15 Aug 2026" regardless of the server timezone. */
function segmentDate(iso: string): string {
  const d = new Date(iso.slice(0, 10) + "T12:00:00Z");
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function cabinLabel(cabin: string): string {
  const t = cabin.replace(/_/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function toSegmentView(s: FlightSegment): ItinerarySegmentView {
  return {
    flightNumber: s.flightNumber,
    airlineName: s.carrier.name,
    airlineCode: s.carrier.iata,
    cabin: cabinLabel(s.cabin),
    aircraft: s.aircraft,
    baggage: s.baggage,
    origin: {
      code: s.origin.iata,
      city: s.origin.city,
      terminal: s.originTerminal,
    },
    destination: {
      code: s.destination.iata,
      city: s.destination.city,
      terminal: s.destinationTerminal,
    },
    departTime: timeOf(s.departureLocal),
    departDate: segmentDate(s.departureLocal),
    arriveTime: timeOf(s.arrivalLocal),
    arriveDate: segmentDate(s.arrivalLocal),
    duration: formatDuration(s.durationMinutes),
  };
}

function legView(label: string, segments: FlightSegment[]) {
  const layovers: string[] = [];
  for (let i = 0; i < segments.length - 1; i++) {
    const mins = minutesBetween(
      segments[i].arrivalLocal,
      segments[i + 1].departureLocal
    );
    const at = segments[i].destination;
    layovers.push(
      `Connection in ${at.city} (${at.iata}) · ${formatDuration(mins)} layover`
    );
  }
  return { label, segments: segments.map(toSegmentView), layovers };
}

export function buildItineraryModel(
  offer: FlightOffer,
  passengers: PassengerDetails[],
  pnr: string,
  issuedAt: string
): ItineraryModel {
  const legs = [legView("Outbound", offer.outboundSegments)];
  if (offer.returnSegments?.length) {
    legs.push(legView("Return", offer.returnSegments));
  }
  return {
    brand: "itinerly",
    docTitle: DOC_TITLE,
    pnr,
    issuedAt,
    status: "Reserved",
    passengers: passengers.map((p) => ({
      name: `${p.title} ${p.fullName}`.trim(),
      dob: p.dob,
      nationality: p.nationality,
      passport: `${p.passportNumber} · exp ${p.passportExpiry}`,
    })),
    legs,
    fare: {
      base: formatUSD(offer.baseFareUSD),
      taxes: formatUSD(offer.taxesUSD),
      total: formatUSD(offer.totalPriceUSD),
      totalBdt: formatBDT(usdToBdt(offer.totalPriceUSD)),
    },
    footerNote: FOOTER_NOTE,
  };
}

// ---------------------------------------------------------------------------
// Presentation
// ---------------------------------------------------------------------------

const CYAN = "#0891b2";
const INK = "#0f172a";
const MUTED = "#64748b";
const FAINT = "#94a3b8";
const LINE = "#e2e8f0";
const PANEL = "#f8fafc";

const styles = StyleSheet.create({
  page: { paddingHorizontal: 0, paddingVertical: 0, fontSize: 9, color: INK, fontFamily: "Helvetica" },
  body: { paddingHorizontal: 34, paddingTop: 18, paddingBottom: 28 },

  // Header band
  band: {
    backgroundColor: CYAN,
    paddingHorizontal: 34,
    paddingVertical: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brand: { fontSize: 20, fontFamily: "Helvetica-Bold", color: "#ffffff" },
  docType: { fontSize: 9, color: "#cffafe", marginTop: 3, letterSpacing: 0.5 },
  refLabel: { fontSize: 7, color: "#cffafe", letterSpacing: 1, textAlign: "right" },
  refValue: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 3,
    color: "#ffffff",
    textAlign: "right",
  },

  // Meta strip
  metaRow: {
    flexDirection: "row",
    backgroundColor: PANEL,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    paddingHorizontal: 34,
    paddingVertical: 8,
  },
  metaItem: { marginRight: 28 },
  metaLabel: { fontSize: 6.5, color: FAINT, letterSpacing: 1 },
  metaValue: { fontSize: 9, fontFamily: "Helvetica-Bold", marginTop: 1 },

  sectionTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: CYAN,
    letterSpacing: 1.2,
    marginBottom: 7,
    marginTop: 16,
  },

  // Passenger table
  tHead: { flexDirection: "row", paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: LINE },
  tRow: { flexDirection: "row", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: LINE },
  th: { fontSize: 6.5, fontFamily: "Helvetica-Bold", color: FAINT, letterSpacing: 0.8 },
  td: { fontSize: 9 },

  // Segment card
  legLabel: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: MUTED, letterSpacing: 1, marginTop: 10, marginBottom: 5 },
  layover: {
    fontSize: 7.5,
    color: MUTED,
    backgroundColor: PANEL,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginBottom: 8,
    textAlign: "center",
  },
  card: { borderWidth: 1, borderColor: LINE, borderRadius: 6, padding: 12, marginBottom: 8 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  endCol: { width: "27%" },
  endColRight: { width: "27%", alignItems: "flex-end" },
  timeBig: { fontSize: 17, fontFamily: "Helvetica-Bold", color: INK },
  codeBig: { fontSize: 10, fontFamily: "Helvetica-Bold", color: CYAN, marginTop: 1 },
  cityMuted: { fontSize: 7.5, color: MUTED, marginTop: 2 },
  dateMuted: { fontSize: 7.5, color: FAINT, marginTop: 1 },
  mid: { flex: 1, alignItems: "center", paddingHorizontal: 6, paddingTop: 4 },
  flightNo: { fontSize: 9, fontFamily: "Helvetica-Bold" },
  airlineMuted: { fontSize: 7, color: MUTED, marginBottom: 4 },
  connector: { width: "70%", borderBottomWidth: 1, borderBottomColor: "#cbd5e1", marginVertical: 3 },
  durMuted: { fontSize: 7, color: FAINT, marginTop: 1 },
  cardBottom: {
    flexDirection: "row",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: LINE,
  },
  chip: { marginRight: 22 },
  chipLabel: { fontSize: 6, color: FAINT, letterSpacing: 0.6 },
  chipValue: { fontSize: 8, marginTop: 1 },

  // Fare
  fareRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  fareTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 6,
    marginTop: 3,
    borderTopWidth: 1,
    borderTopColor: LINE,
  },
  bold: { fontFamily: "Helvetica-Bold" },

  footer: { marginTop: 22, paddingTop: 12, borderTopWidth: 1, borderTopColor: LINE },
  barcode: { width: 170, height: 40 },
  footerNote: { fontSize: 7, color: FAINT, marginTop: 8, lineHeight: 1.4 },
});

function SegmentCard({ s }: { s: ItinerarySegmentView }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.endCol}>
          <Text style={styles.timeBig}>{s.departTime}</Text>
          <Text style={styles.codeBig}>{s.origin.code}</Text>
          <Text style={styles.cityMuted}>
            {s.origin.city}
            {s.origin.terminal ? ` · T${s.origin.terminal}` : ""}
          </Text>
          <Text style={styles.dateMuted}>{s.departDate}</Text>
        </View>

        <View style={styles.mid}>
          <Text style={styles.flightNo}>{s.flightNumber}</Text>
          <Text style={styles.airlineMuted}>{s.airlineName}</Text>
          <View style={styles.connector} />
          <Text style={styles.durMuted}>{s.duration} · Non-stop</Text>
        </View>

        <View style={styles.endColRight}>
          <Text style={styles.timeBig}>{s.arriveTime}</Text>
          <Text style={styles.codeBig}>{s.destination.code}</Text>
          <Text style={styles.cityMuted}>
            {s.destination.city}
            {s.destination.terminal ? ` · T${s.destination.terminal}` : ""}
          </Text>
          <Text style={styles.dateMuted}>{s.arriveDate}</Text>
        </View>
      </View>

      <View style={styles.cardBottom}>
        <View style={styles.chip}>
          <Text style={styles.chipLabel}>CABIN</Text>
          <Text style={styles.chipValue}>{s.cabin}</Text>
        </View>
        {s.aircraft ? (
          <View style={styles.chip}>
            <Text style={styles.chipLabel}>AIRCRAFT</Text>
            <Text style={styles.chipValue}>{s.aircraft}</Text>
          </View>
        ) : null}
        {s.baggage ? (
          <View style={styles.chip}>
            <Text style={styles.chipLabel}>BAGGAGE</Text>
            <Text style={styles.chipValue}>{s.baggage}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function TicketDocument({
  model,
  barcodeDataUri,
}: {
  model: ItineraryModel;
  barcodeDataUri: string;
}) {
  return (
    <Document title={`${model.brand} itinerary ${model.pnr}`} author="itinerly.app" subject="Flight itinerary">
      <Page size="A4" style={styles.page}>
        <View style={styles.band}>
          <View>
            <Text style={styles.brand}>{model.brand}</Text>
            <Text style={styles.docType}>{model.docTitle}</Text>
          </View>
          <View>
            <Text style={styles.refLabel}>BOOKING REFERENCE</Text>
            <Text style={styles.refValue}>{model.pnr}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>ISSUED</Text>
            <Text style={styles.metaValue}>{model.issuedAt}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>STATUS</Text>
            <Text style={styles.metaValue}>{model.status}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>PASSENGERS</Text>
            <Text style={styles.metaValue}>{model.passengers.length}</Text>
          </View>
        </View>

        <View style={styles.body}>
          <Text style={styles.sectionTitle}>PASSENGERS</Text>
          <View style={styles.tHead}>
            <Text style={[styles.th, { width: 200 }]}>NAME</Text>
            <Text style={[styles.th, { width: 90 }]}>DATE OF BIRTH</Text>
            <Text style={[styles.th, { width: 100 }]}>NATIONALITY</Text>
            <Text style={[styles.th, { flex: 1 }]}>PASSPORT</Text>
          </View>
          {model.passengers.map((p, i) => (
            <View style={styles.tRow} key={i}>
              <Text style={[styles.td, { width: 200 }]}>{p.name}</Text>
              <Text style={[styles.td, { width: 90 }]}>{p.dob}</Text>
              <Text style={[styles.td, { width: 100 }]}>{p.nationality}</Text>
              <Text style={[styles.td, { flex: 1 }]}>{p.passport}</Text>
            </View>
          ))}

          <Text style={styles.sectionTitle}>ITINERARY</Text>
          {model.legs.map((leg, li) => (
            <View key={li}>
              <Text style={styles.legLabel}>{leg.label.toUpperCase()}</Text>
              {leg.segments.map((s, si) => (
                <View key={si}>
                  <SegmentCard s={s} />
                  {leg.layovers[si] ? (
                    <Text style={styles.layover}>{leg.layovers[si]}</Text>
                  ) : null}
                </View>
              ))}
            </View>
          ))}

          <Text style={styles.sectionTitle}>FARE SUMMARY</Text>
          <View style={styles.fareRow}>
            <Text style={{ color: MUTED }}>Base fare</Text>
            <Text>{model.fare.base}</Text>
          </View>
          <View style={styles.fareRow}>
            <Text style={{ color: MUTED }}>Taxes &amp; surcharges</Text>
            <Text>{model.fare.taxes}</Text>
          </View>
          <View style={styles.fareTotal}>
            <Text style={styles.bold}>Total</Text>
            <Text style={styles.bold}>
              {model.fare.total} · {model.fare.totalBdt}
            </Text>
          </View>

          <View style={styles.footer}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image, not an HTML <img> */}
            <Image style={styles.barcode} src={barcodeDataUri} />
            <Text style={{ fontSize: 7, color: MUTED, marginTop: 2 }}>{model.pnr}</Text>
            <Text style={styles.footerNote}>
              {model.footerNote} · itinerly.app
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

/** Render a Code-128 barcode of the PNR as a PNG data URI. */
async function barcodeForPnr(pnr: string): Promise<string> {
  const png = await bwipjs.toBuffer({
    bcid: "code128",
    text: pnr,
    scale: 3,
    height: 10,
    includetext: false,
  });
  return `data:image/png;base64,${png.toString("base64")}`;
}

/** Render a professional flight-itinerary PDF to a Buffer. */
export async function renderTicketPdf(
  offer: FlightOffer,
  passengers: PassengerDetails[],
  pnr: string
): Promise<Buffer> {
  const issuedAt = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  const model = buildItineraryModel(offer, passengers, pnr, issuedAt);
  const barcodeDataUri = await barcodeForPnr(pnr);
  return renderToBuffer(
    <TicketDocument model={model} barcodeDataUri={barcodeDataUri} />
  );
}
