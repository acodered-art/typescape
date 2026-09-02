# Talanov-Style Continuous Vector Voting — Design Sketch

## Core Idea

Replace "pick one disorder" with **rate the character on trait dimensions**. The disorder match emerges from vector distance, not category selection. This gives us:

- **Continuous, not discrete** — no "wrong answer", just varying similarity
- **Co-morbidity emerges naturally** — a character's vector may be equally close to multiple disorders
- **Intermediates** — "borderline with narcissistic accent" falls out of the math
- **Community wisdom** — aggregate vector converges on the actual trait profile, not a forced choice

---

## 1. Trait Dimensions (12 axes)

Each is a slider from -3 to +3 (7-point scale), understandable to a fandom user:

| # | Dimension | Low (-3) | High (+3) |
|---|-----------|----------|-----------|
| 1 | **Emotional Stability** | Volatile, reactive, mood swings | Calm, even-keeled, emotionally stable |
| 2 | **Social Orientation** | Withdrawn, solitary, avoids people | Gregarious, seeks company, socially engaged |
| 3 | **Self-Confidence** | Self-doubting, humble, insecure | Grandiose, entitled, feels superior |
| 4 | **Impulse Control** | Cautious, restrained, rigid | Reckless, impulsive, thrill-seeking |
| 5 | **Trust** | Trusting, naive, unsuspicious | Paranoid, suspicious, distrustful |
| 6 | **Anxiety** | Fearless, relaxed, untroubled | Anxious, fearful, hypervigilant |
| 7 | **Conventionality** | Conventional, normal, grounded | Eccentric, odd, unusual |
| 8 | **Flexibility** | Flexible, go-with-the-flow | Rigid, perfectionistic, controlling |
| 9 | **Empathy** | Compassionate, warm, caring | Callous, cold, manipulative |
| 10 | **Attention-Seeking** | Self-effacing, modest, private | Dramatic, needs spotlight, approval-seeking |
| 11 | **Emotional Expression** | Flat, restrained, unemotional | Expressive, dramatic, emotionally intense |
| 12 | **Conscience** | Principled, guilt-prone, remorseful | Remorseless, guilt-free, unapologetic |

---

## 2. Disorder Reference Vectors

Each disorder gets a vector of 12 values (-3 to +3) mapping to the trait axes. These are the **reference points** in the continuous space.

### Cluster A
| Dimension | Paranoid | Schizoid | Schizotypal |
|-----------|----------|----------|-------------|
| 1. Stability | -1 | +2 | -1 |
| 2. Social | -1 | -3 | -2 |
| 3. Confidence | +1 | 0 | -1 |
| 4. Impulse | 0 | +1 | -1 |
| 5. Trust | -3 | +1 | -2 |
| 6. Anxiety | +2 | 0 | +1 |
| 7. Conventionality | 0 | +1 | -3 |
| 8. Flexibility | +1 | +2 | -1 |
| 9. Empathy | -1 | -1 | -1 |
| 10. Attention | -1 | -2 | -1 |
| 11. Expression | 0 | -3 | -2 |
| 12. Conscience | 0 | +1 | 0 |

### Cluster B
| Dimension | Antisocial | Borderline | Histrionic | Narcissistic |
|-----------|------------|------------|------------|--------------|
| 1. Stability | -1 | -3 | -2 | +1 |
| 2. Social | +1 | -1 | +3 | +1 |
| 3. Confidence | +3 | -2 | +1 | +3 |
| 4. Impulse | +3 | +3 | +2 | +1 |
| 5. Trust | -2 | -2 | +1 | -1 |
| 6. Anxiety | -1 | +3 | +1 | -1 |
| 7. Conventionality | 0 | 0 | +1 | 0 |
| 8. Flexibility | -2 | -2 | -1 | +1 |
| 9. Empathy | -3 | -1 | -1 | -2 |
| 10. Attention | +1 | +2 | +3 | +3 |
| 11. Expression | +1 | +3 | +3 | +1 |
| 12. Conscience | -3 | -1 | 0 | -2 |

