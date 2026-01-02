-- CreateTable
CREATE TABLE "BadWordCount" (
    "id" TEXT NOT NULL,
    "automatonId" TEXT NOT NULL,
    "discordUserId" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "lastMatchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BadWordCount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BadWordCount_automatonId_discordUserId_key" ON "BadWordCount"("automatonId", "discordUserId");

-- CreateIndex
CREATE INDEX "BadWordCount_automatonId_idx" ON "BadWordCount"("automatonId");

-- CreateIndex
CREATE INDEX "BadWordCount_discordUserId_idx" ON "BadWordCount"("discordUserId");

-- AddForeignKey
ALTER TABLE "BadWordCount" ADD CONSTRAINT "BadWordCount_automatonId_fkey" FOREIGN KEY ("automatonId") REFERENCES "Automaton"("id") ON DELETE CASCADE ON UPDATE CASCADE;
