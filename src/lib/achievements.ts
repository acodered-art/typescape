export const ACHIEVEMENTS = [
  { slug: "first-vote", name: "First Vote", description: "Cast your first vote on a personality typing", icon: "🗳️", criteria: { type: "votes_cast", threshold: 1 } },
  { slug: "voter", name: "Voter", description: "Cast 10 votes on personality typings", icon: "🗳️", criteria: { type: "votes_cast", threshold: 10 } },
  { slug: "super-voter", name: "Super Voter", description: "Cast 100 votes on personality typings", icon: "🗳️", criteria: { type: "votes_cast", threshold: 100 } },
  { slug: "first-typing", name: "First Typing", description: "Submit your first personality typing", icon: "📝", criteria: { type: "typings_submitted", threshold: 1 } },
  { slug: "typist", name: "Typist", description: "Submit 10 personality typings", icon: "📝", criteria: { type: "typings_submitted", threshold: 10 } },
  { slug: "pro-typist", name: "Pro Typist", description: "Submit 50 personality typings", icon: "📝", criteria: { type: "typings_submitted", threshold: 50 } },
  { slug: "first-profile", name: "Profile Creator", description: "Create your first profile", icon: "👤", criteria: { type: "profiles_created", threshold: 1 } },
  { slug: "curator", name: "Curator", description: "Create 10 profiles", icon: "👤", criteria: { type: "profiles_created", threshold: 10 } },
  { slug: "first-comment", name: "First Comment", description: "Post your first comment", icon: "💬", criteria: { type: "comments_made", threshold: 1 } },
  { slug: "commenter", name: "Commenter", description: "Post 25 comments", icon: "💬", criteria: { type: "comments_made", threshold: 25 } },
  { slug: "first-collection", name: "Collector", description: "Create your first collection", icon: "📚", criteria: { type: "collections_created", threshold: 1 } },
  { slug: "first-test", name: "Self-Discovery", description: "Take a personality test", icon: "🧪", criteria: { type: "tests_taken", threshold: 1 } },
  { slug: "first-evidence", name: "Sourcing", description: "Add evidence to a typing", icon: "🔗", criteria: { type: "evidence_added", threshold: 1 } },
];

export function checkAchievement(criteria: { type: string; threshold: number }, count: number): boolean {
  return count >= criteria.threshold;
}