### Cluster C + None
| Dimension | Avoidant | Dependent | OCPD | None/Other |
|-----------|----------|-----------|------|------------|
| 1. Stability | -1 | -1 | +1 | 0 |
| 2. Social | -2 | +1 | 0 | 0 |
| 3. Confidence | -3 | -2 | +1 | 0 |
| 4. Impulse | +1 | +1 | +3 | 0 |
| 5. Trust | -1 | +2 | +1 | 0 |
| 6. Anxiety | +3 | +2 | +1 | 0 |
| 7. Conventionality | 0 | +1 | +1 | 0 |
| 8. Flexibility | +1 | +1 | -3 | 0 |
| 9. Empathy | +1 | +2 | 0 | 0 |
| 10. Attention | -2 | -1 | -1 | 0 |
| 11. Expression | -2 | -1 | -1 | 0 |
| 12. Conscience | +1 | +1 | +2 | 0 |

---

## 3. Schema (New Models)

```prisma
// ─── Trait Dimensions ───────────────────────────────────────
model TraitDimension {
  id          String   @id @default(uuid()) @db.Uuid
  slug        String   @unique         // "emotional-stability"
  name        String                   // "Emotional Stability"
  description String?                  // Low vs High description
  lowLabel    String                   // "Volatile"
  highLabel   String                   // "Calm"
  sortOrder   Int      @default(0) @map("sort_order")
  createdAt   DateTime @default(now()) @map("created_at")

  disorderVectors DisorderTraitVector[]
  traitVotes      TraitVote[]

  @@map("trait_dimensions")
}

// ─── Disorder Reference Vectors ─────────────────────────────
// Each disorder = 12 trait coordinates
model DisorderTraitVector {
  id          String @id @default(uuid()) @db.Uuid
  disorderId  String @map("disorder_id") @db.Uuid
  traitId     String @map("trait_id") @db.Uuid
  value       Int    // -3 to +3

  disorder Disorder       @relation(fields: [disorderId], references: [id], onDelete: Cascade)
  trait    TraitDimension @relation(fields: [traitId], references: [id])

  @@unique([disorderId, traitId])
  @@map("disorder_trait_vectors")
}

// ─── User Trait Votes ───────────────────────────────────────
// Users rate the character on each trait dimension
model TraitVote {
  id          String   @id @default(uuid()) @db.Uuid
  profileId   String   @map("profile_id") @db.Uuid
  traitId     String   @map("trait_id") @db.Uuid
  userId      String   @map("user_id") @db.Uuid
  value       Int      // -3 to +3
  createdAt   DateTime @default(now()) @map("created_at")

  profile Profile        @relation(fields: [profileId], references: [id], onDelete: Cascade)
  trait   TraitDimension @relation(fields: [traitId], references: [id])
  user    User           @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([profileId, traitId, userId])  // one vote per trait per user per character
  @@index([profileId])
  @@map("trait_votes")
}
```

---

## 4. Aggregation Math

### Step 1: Community Vector
For each trait dimension, average all user votes for that character:
```
C[t] = mean(trait_votes[profileId, traitId].value)
```
Result: `{ emotional_stability: 1.2, social_orientation: -0.8, ... }` — a 12-vector.

### Step 2: Distance to Each Disorder
Cosine similarity between the community vector and each disorder's reference vector:
```
similarity(C, D) = dot(C, D) / (||C|| * ||D||)
```

Or use **inverse Euclidean distance** (more intuitive when values are close to origin):
```
distance(C, D) = sqrt(sum((C[t] - D[t])^2))
similarity = 1 / (1 + distance)
```

### Step 3: Percentage Breakdown
Convert similarities to percentages that sum to 100%:
```
total = sum(similarity(C, D_i) for all disorders)
percentage_i = (similarity(C, D_i) / total) * 100
```

### Step 4: Co-morbidity Detection
If two disorders both have >20% similarity, flag as co-morbid. The co-morbidity edge weight from the graph is:
```
predicted_comorbidity = similarity(C, D_a) * similarity(C, D_b) * correlation(D_a, D_b)
```

