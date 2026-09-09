# Derived trait vectors

## The problem this solves

The trait survey is the richest signal on the site: character similarity, the
radar, emergent co-morbidity and the "inverted to X" verdict all read from it.
But almost nobody had surveyed anything — **3 of 24 profiles** — so every one of
those features ran on an empty dataset and looked broken.

## What we do instead of scraping

We do **not** import from Personality Database or any similar site. Two reasons:

- **Licensing.** PDB's terms prohibit commercial use without written consent, and
  its data is user-generated with no open licence. Importing it would poison the
  dataset for the paid tiers the site is built to sell.
- **Provenance.** An unattributed dump from another database makes every claim on
  the site unauditable. The whole differentiator is that readings are argued and
  traceable.

External sources checked and rejected:

| Source | Verdict |
|---|---|
| Personality Database | No API, no export, terms prohibit commercial use |
| Kaggle "char-mbti" | Claimed CC0 by an AI summary, but **unverifiable** — the page is reCAPTCHA-gated. Do not build on an unverified licence. |
| Wikidata | Genuinely CC0, but no property maps characters to personality types, and the endpoint was rate-limiting hard |
| AniList / Jikan / MAL | Character data yes, personality types no; AniList returned 403 |

## So: derive from what the community already agreed on

`src/lib/derive-traits.ts` maps an **existing type** onto the 12 trait axes.
MBTI, Enneagram and Big Five each have documented dimensions; the module maps only
the axes those dimensions actually speak to.

Three rules keep this honest:

1. **No axis is invented.** If a type says nothing about anxiety, the axis stays
   `null` rather than being filled to complete a vector.
2. **Every value carries a reason** (`{ axis: "E + N" }`), shown nowhere but kept
   for auditability.
3. **Confidence is capped at 0.8.** Inference can never claim survey authority.

## How it is stored

`trait_votes.source`:

| Value | Meaning |
|---|---|
| `survey` | a reader filled it in |
| `derived:mbti+enneagram` | inferred, seeded by the backfill script |

Derived rows are attributed to a reserved account (`typescape-derived`, bio "Not
a person") so they are attributable and cannot be mistaken for a person's vote.

## How it is weighted

`DERIVED_WEIGHT = 0.35` in `src/app/api/profiles/[slug]/trait-votes/route.ts`. A
derived axis counts for 35% of a surveyed one, so a single real survey outweighs
anything inferred. `totalVoters` counts **only** `source = "survey"` rows, so the
"N readers surveyed" line can never be inflated by inference.

The API reports `derived`, `derivedFrom`, and per-axis `derivedOnly`, and the
panel says *"No reader has surveyed this character yet. The shape below is
estimated from the types on file, and counts for less than a real survey."*

## Running it

```bash
npx tsx scripts/backfill-traits.mts                 # dry run, prints every value
npx tsx scripts/backfill-traits.mts --apply
```

It skips any axis a reader has already surveyed. Existing derived rows for a
profile are replaced wholesale so a mapping change cannot leave stale axes.

## Limits, stated plainly

- A derived vector is **not** a personality assessment. It is a plausible shape
  implied by a type label somebody else chose.
- Similarity between two derived profiles mostly measures whether they share a
  type, which flatters the feature. It should not be read as insight.
- The right fix is real surveys. This buys the features a working dataset until
  readers supply one, and is clearly labelled everywhere it appears.
