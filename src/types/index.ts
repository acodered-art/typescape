export type TypingSystemSlug = "mbti" | "enneagram" | "big-five" | "socionics" | "temperament" | "instinctual-variants";

export interface TypingSystemDefinition {
  slug: TypingSystemSlug;
  name: string;
  description: string;
  types: TypeDefinition[];
  dimensions?: DimensionDefinition[];
}

export interface TypeDefinition {
  value: string;
  label: string;
  description?: string;
}

export interface DimensionDefinition {
  name: string;
  options: { value: string; label: string }[];
}

export interface VoteRequest {
  voteValue: 1 | -1;
}

export interface ProfileWithTypings {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  bio: string | null;
  category: { name: string; slug: string } | null;
  typings: TypingWithSystem[];
  viewCount: number;
  createdAt: Date;
}

export interface TypingWithSystem {
  id: string;
  typeValue: string;
  confidence: number;
  details: unknown;
  evidenceUrls: string[];
  isCommunity: boolean;
  typingSystem: { name: string; slug: string };
  votes?: { upvotes: number; downvotes: number };
  creator?: { username: string };
}

export interface ConsensusResult {
  typeValue: string;
  percentage: number;
  voteCount: number;
}