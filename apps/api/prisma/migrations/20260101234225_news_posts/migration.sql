-- CreateTable
CREATE TABLE "NewsPost" (
    "id" TEXT NOT NULL,
    "automatonId" TEXT NOT NULL,
    "authorUserId" TEXT,
    "channelId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "imageUrl" TEXT,
    "embedColor" TEXT,
    "source" TEXT NOT NULL DEFAULT 'panel',
    "discordMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NewsPost_automatonId_idx" ON "NewsPost"("automatonId");

-- CreateIndex
CREATE INDEX "NewsPost_channelId_idx" ON "NewsPost"("channelId");

-- AddForeignKey
ALTER TABLE "NewsPost" ADD CONSTRAINT "NewsPost_automatonId_fkey" FOREIGN KEY ("automatonId") REFERENCES "Automaton"("id") ON DELETE CASCADE ON UPDATE CASCADE;
