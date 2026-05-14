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
import { formatDuration, timeOf } from "@/lib/normalize";
import { formatUSD, formatBDT, usdToBdt } from "@/lib/currency";

const CYAN = "#0891b2";
const INK = "#0f172a";
const MUTED = "#64748b";
const LINE = "#e2e8f0";

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 9,
    color: INK,
    fontFamily: "Helvetica",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  brand: { fontSize: 18, fontFamily: "Helvetica-Bold", color: CYAN },
  docType: { fontSize: 10, color: MUTED, marginTop: 2 },
  pnrBox: {
    borderWidth: 1,
    borderColor: CYAN,
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignItems: "center",
  },
  pnrLabel: { fontSize: 7, color: MUTED },
  pnrValue: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 3,
    color: INK,
  },
  divider: { borderBottomWidth: 1, borderBottomColor: LINE, marginVertical: 10 },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
    color: INK,
  },
  tableHead: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
  },
  th: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: MUTED },
  td: { fontSize: 8.5 },
  legBadge: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: CYAN,
    marginTop: 10,
    marginBottom: 4,
  },
  fareRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  fareTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 4,
    marginTop: 2,
    borderTopWidth: 1,
    borderTopColor: LINE,
  },
  footer: { marginTop: 16 },
  barcode: { width: 200, height: 48 },
  disclaimer: {
    marginTop: 10,
    fontSize: 7.5,
    color: MUTED,
    lineHeight: 1.4,
  },
});

// Column layout shared by header + rows.
const COLS = {
  flight: 70,
  route: 150,
  dep: 80,
  arr: 80,
  dur: 55,
  extra: 0, // flex
};

function segmentDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

