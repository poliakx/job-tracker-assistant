-- CreateEnum
CREATE TYPE "SourceKind" AS ENUM ('greenhouse', 'lever', 'ashby', 'rss', 'jsonld');

-- CreateTable
CREATE TABLE "SourceConfig" (
    "id" TEXT NOT NULL,
    "kind" "SourceKind" NOT NULL,
    "identifier" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "termsUrl" TEXT NOT NULL,
    "termsNote" TEXT NOT NULL,
    "termsConfirmedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SourceConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SourceConfig_kind_identifier_key" ON "SourceConfig"("kind", "identifier");
