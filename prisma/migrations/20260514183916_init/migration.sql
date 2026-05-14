-- CreateTable
CREATE TABLE "Country" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "iata2" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Airport" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "iata" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "timeZone" TEXT NOT NULL,
    "countryId" INTEGER NOT NULL,
    CONSTRAINT "Airport_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Airline" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "iata" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logo" TEXT
);

-- CreateTable
CREATE TABLE "SeededRoute" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "originIata" TEXT NOT NULL,
    "destinationIata" TEXT NOT NULL,
    "airlineIata" TEXT NOT NULL,
    "flightNumber" TEXT NOT NULL,
    "departureTimeLocal" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "aircraft" TEXT,
    "basePriceUSD" REAL NOT NULL
);

-- CreateTable
CREATE TABLE "SearchCache" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "offersJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pnr" TEXT NOT NULL,
    "passengerJson" TEXT NOT NULL,
    "offerJson" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "pdfPath" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "Country_iata2_key" ON "Country"("iata2");

-- CreateIndex
CREATE UNIQUE INDEX "Airport_iata_key" ON "Airport"("iata");

-- CreateIndex
CREATE UNIQUE INDEX "Airline_iata_key" ON "Airline"("iata");

-- CreateIndex
CREATE INDEX "SeededRoute_originIata_destinationIata_idx" ON "SeededRoute"("originIata", "destinationIata");

-- CreateIndex
CREATE UNIQUE INDEX "SearchCache_key_key" ON "SearchCache"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_pnr_key" ON "Booking"("pnr");
