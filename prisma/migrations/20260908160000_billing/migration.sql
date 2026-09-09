-- AlterTable
ALTER TABLE "users" ADD COLUMN     "plan" TEXT NOT NULL DEFAULT 'free',
ADD COLUMN     "plan_renews_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "plans" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price_cents" INTEGER NOT NULL DEFAULT 0,
    "api_rate_limit" INTEGER NOT NULL,
    "max_api_keys" INTEGER NOT NULL,
    "features" JSONB NOT NULL DEFAULT '{}',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "plan_slug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "provider" TEXT NOT NULL DEFAULT 'manual',
    "provider_ref" TEXT,
    "current_period_start" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "current_period_end" TIMESTAMP(3) NOT NULL,
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plans_slug_key" ON "plans"("slug");

-- CreateIndex
CREATE INDEX "subscriptions_user_id_idx" ON "subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_slug_fkey" FOREIGN KEY ("plan_slug") REFERENCES "plans"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Seed the plan rows. Mirrors src/lib/plans.ts; the FK above requires these to
-- exist before any subscription can be created.
INSERT INTO "plans" ("id", "slug", "name", "price_cents", "api_rate_limit", "max_api_keys", "features", "sort_order")
VALUES
  (gen_random_uuid(), 'free',     'Free',     0,    60,   2, '{"advancedVectors": false, "adFree": false, "compatibility": true,  "bulkExport": false}'::jsonb, 0),
  (gen_random_uuid(), 'pro',      'Pro',      900,  600,  10, '{"advancedVectors": true,  "adFree": true,  "compatibility": true,  "bulkExport": true}'::jsonb,  1),
  (gen_random_uuid(), 'business', 'Business', 4900, 3000, 50, '{"advancedVectors": true,  "adFree": true,  "compatibility": true,  "bulkExport": true}'::jsonb,  2)
ON CONFLICT ("slug") DO NOTHING;
