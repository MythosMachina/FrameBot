-- CreateTable
CREATE TABLE "EconomyAccount" (
    "id" TEXT NOT NULL,
    "automatonId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "discordUserId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "lastDailyAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EconomyAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EconomyAccount_automatonId_idx" ON "EconomyAccount"("automatonId");

-- CreateIndex
CREATE INDEX "EconomyAccount_guildId_idx" ON "EconomyAccount"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "EconomyAccount_automatonId_guildId_discordUserId_key" ON "EconomyAccount"("automatonId", "guildId", "discordUserId");

-- AddForeignKey
ALTER TABLE "EconomyAccount" ADD CONSTRAINT "EconomyAccount_automatonId_fkey" FOREIGN KEY ("automatonId") REFERENCES "Automaton"("id") ON DELETE CASCADE ON UPDATE CASCADE;
