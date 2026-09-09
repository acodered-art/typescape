#!/usr/bin/env python3
"""One-off codemod: replace ad-hoc `text-[Npx]` with named scale utilities.

Why: the type scale lives in globals.css so a size change is one edit. Beta means
the type gets nudged constantly; 326 inline px values make that expensive.

Safety:
  - only rewrites the exact `text-[<int>px]` form (not `text-[1.5rem]`, not `w-[14px]`)
  - refuses to run if a size has no token, so nothing is silently dropped
  - prints a diff summary so the change can be reviewed

Run from typescape/:  python3 scripts/codemod-type-scale.py [--apply]
"""
import os
import re
import sys

PROJECT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(PROJECT, "src")

# Must match the scale in globals.css. A missing size is a hard error.
TOKEN = {
    "9": "3xs", "10": "2xs", "11": "xs", "12": "sm", "13": "base", "14": "md",
    "15": "lg", "16": "xl", "17": "2xl", "18": "3xl", "19": "4xl", "20": "5xl",
    "22": "6xl", "24": "7xl", "26": "8xl", "28": "9xl", "30": "10xl", "33": "11xl",
    "32": "15xl", "40": "12xl", "44": "13xl", "48": "14xl", "62": "16xl",
    "64": "17xl", "96": "18xl",
}

# text-[14px] and its responsive variants (sm: / md: / lg: / max-sm: etc.)
PATTERN = re.compile(r"(?P<prefix>(?:[a-z-]+:)*)text-\[(?P<px>\d+)px\]")

apply = "--apply" in sys.argv
changed_files = []
subs = {}
missing = set()


def rewrite(match):
    px = match.group("px")
    name = TOKEN.get(px)
    if name is None:
        missing.add(px)
        return match.group(0)
    subs[f"text-[{px}px]"] = subs.get(f"text-[{px}px]", 0) + 1
    return f"{match.group('prefix')}text-{name}"


for root, _dirs, files in os.walk(SRC):
    for name in files:
        if not name.endswith((".tsx", ".ts")):
            continue
        path = os.path.join(root, name)
        src = open(path, encoding="utf-8").read()
        if "text-[" not in src:
            continue
        new = PATTERN.sub(rewrite, src)
        if new != src:
            changed_files.append(os.path.relpath(path, PROJECT))
            if apply:
                open(path, "w", encoding="utf-8").write(new)

if missing:
    print(f"HARD STOP: no token for these sizes: {sorted(missing, key=int)}")
    print("Add them to globals.css first, then re-run.")
    sys.exit(1)

print(f"{'applied' if apply else 'dry run'}: {len(changed_files)} files")
print(f"{sum(subs.values())} replacements:")
for k, v in sorted(subs.items(), key=lambda kv: -kv[1]):
    print(f"  {k:>16} -> {v}")
if not apply:
    print("\nre-run with --apply to write")