### Step 5: Natural Language Descriptions
From the vector, generate descriptions like Talanov's:
- **Type X**: highest similarity >40%, next is <15% → "This character codes as [X]"
- **Intermediate X/Y**: top two within 5% → "Shows traits of both X and Y"
- **X with accent on Y**: X highest, Y notably second → "[X] with [Y] features"
- **Inverted pole**: a trait value is opposite polarity from the nearest disorder's expected value → "[X] inverted to [trait]"

---

## 5. API Design

### Vote endpoints
```
GET /api/profiles/[slug]/trait-votes
  → { traits: { traitId, value }, community: { traitId, avg, count }[], disorderSimilarity: { disorderId, similarity, percentage }[] }

POST /api/profiles/[slug]/trait-votes
  body: { traitId, value }  // -3 to +3
  → Single trait vote; upsert (same user/trait/character = update)
```

### Trait dimension discovery
```
GET /api/traits
  → [ { id, slug, name, lowLabel, highLabel, sortOrder } ]
```

### Disorder vectors (for reference/debugging)
```
GET /api/disorders/vectors
  → [ { disorderId, disorderName, vector: { traitSlug: value } } ]
```

---

## 6. UI Sketch

### Trait Sliders (replaces the radio-button list)
```
┌─────────────────────────────────────────────────┐
│  Cluster Disorder Traits                        │
│  ────────────────────────────────────────────── │
│                                                  │
│  Emotional Stability                             │
│  Volatile ●──────○──────○──────○──────○──────○ Calm │
│                            ↑ community avg: -0.5 │
│                                                  │
│  Social Orientation                              │
│  Withdrawn ○──────○──────○──────●──────○──────○ Gregarious │
│                            ↑ your vote: +1      │
│                                                  │
│  ... (12 sliders)                                │
│                                                  │
│  ┌─────────────────────────────────────────────┐ │
│  │  Results (based on 47 community votes)      │ │
│  │                                             │ │
│  │  Borderline PD  ████████████░░ 41%          │ │
│  │  Histrionic PD  ██████░░░░░░░░ 23%          │ │
│  │  Narcissistic   ████░░░░░░░░░░ 15%          │ │
│  │  BPD with HPD accent                        │ │
│  │                                             │ │
│  │  Co-morbid: BPD + HPD (strong overlap)     │ │
│  └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### Key UX decisions
- **Sliders, not selects** — the continuous nature is the whole point
- **Show community average** as a reference point on each slider
- **Your vote shown separately** — so you can see where you differ from consensus
- **Results update in real-time** as you adjust sliders
- **Auto-detect "None/Other"** when no disorder has >15% similarity

---

## 7. Migration Path

**Phase 1 (current)**: Single-disorder radio-button voting — already built
**Phase 2 (proposed)**: Trait slider voting as the primary interface, disorder matching as computed output
**Phase 3**: Retire the old single-disorder votes, keeping the data as initial trait seeds (a single disorder vote = the reference vector for that disorder)

The old `DisorderVote` model can seed the initial trait vectors: if 10 users voted "borderline" for a character, that's equivalent to 10 votes of the borderline reference vector. This gives immediate trait data without asking users to re-vote.

---

## 8. Competitive Edge

| Feature | PDB | TypeScape Today | TypeScape + Vectors |
|---------|-----|-----------------|---------------------|
| Voting model | Single pick | Single pick | Continuous trait space |
| "Intermediates" | Not supported | Not supported | Emerges naturally |
| Co-morbidity | Manual tagging | Hardcoded edges | Emerges from vector distance |
| "X with accent on Y" | Not supported | Not supported | Emerges from similarity |
| Community insight | "X% voted Y" | "X% voted Y" | "Community sees the character as: emotionally volatile, moderately withdrawn, slightly grandiose..." |
| Per-dimension breakdown | No | No | Yes — 12-axis personality profile |