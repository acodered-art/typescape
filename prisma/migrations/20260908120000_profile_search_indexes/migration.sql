-- Fallback search indexes for the Postgres path used when MeiliSearch is
-- unreachable. The profiles route does `ILIKE '%term%'` on name/description/
-- bio, which cannot use a plain btree index; pg_trgm GIN indexes make it
-- index-assisted instead of a sequential scan.
--
-- CREATE EXTENSION needs superuser on some setups; the container's typescape
-- role owns the database, so this succeeds there. If it fails in another
-- environment, create the extension out of band and re-run `migrate deploy`.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Profiles: name / description / bio are the searchable text columns.
CREATE INDEX IF NOT EXISTS "profiles_name_trgm_idx"
  ON "profiles" USING GIN ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "profiles_description_trgm_idx"
  ON "profiles" USING GIN ("description" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "profiles_bio_trgm_idx"
  ON "profiles" USING GIN ("bio" gin_trgm_ops);

-- The browse/sort paths order by view_count desc and created_at desc.
CREATE INDEX IF NOT EXISTS "profiles_view_count_idx" ON "profiles" ("view_count" DESC);
CREATE INDEX IF NOT EXISTS "profiles_created_at_idx" ON "profiles" ("created_at" DESC);

-- profile_typings backs both the single-type filter and the multi-type AND
-- filter (one EXISTS per requested type).
CREATE INDEX IF NOT EXISTS "profile_typings_type_value_idx"
  ON "profile_typings" ("type_value");

-- Activity feed reads the newest rows for a set of users.
CREATE INDEX IF NOT EXISTS "activities_user_id_created_at_idx"
  ON "activities" ("user_id", "created_at" DESC);
