-- AlterTable
ALTER TABLE "trait_votes" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'survey';

-- CreateIndex
CREATE INDEX "trait_votes_source_idx" ON "trait_votes"("source");

