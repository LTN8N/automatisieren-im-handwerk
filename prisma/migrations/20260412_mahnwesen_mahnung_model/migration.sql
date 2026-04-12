-- Migration: Mahnwesen — Mahnung-Tabelle + erweiterte RechnungStatus
-- AUT-54: Automatische Zahlungserinnerungen

-- Neue Enum-Werte für RechnungStatus
ALTER TYPE "RechnungStatus" ADD VALUE IF NOT EXISTS 'ERINNERUNG';
ALTER TYPE "RechnungStatus" ADD VALUE IF NOT EXISTS 'MAHNUNG_1';
ALTER TYPE "RechnungStatus" ADD VALUE IF NOT EXISTS 'MAHNUNG_2';
ALTER TYPE "RechnungStatus" ADD VALUE IF NOT EXISTS 'INKASSO';
ALTER TYPE "RechnungStatus" ADD VALUE IF NOT EXISTS 'STORNIERT';

-- Neuer Enum: Mahnstufe
CREATE TYPE "Mahnstufe" AS ENUM ('ERINNERUNG', 'MAHNUNG_1', 'MAHNUNG_2', 'INKASSO');

-- Tabelle: mahnungen (GoBD-konform: kein UPDATE, nur Soft-Storno)
CREATE TABLE "mahnungen" (
    "id"                TEXT        NOT NULL,
    "rechnung_id"       TEXT        NOT NULL,
    "tenant_id"         TEXT        NOT NULL,
    "mahnstufe"         "Mahnstufe" NOT NULL,
    "offener_betrag"    DECIMAL(10,2) NOT NULL,
    "mahngebuehr"       DECIMAL(10,2) NOT NULL DEFAULT 0,
    "verzugszinsen"     DECIMAL(10,2) NOT NULL DEFAULT 0,
    "verzugstage"       INTEGER     NOT NULL,
    "email_gesendet_an" TEXT,
    "gesendet_am"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "storniert"         BOOLEAN     NOT NULL DEFAULT false,
    "storno_grund"      TEXT,
    "archiviert_am"     TIMESTAMP(3),
    "notizen"           TEXT,

    CONSTRAINT "mahnungen_pkey" PRIMARY KEY ("id")
);

-- Indizes
CREATE INDEX "mahnungen_rechnung_id_idx" ON "mahnungen"("rechnung_id");
CREATE INDEX "mahnungen_tenant_id_idx"   ON "mahnungen"("tenant_id");

-- Foreign Keys
ALTER TABLE "mahnungen"
    ADD CONSTRAINT "mahnungen_rechnung_id_fkey"
    FOREIGN KEY ("rechnung_id") REFERENCES "rechnungen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "mahnungen"
    ADD CONSTRAINT "mahnungen_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
