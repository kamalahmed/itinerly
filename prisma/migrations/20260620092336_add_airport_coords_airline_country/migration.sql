-- AlterTable
ALTER TABLE "Airline" ADD COLUMN     "countryCode" TEXT;

-- AlterTable
ALTER TABLE "Airport" ADD COLUMN     "lat" DOUBLE PRECISION,
ADD COLUMN     "lon" DOUBLE PRECISION;
