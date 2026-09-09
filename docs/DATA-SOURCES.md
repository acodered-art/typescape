# Character data sources — what we can use, and what we can't

Every entry below was **tested live** rather than taken from documentation, and
every licence was read from the source itself wherever possible. Two claims in
earlier research turned out to be wrong; those are called out.

## Imported (in use)

Run `scripts/import-characters.mts`. Default cap is 60 per source.

| Source | Data | Licence position | Imported |
|---|---|---|---|
| **SWAPI** `swapi.tech` | name, gender, height, films | Open fan API built on Lucasfilm material; no restriction asserted, widely republished | 60 |
| **Rick and Morty API** `rickandmortyapi.com` | name, image, species, status | Open, free, no key, no restriction asserted | 56 |
| **Disney Character API** `api.disneyapi.dev` | name, image, films | Open fan API, no key, no restriction asserted | 60 |

**What we take:** name, image, and which franchise. **What we never take:**
personality types. Types are the community's work, and importing someone else's
would import their licence problem too.

Every row is stamped `source = "import:<provider>"`, so imported skeletons are
filterable, attributable, and never mistaken for a reader-created file.

### Caveats on the imported data

- These are *fan* APIs. "No restriction asserted" is not the same as "explicitly
  permitted". If a source ever publishes terms, re-read them before scaling up.
- The Disney set is alphabetical and mostly minor characters (`.GIFfany`,
  `90's Adventure Bear`). Importing all 9,821 would bury real content, which is
  why the cap exists.
- Rick and Morty is full of variants (`Alien Morty`, `Antenna Morty`) — 9 of the
  first 56 are Morty variants. Useful for a typing game, noise for a database.

## Verified-usable, not yet wired up

| Source | Why not yet |
|---|---|
| **Wikidata** | Genuinely CC0 and the best licence here, but **rate-limited to 1 request/minute** during a current outage, and it has no property mapping characters to personality types. Worth adding for film/book franchises once the endpoint recovers. |

## Sketchy — do not use without written permission

| Source | Problem |
|---|---|
| **Personality Database** (personality-database.com) | The obvious one, and the one to avoid. No API, no export, and its terms prohibit commercial use without written consent. Its data is the source of the whole competitive argument — copying it would hand a competitor the same claim and give PDB a case. |
| **Kaggle `yuraslastya/char-mbti`** | An AI summary claimed **CC0**. It could **not be verified**: the page is reCAPTCHA-gated to anything non-interactive. A 137k-row dump of characters *with personality types* is very likely scraped from PDB. Unverifiable licence + probable provenance problem. **Do not build on it.** |
| **AniList** | Documentation suggests CC BY-NC (non-commercial). The API returned 403 to us. Would block the paid tiers. |
| **MyAnimeList API** | Terms require written permission for commercial use; 1,000 requests per day. |
| **Jikan** (unofficial MAL) | Inherits MAL's terms. Endpoint returned 504 when tested. |
| **TMDB** | CC BY-NC — non-commercial. Also no personality data. |
| **Kitsu** `kitsu.io/api/edge` | **The interesting one.** Technically the best fit — anime characters with localised names, slugs, images, and franchise links, which is exactly our category tree. But it publishes **no data terms at all**. An AI summary told me AGPL-3.0 covered the data; that is wrong — AGPL applies to Kitsu's *software*, and the linked docs site is CGWire's production-tracking API, a different product. **Absence of terms is not permission.** Worth one email. |

## The pattern to apply to any new source

1. **Is there a data licence, not just a software licence?** Software licences
   (AGPL, MIT) say nothing about the data they serve.
2. **Can you reach the terms page?** If it is a JS shell or reCAPTCHA-gated, you
   cannot verify it, and "someone said it was CC0" is not a licence.
3. **Does it contain personality types?** If yes, assume it is scraped from PDB
   and treat the provenance as a liability rather than a shortcut.
4. **Would it block a paid tier?** NC licences would.
5. **Does the field actually exist?** AniList/Jikan/TMDB were all suggested as
   sources of types; none of them have any.

## Re-running the import

```bash
npx tsx scripts/import-characters.mts                              # dry run
npx tsx scripts/import-characters.mts --apply                      # capped at 60/source
npx tsx scripts/import-characters.mts --source swapi --apply
npx tsx scripts/import-characters.mts --source disney --limit 200 --apply
```

Safe to re-run: existing slugs are skipped. Both APIs are rate-limited with
exponential backoff on 429/5xx, plus a 250ms pause between pages — these are free
fan services and hammering them would be both rude and self-defeating.
