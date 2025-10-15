-- CreateTable
CREATE TABLE "webhook_events" (
    "id" SERIAL NOT NULL,
    "stripeEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_stripeEventId_key" ON "webhook_events"("stripeEventId");

-- CreateIndex
CREATE INDEX "webhook_events_stripeEventId_idx" ON "webhook_events"("stripeEventId");
