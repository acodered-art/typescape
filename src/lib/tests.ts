export interface TestQuestion {
  id: number;
  text: string;
  dimension: string;
  options: { value: string; label: string }[];
}

export const MBTI_QUESTIONS: TestQuestion[] = [
  { id: 1, text: "After a long week, you recharge by:", dimension: "E/I",
    options: [{ value: "E", label: "Going out with friends or doing something social" }, { value: "I", label: "Spending time alone with a book or hobby" }] },
  { id: 2, text: "When working on a project, you prefer:", dimension: "E/I",
    options: [{ value: "E", label: "Bouncing ideas off others and talking through it" }, { value: "I", label: "Thinking it through quietly on your own first" }] },
  { id: 3, text: "In conversations, you tend to:", dimension: "E/I",
    options: [{ value: "E", label: "Speak your thoughts as they come" }, { value: "I", label: "Think carefully before speaking" }] },
  { id: 4, text: "You find social situations:", dimension: "E/I",
    options: [{ value: "E", label: "Energizing — the more people the better" }, { value: "I", label: "Draining — you need quiet time afterward" }] },
  { id: 5, text: "When learning something new, you prefer:", dimension: "S/N",
    options: [{ value: "S", label: "Step-by-step instructions with concrete examples" }, { value: "N", label: "Understanding the big picture and possibilities first" }] },
  { id: 6, text: "You are more likely to notice:", dimension: "S/N",
    options: [{ value: "S", label: "What's actually happening right now — details and facts" }, { value: "N", label: "What could be — patterns, meanings, and future possibilities" }] },
  { id: 7, text: "When describing an experience, you focus on:", dimension: "S/N",
    options: [{ value: "S", label: "What actually happened — the concrete details" }, { value: "N", label: "What it meant — the insights and interpretations" }] },
  { id: 8, text: "You trust more:", dimension: "S/N",
    options: [{ value: "S", label: "Experience and past evidence" }, { value: "N", label: "Hunches and theoretical possibilities" }] },
  { id: 9, text: "When making decisions, you prioritize:", dimension: "T/F",
    options: [{ value: "T", label: "Logic, consistency, and objective analysis" }, { value: "F", label: "Harmony, empathy, and how people feel" }] },
  { id: 10, text: "Others would describe you as more:", dimension: "T/F",
    options: [{ value: "T", label: "Fair-minded and principled" }, { value: "F", label: "Compassionate and understanding" }] },
  { id: 11, text: "When someone disagrees with you, you tend to:", dimension: "T/F",
    options: [{ value: "T", label: "Debate the facts and logic of the argument" }, { value: "F", label: "Consider their feelings and perspective" }] },
  { id: 12, text: "You value more:", dimension: "T/F",
    options: [{ value: "T", label: "Being right and truthful" }, { value: "F", label: "Being kind and maintaining harmony" }] },
  { id: 13, text: "You prefer your life to be:", dimension: "J/P",
    options: [{ value: "J", label: "Planned, organized, and structured" }, { value: "P", label: "Flexible, spontaneous, and adaptable" }] },
  { id: 14, text: "When facing a deadline, you:", dimension: "J/P",
    options: [{ value: "J", label: "Work steadily ahead and finish early" }, { value: "P", label: "Work best under pressure at the last minute" }] },
  { id: 15, text: "Your workspace or living space is usually:", dimension: "J/P",
    options: [{ value: "J", label: "Neat, organized, and everything in its place" }, { value: "P", label: "Creative chaos — you know where everything is" }] },
  { id: 16, text: "You feel more comfortable when:", dimension: "J/P",
    options: [{ value: "J", label: "Decisions are made and things are settled" }, { value: "P", label: "Options are open and you can change plans" }] },
];

export const ENNEAGRAM_QUESTIONS: TestQuestion[] = [
  { id: 1, text: "I strive to be perfect and fear making mistakes.", dimension: "type",
    options: [{ value: "1", label: "Yes, strongly" }, { value: "0", label: "Not really" }] },
  { id: 2, text: "I am naturally helpful and want to be needed by others.", dimension: "type",
    options: [{ value: "2", label: "Yes, strongly" }, { value: "0", label: "Not really" }] },
  { id: 3, text: "I am ambitious and care about my image and success.", dimension: "type",
    options: [{ value: "3", label: "Yes, strongly" }, { value: "0", label: "Not really" }] },
  { id: 4, text: "I feel different from others and value being unique.", dimension: "type",
    options: [{ value: "4", label: "Yes, strongly" }, { value: "0", label: "Not really" }] },
  { id: 5, text: "I need privacy and prefer to observe rather than participate.", dimension: "type",
    options: [{ value: "5", label: "Yes, strongly" }, { value: "0", label: "Not really" }] },
  { id: 6, text: "I worry about what could go wrong and seek security.", dimension: "type",
    options: [{ value: "6", label: "Yes, strongly" }, { value: "0", label: "Not really" }] },
  { id: 7, text: "I love new experiences and hate feeling trapped or bored.", dimension: "type",
    options: [{ value: "7", label: "Yes, strongly" }, { value: "0", label: "Not really" }] },
  { id: 8, text: "I am assertive and protective of myself and others.", dimension: "type",
    options: [{ value: "8", label: "Yes, strongly" }, { value: "0", label: "Not really" }] },
  { id: 9, text: "I prefer peace and harmony and avoid conflict.", dimension: "type",
    options: [{ value: "9", label: "Yes, strongly" }, { value: "0", label: "Not really" }] },
];

export function scoreMBTI(answers: Record<number, string>): string {
  let e = 0, i = 0, s = 0, n = 0, t = 0, f = 0, j = 0, p = 0;

  const dimensionMap: Record<number, string> = {
    1: "E/I", 2: "E/I", 3: "E/I", 4: "E/I",
    5: "S/N", 6: "S/N", 7: "S/N", 8: "S/N",
    9: "T/F", 10: "T/F", 11: "T/F", 12: "T/F",
    13: "J/P", 14: "J/P", 15: "J/P", 16: "J/P",
  };

  for (const [qId, answer] of Object.entries(answers)) {
    const dim = dimensionMap[Number(qId)];
    if (!dim) continue;
    if (answer === "E") e++;
    else if (answer === "I") i++;
    else if (answer === "S") s++;
    else if (answer === "N") n++;
    else if (answer === "T") t++;
    else if (answer === "F") f++;
    else if (answer === "J") j++;
    else if (answer === "P") p++;
  }

  const first = e >= i ? "E" : "I";
  const second = s >= n ? "S" : "N";
  const third = t >= f ? "T" : "F";
  const fourth = j >= p ? "J" : "P";

  return `${first}${second}${third}${fourth}`;
}

export function scoreEnneagram(answers: Record<number, string>): string {
  const scores: Record<string, number> = {};
  for (let i = 1; i <= 9; i++) scores[String(i)] = 0;

  for (const [qId, answer] of Object.entries(answers)) {
    if (answer !== "0" && scores[answer] !== undefined) {
      scores[answer]++;
    }
  }

  // Wings: if type 4, check wing 3 or 5
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const mainType = sorted[0][0];
  const wingCandidates = [String(Number(mainType) - 1), String(Number(mainType) + 1)]
    .filter((w) => w >= "1" && w <= "9" && w !== mainType);
  const wing = wingCandidates.sort((a, b) => (scores[b] || 0) - (scores[a] || 0))[0] || "w9";

  return `${mainType}w${wing}`;
}