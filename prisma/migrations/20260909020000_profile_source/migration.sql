-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'community';

-- CreateIndex
CREATE INDEX "profiles_source_idx" ON "profiles"("source");

