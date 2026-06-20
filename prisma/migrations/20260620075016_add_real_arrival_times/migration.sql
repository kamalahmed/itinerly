-- AlterTable
ALTER TABLE "SeededRoute" ADD COLUMN     "arrivalDayOffset" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "arrivalTimeLocal" TEXT;
