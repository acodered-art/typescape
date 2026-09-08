/**
 * Unit tests for the JSON-LD builders.
 *
 * Run: npm test
 *
 * The shape matters: a malformed or non-absolute URL silently loses the rich
 * snippet, which is the only reason these exist.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { profileJsonLd, typePageJsonLd, organizationJsonLd } from "../src/lib/json-ld.ts";

describe("profileJsonLd", () => {
  const base = {
    name: "Naruto Uzumaki",
    slug: "naruto-uzumaki",
    description: "A ninja.",
    imageUrl: null,
    category: { name: "Anime & Manga", slug: "anime-manga" },
    readings: [
      { system: "mbti", type: "ENFP" },
      { system: "enneagram", type: "7" },
    ],
    comments: 3,
  };

  test("is a Person with an absolute url", () => {
    const d = profileJsonLd(base);
    assert.equal(d["@type"], "Person");
    assert.match(String(d.url), /^https?:\/\/.+\/profiles\/naruto-uzumaki$/);
  });

  test("carries each reading as an additionalProperty", () => {
    const d = profileJsonLd(base) as { additionalProperty: { name: string; value: string }[] };
    assert.equal(d.additionalProperty.length, 2);
    assert.deepEqual(
      d.additionalProperty.map((p) => p.value),
      ["ENFP", "7"]
    );
  });

  test("omits image when there is none", () => {
    const d = profileJsonLd(base);
    assert.equal(d.image, undefined);
  });

  test("includes image when present", () => {
    const d = profileJsonLd({ ...base, imageUrl: "https://example.com/a.png" });
    assert.equal(d.image, "https://example.com/a.png");
  });

  test("omits interactionStatistic when there are no comments", () => {
    const d = profileJsonLd({ ...base, comments: 0 });
    assert.equal(d.interactionStatistic, undefined);
  });

  test("omits description when null", () => {
    const d = profileJsonLd({ ...base, description: null });
    assert.equal(d.description, undefined);
  });
});

describe("typePageJsonLd", () => {
  const input = {
    system: "mbti",
    systemName: "MBTI",
    type: "ENFP",
    label: "ENFP — The Champion",
    description: "Creative",
    total: 2,
    names: ["Goku", "Naruto Uzumaki"],
  };

  test("is an ItemList with absolute url and lowercase type", () => {
    const d = typePageJsonLd(input);
    assert.equal(d["@type"], "ItemList");
    assert.match(String(d.url), /\/types\/mbti\/enfp$/);
  });

  test("numbers the items from 1", () => {
    const d = typePageJsonLd(input) as { itemListElement: { position: number; name: string }[] };
    assert.deepEqual(d.itemListElement.map((i) => i.position), [1, 2]);
    assert.equal(d.itemListElement[0].name, "Goku");
  });

  test("caps the item list at 48", () => {
    const many = Array.from({ length: 80 }, (_, i) => `C${i}`);
    const d = typePageJsonLd({ ...input, names: many }) as { itemListElement: unknown[] };
    assert.equal(d.itemListElement.length, 48);
  });

  test("keeps the reported total even when the list is capped", () => {
    const many = Array.from({ length: 80 }, (_, i) => `C${i}`);
    const d = typePageJsonLd({ ...input, names: many, total: 80 });
    assert.equal(d.numberOfItems, 80);
  });
});

describe("organizationJsonLd", () => {
  test("is a WebSite with a SearchAction", () => {
    const d = organizationJsonLd();
    assert.equal(d["@type"], "WebSite");
    const action = d.potentialAction as { "@type": string; target: string };
    assert.equal(action["@type"], "SearchAction");
    assert.match(action.target, /\/search\?q=\{search_term_string\}$/);
  });
});