function SegmentTable({
  label,
  segments,
}: {
  label: string;
  segments: FlightSegment[];
}) {
  return (
    <View>
      <Text style={styles.legBadge}>{label.toUpperCase()}</Text>
      <View style={styles.tableHead}>
        <Text style={[styles.th, { width: COLS.flight }]}>FLIGHT</Text>
        <Text style={[styles.th, { width: COLS.route }]}>ROUTE</Text>
        <Text style={[styles.th, { width: COLS.dep }]}>DEPARTS</Text>
        <Text style={[styles.th, { width: COLS.arr }]}>ARRIVES</Text>
        <Text style={[styles.th, { width: COLS.dur }]}>DURATION</Text>
        <Text style={[styles.th, { flex: 1 }]}>CLASS / BAG</Text>
      </View>
      {segments.map((s, i) => (
        <View style={styles.tableRow} key={i}>
          <View style={{ width: COLS.flight }}>
            <Text style={styles.td}>{s.flightNumber}</Text>
            <Text style={{ fontSize: 7, color: MUTED }}>{s.carrier.name}</Text>
          </View>
          <View style={{ width: COLS.route }}>
            <Text style={styles.td}>
              {s.origin.city} ({s.origin.iata}) →{" "}
            </Text>
            <Text style={styles.td}>
              {s.destination.city} ({s.destination.iata})
            </Text>
          </View>
          <View style={{ width: COLS.dep }}>
            <Text style={styles.td}>{timeOf(s.departureLocal)}</Text>
            <Text style={{ fontSize: 7, color: MUTED }}>
              {segmentDate(s.departureLocal)}
              {s.originTerminal ? ` · T${s.originTerminal}` : ""}
            </Text>
          </View>
          <View style={{ width: COLS.arr }}>
            <Text style={styles.td}>{timeOf(s.arrivalLocal)}</Text>
            <Text style={{ fontSize: 7, color: MUTED }}>
              {segmentDate(s.arrivalLocal)}
              {s.destinationTerminal ? ` · T${s.destinationTerminal}` : ""}
            </Text>
          </View>
          <View style={{ width: COLS.dur }}>
            <Text style={styles.td}>
              {formatDuration(s.durationMinutes)}
            </Text>
            {s.aircraft ? (
              <Text style={{ fontSize: 7, color: MUTED }}>{s.aircraft}</Text>
            ) : null}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.td, { textTransform: "capitalize" }]}>
              {s.cabin.replace("_", " ")}
            </Text>
            {s.baggage ? (
              <Text style={{ fontSize: 7, color: MUTED }}>{s.baggage}</Text>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}

function TicketDocument({
  offer,
  passengers,
  pnr,
  barcodeDataUri,
  issuedAt,
}: {
  offer: FlightOffer;
  passengers: PassengerDetails[];
  pnr: string;
  barcodeDataUri: string;
  issuedAt: string;
}) {
  return (
    <Document
      title={`itinerly itinerary ${pnr}`}
      author="itinerly.app"
      subject="Flight itinerary for visa application"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.brand}>itinerly</Text>
            <Text style={styles.docType}>
              Flight Itinerary · for visa application
            </Text>
          </View>
          <View style={styles.pnrBox}>
            <Text style={styles.pnrLabel}>BOOKING REFERENCE</Text>
            <Text style={styles.pnrValue}>{pnr}</Text>
          </View>
        </View>
        <Text style={{ fontSize: 7.5, color: MUTED }}>
          Issued {issuedAt} · itinerly.app
        </Text>

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Passengers</Text>
        <View style={styles.tableHead}>
          <Text style={[styles.th, { width: 200 }]}>NAME</Text>
          <Text style={[styles.th, { width: 90 }]}>DATE OF BIRTH</Text>
          <Text style={[styles.th, { width: 100 }]}>NATIONALITY</Text>
          <Text style={[styles.th, { flex: 1 }]}>PASSPORT</Text>
        </View>
        {passengers.map((p, i) => (
          <View style={styles.tableRow} key={i}>
            <Text style={[styles.td, { width: 200 }]}>
              {p.title} {p.fullName}
            </Text>
            <Text style={[styles.td, { width: 90 }]}>{p.dob}</Text>
            <Text style={[styles.td, { width: 100 }]}>{p.nationality}</Text>
            <Text style={[styles.td, { flex: 1 }]}>
              {p.passportNumber} · exp {p.passportExpiry}
            </Text>
          </View>
        ))}

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Flight details</Text>
        <SegmentTable label="Outbound" segments={offer.outboundSegments} />
        {offer.returnSegments?.length ? (
          <SegmentTable label="Return" segments={offer.returnSegments} />
        ) : null}

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Fare summary</Text>
        <View style={styles.fareRow}>
          <Text style={{ color: MUTED }}>Base fare</Text>
          <Text>{formatUSD(offer.baseFareUSD)}</Text>
        </View>
        <View style={styles.fareRow}>
          <Text style={{ color: MUTED }}>Taxes &amp; surcharges</Text>
          <Text>{formatUSD(offer.taxesUSD)}</Text>
        </View>
        <View style={styles.fareTotal}>
          <Text style={{ fontFamily: "Helvetica-Bold" }}>Total</Text>
          <Text style={{ fontFamily: "Helvetica-Bold" }}>
            {formatUSD(offer.totalPriceUSD)} ·{" "}
            {formatBDT(usdToBdt(offer.totalPriceUSD))}
          </Text>
        </View>

        <View style={styles.footer}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image, not an HTML <img> */}
          <Image style={styles.barcode} src={barcodeDataUri} />
          <Text style={{ fontSize: 7, color: MUTED, marginTop: 2 }}>
            {pnr}
          </Text>
          <Text style={styles.disclaimer}>
            This document is a flight itinerary generated for visa application
            purposes only. It is NOT a confirmed airline booking and no seat
            has been purchased or paid for. Flight schedules are indicative and
            subject to change by the operating carrier. itinerly.app accepts no
            liability for travel undertaken on the basis of this document.
          </Text>
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
    height: 12,
    includetext: false,
  });
  return `data:image/png;base64,${png.toString("base64")}`;
}

/** Render an embassy-style itinerary PDF to a Buffer. */
export async function renderTicketPdf(
  offer: FlightOffer,
  passengers: PassengerDetails[],
  pnr: string
): Promise<Buffer> {
  const barcodeDataUri = await barcodeForPnr(pnr);
  const issuedAt = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  return renderToBuffer(
    <TicketDocument
      offer={offer}
      passengers={passengers}
      pnr={pnr}
      barcodeDataUri={barcodeDataUri}
      issuedAt={issuedAt}
    />
  );
}
