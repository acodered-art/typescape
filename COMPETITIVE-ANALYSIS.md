# Competitive Analysis: TypeScape vs Personality Database (PDB)

## PDB Feature Inventory

### What PDB Has

| Feature | Status | Notes |
|---------|--------|-------|
| Profile pages (name, image, bio, category, tags, voting, comments) | ✅ | We have this |
| Voting on personality types | ✅ | We have this + downvote |
| Linear comments on profiles | ✅ | We have threaded |
| User "Personal Page" (bio, typing history, stats) | ❌ | **NEED** |
| Hierarchical categories (some locked) | ✅ | We have this |
| Full-text search by name/keyword | ✅ | We have this |
| Search by type filter | ✅ | We have this |
| Search by category filter | ✅ | We have this |
| User-created collections/lists | ❌ | **NEED** |
| Upload profile images (moderated) | ❌ | **NEED** |
| Multiple typing systems per profile | ✅ | We have 20 |
| Mobile app ("Get Pdb App") | ❌ | PWA planned |
| Wiki-style editing (moderated) | ❌ | **NEED** |
| Image guidelines & moderation | ❌ | **NEED** |
| Categories with subcategories | ✅ | We have this |
| Favorites/bookmarks (via collections) | ❌ | **NEED** |

### What PDB Lacks (Our Advantages)

| Feature | PDB | TypeScape |
|---------|-----|-----------|
| Downvote / disagree button | ❌ | ✅ Built |
| Weighted reputation voting | ❌ | ✅ Built |
| Threaded comments | ❌ | ✅ Built |
| 20+ typing systems | ~6 | ✅ 20 (13 populated) |
| Public API | ❌ | Planned |
| Comment voting | ❌ | ⬜ Todo |
| Related characters | ❌ | ⬜ Todo |
| Badges/achievements | ❌ | ⬜ Todo |
| Personality tests | ❌ | ⬜ Todo |
| Cross-system correlation | ❌ | ⬜ Todo |
| Evidence/citation system | ❌ | ⬜ Todo |
| Wiki edit history | Partial | ⬜ Todo |
| Controversial badge | ❌ | ⬜ Todo |

## Key Differentiators

1. **Voting robustness** — weighted by reputation, upvote AND downvote, consensus %
2. **System breadth** — 20 systems vs PDB's ~6, each independently votable
3. **Modern UI** — bioluminescent dark theme vs PDB's dated blue-on-black
4. **Threaded discussions** — proper reply chains, not flat comments
5. **API-first architecture** — public API when ready

## Priority Build Order

### P0 — User-facing core (competitive parity)
1. User profile pages
2. Image upload on profiles
3. Collections (user-created lists)
4. Search filters: sort, multi-type, facet sidebar

### P1 — Should build (PDB parity)
5. Comment voting
6. Related characters
7. Wiki edit history
8. Disputed/controversial badge

### P2 — Differentiators
9. Cross-system correlation engine
10. Evidence/citation system
11. Personality tests
12. Badges/achievements