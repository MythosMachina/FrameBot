-- AlterTable
ALTER TABLE "EconomyAccount" ADD COLUMN     "lastChatBonusAt" TIMESTAMP(3),
ADD COLUMN     "lastMessageRewardAt" TIMESTAMP(3),
ADD COLUMN     "messageCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "EconomyReminder" (
    "id" TEXT NOT NULL,
    "automatonId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "discordUserId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "note" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "EconomyReminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EconomyReminder_automatonId_idx" ON "EconomyReminder"("automatonId");

-- CreateIndex
CREATE INDEX "EconomyReminder_guildId_idx" ON "EconomyReminder"("guildId");

-- CreateIndex
CREATE INDEX "EconomyReminder_resolved_idx" ON "EconomyReminder"("resolved");

-- AddForeignKey
ALTER TABLE "EconomyReminder" ADD CONSTRAINT "EconomyReminder_automatonId_fkey" FOREIGN KEY ("automatonId") REFERENCES "Automaton"("id") ON DELETE CASCADE ON UPDATE CASCADE;
