// Known cross-system correlations based on research and community consensus
// Format: [sourceSystem, sourceType, targetSystem, targetType, strength, description]

export interface Correlation {
  sourceSystem: string;
  sourceType: string;
  targetSystem: string;
  targetType: string;
  strength: number; // 0-1
  description: string;
}

export const CORRELATIONS: Correlation[] = [
  // MBTI → Enneagram (common correlations)
  { sourceSystem: "mbti", sourceType: "INFJ", targetSystem: "enneagram", targetType: "4", strength: 0.45, description: "Often Type 4 (The Individualist)" },
  { sourceSystem: "mbti", sourceType: "INFJ", targetSystem: "enneagram", targetType: "5", strength: 0.30, description: "Often Type 5 (The Investigator)" },
  { sourceSystem: "mbti", sourceType: "INFJ", targetSystem: "enneagram", targetType: "1", strength: 0.15, description: "Sometimes Type 1 (The Reformer)" },
  { sourceSystem: "mbti", sourceType: "INTJ", targetSystem: "enneagram", targetType: "5", strength: 0.50, description: "Often Type 5 (The Investigator)" },
  { sourceSystem: "mbti", sourceType: "INTJ", targetSystem: "enneagram", targetType: "8", strength: 0.20, description: "Sometimes Type 8 (The Challenger)" },
  { sourceSystem: "mbti", sourceType: "INTJ", targetSystem: "enneagram", targetType: "1", strength: 0.15, description: "Sometimes Type 1 (The Reformer)" },
  { sourceSystem: "mbti", sourceType: "INFP", targetSystem: "enneagram", targetType: "4", strength: 0.50, description: "Often Type 4 (The Individualist)" },
  { sourceSystem: "mbti", sourceType: "INFP", targetSystem: "enneagram", targetType: "9", strength: 0.25, description: "Often Type 9 (The Peacemaker)" },
  { sourceSystem: "mbti", sourceType: "INFP", targetSystem: "enneagram", targetType: "2", strength: 0.15, description: "Sometimes Type 2 (The Helper)" },
  { sourceSystem: "mbti", sourceType: "INTP", targetSystem: "enneagram", targetType: "5", strength: 0.55, description: "Often Type 5 (The Investigator)" },
  { sourceSystem: "mbti", sourceType: "INTP", targetSystem: "enneagram", targetType: "9", strength: 0.15, description: "Sometimes Type 9 (The Peacemaker)" },
  { sourceSystem: "mbti", sourceType: "ISTJ", targetSystem: "enneagram", targetType: "1", strength: 0.35, description: "Often Type 1 (The Reformer)" },
  { sourceSystem: "mbti", sourceType: "ISTJ", targetSystem: "enneagram", targetType: "6", strength: 0.30, description: "Often Type 6 (The Loyalist)" },
  { sourceSystem: "mbti", sourceType: "ISFJ", targetSystem: "enneagram", targetType: "2", strength: 0.35, description: "Often Type 2 (The Helper)" },
  { sourceSystem: "mbti", sourceType: "ISFJ", targetSystem: "enneagram", targetType: "9", strength: 0.25, description: "Often Type 9 (The Peacemaker)" },
  { sourceSystem: "mbti", sourceType: "ISTP", targetSystem: "enneagram", targetType: "5", strength: 0.30, description: "Often Type 5 (The Investigator)" },
  { sourceSystem: "mbti", sourceType: "ISTP", targetSystem: "enneagram", targetType: "8", strength: 0.25, description: "Often Type 8 (The Challenger)" },
  { sourceSystem: "mbti", sourceType: "ISFP", targetSystem: "enneagram", targetType: "4", strength: 0.30, description: "Often Type 4 (The Individualist)" },
  { sourceSystem: "mbti", sourceType: "ISFP", targetSystem: "enneagram", targetType: "9", strength: 0.30, description: "Often Type 9 (The Peacemaker)" },
  { sourceSystem: "mbti", sourceType: "ENFJ", targetSystem: "enneagram", targetType: "2", strength: 0.35, description: "Often Type 2 (The Helper)" },
  { sourceSystem: "mbti", sourceType: "ENFJ", targetSystem: "enneagram", targetType: "3", strength: 0.25, description: "Often Type 3 (The Achiever)" },
  { sourceSystem: "mbti", sourceType: "ENTJ", targetSystem: "enneagram", targetType: "8", strength: 0.40, description: "Often Type 8 (The Challenger)" },
  { sourceSystem: "mbti", sourceType: "ENTJ", targetSystem: "enneagram", targetType: "3", strength: 0.30, description: "Often Type 3 (The Achiever)" },
  { sourceSystem: "mbti", sourceType: "ENFP", targetSystem: "enneagram", targetType: "7", strength: 0.40, description: "Often Type 7 (The Enthusiast)" },
  { sourceSystem: "mbti", sourceType: "ENFP", targetSystem: "enneagram", targetType: "4", strength: 0.25, description: "Often Type 4 (The Individualist)" },
  { sourceSystem: "mbti", sourceType: "ENTP", targetSystem: "enneagram", targetType: "7", strength: 0.45, description: "Often Type 7 (The Enthusiast)" },
  { sourceSystem: "mbti", sourceType: "ENTP", targetSystem: "enneagram", targetType: "5", strength: 0.20, description: "Sometimes Type 5 (The Investigator)" },
  { sourceSystem: "mbti", sourceType: "ESTJ", targetSystem: "enneagram", targetType: "1", strength: 0.30, description: "Often Type 1 (The Reformer)" },
  { sourceSystem: "mbti", sourceType: "ESTJ", targetSystem: "enneagram", targetType: "3", strength: 0.25, description: "Often Type 3 (The Achiever)" },
  { sourceSystem: "mbti", sourceType: "ESFJ", targetSystem: "enneagram", targetType: "2", strength: 0.40, description: "Often Type 2 (The Helper)" },
  { sourceSystem: "mbti", sourceType: "ESFJ", targetSystem: "enneagram", targetType: "9", strength: 0.20, description: "Sometimes Type 9 (The Peacemaker)" },
  { sourceSystem: "mbti", sourceType: "ESTP", targetSystem: "enneagram", targetType: "7", strength: 0.35, description: "Often Type 7 (The Enthusiast)" },
  { sourceSystem: "mbti", sourceType: "ESTP", targetSystem: "enneagram", targetType: "8", strength: 0.30, description: "Often Type 8 (The Challenger)" },
  { sourceSystem: "mbti", sourceType: "ESFP", targetSystem: "enneagram", targetType: "7", strength: 0.35, description: "Often Type 7 (The Enthusiast)" },
  { sourceSystem: "mbti", sourceType: "ESFP", targetSystem: "enneagram", targetType: "2", strength: 0.20, description: "Sometimes Type 2 (The Helper)" },

  // MBTI → Big Five tendencies
  { sourceSystem: "mbti", sourceType: "INFJ", targetSystem: "big-five", targetType: "O:85", strength: 0.6, description: "Very high Openness" },
  { sourceSystem: "mbti", sourceType: "INTJ", targetSystem: "big-five", targetType: "O:80", strength: 0.6, description: "High Openness, low Extraversion" },
  { sourceSystem: "mbti", sourceType: "ENFP", targetSystem: "big-five", targetType: "E:75", strength: 0.6, description: "High Extraversion, high Openness" },
  { sourceSystem: "mbti", sourceType: "ESTJ", targetSystem: "big-five", targetType: "C:80", strength: 0.6, description: "Very high Conscientiousness" },
  { sourceSystem: "mbti", sourceType: "INTP", targetSystem: "big-five", targetType: "O:85", strength: 0.5, description: "Very high Openness, low Extraversion" },

  // Enneagram → MBTI (reverse)
  { sourceSystem: "enneagram", sourceType: "4", targetSystem: "mbti", targetType: "INFP", strength: 0.35, description: "Often INFP (The Mediator)" },
  { sourceSystem: "enneagram", sourceType: "4", targetSystem: "mbti", targetType: "INFJ", strength: 0.25, description: "Often INFJ (The Advocate)" },
  { sourceSystem: "enneagram", sourceType: "5", targetSystem: "mbti", targetType: "INTP", strength: 0.35, description: "Often INTP (The Thinker)" },
  { sourceSystem: "enneagram", sourceType: "5", targetSystem: "mbti", targetType: "INTJ", strength: 0.25, description: "Often INTJ (The Architect)" },
  { sourceSystem: "enneagram", sourceType: "7", targetSystem: "mbti", targetType: "ENTP", strength: 0.30, description: "Often ENTP (The Debater)" },
  { sourceSystem: "enneagram", sourceType: "7", targetSystem: "mbti", targetType: "ENFP", strength: 0.25, description: "Often ENFP (The Champion)" },
  { sourceSystem: "enneagram", sourceType: "1", targetSystem: "mbti", targetType: "ISTJ", strength: 0.25, description: "Often ISTJ (The Inspector)" },
  { sourceSystem: "enneagram", sourceType: "8", targetSystem: "mbti", targetType: "ENTJ", strength: 0.30, description: "Often ENTJ (The Commander)" },
  { sourceSystem: "enneagram", sourceType: "2", targetSystem: "mbti", targetType: "ESFJ", strength: 0.30, description: "Often ESFJ (The Caregiver)" },
  { sourceSystem: "enneagram", sourceType: "9", targetSystem: "mbti", targetType: "INFP", strength: 0.25, description: "Often INFP (The Mediator)" },
  { sourceSystem: "enneagram", sourceType: "3", targetSystem: "mbti", targetType: "ENTJ", strength: 0.20, description: "Often ENTJ (The Commander)" },
  { sourceSystem: "enneagram", sourceType: "6", targetSystem: "mbti", targetType: "ISTJ", strength: 0.20, description: "Often ISTJ (The Inspector)" },
];

export function getCorrelations(sourceSystem: string, sourceType: string): Correlation[] {
  return CORRELATIONS.filter(
    (c) => c.sourceSystem === sourceSystem && c.sourceType === sourceType
  ).sort((a, b) => b.strength - a.strength);
}