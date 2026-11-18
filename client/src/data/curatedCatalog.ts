export interface CuratedVerseRef {
  book: string;
  chapter: number;
  verse: number;
}

export interface CuratedPlanDefinition {
  id: string;
  title: string;
  subtitle: string;
  category: 'Mantra' | 'Anchor' | 'Wisdom' | 'Study Plan';
  description: string;
  contextNote: string;
  verses: ReadonlyArray<CuratedVerseRef>;
}

export const CURATED_PLANS: ReadonlyArray<CuratedPlanDefinition> = [
  {
    id: 'psalms-mantras',
    title: 'Psalms for Daily Mantras & Focus',
    subtitle: 'Psalms 1, 23, 46, 51, 91, 119, 121 & 139',
    category: 'Mantra',
    description:
      'Cadenced Hebrew poetry selected for breath-paced repetition, composure under pressure, and daily focus.',
    contextNote:
      'In the monastic tradition, short verses from the Psalter were memorized as rhythmic anchors throughout the working day. Practice these verses across Stages 1–5 to internalize their cadence.',
    verses: [
      { book: 'Psalms', chapter: 1, verse: 1 },
      { book: 'Psalms', chapter: 1, verse: 2 },
      { book: 'Psalms', chapter: 1, verse: 3 },
      { book: 'Psalms', chapter: 23, verse: 1 },
      { book: 'Psalms', chapter: 23, verse: 2 },
      { book: 'Psalms', chapter: 23, verse: 3 },
      { book: 'Psalms', chapter: 23, verse: 4 },
      { book: 'Psalms', chapter: 23, verse: 5 },
      { book: 'Psalms', chapter: 23, verse: 6 },
      { book: 'Psalms', chapter: 46, verse: 1 },
      { book: 'Psalms', chapter: 46, verse: 2 },
      { book: 'Psalms', chapter: 51, verse: 10 },
      { book: 'Psalms', chapter: 51, verse: 11 },
      { book: 'Psalms', chapter: 51, verse: 12 },
      { book: 'Psalms', chapter: 91, verse: 1 },
      { book: 'Psalms', chapter: 91, verse: 2 },
      { book: 'Psalms', chapter: 119, verse: 105 },
      { book: 'Psalms', chapter: 121, verse: 1 },
      { book: 'Psalms', chapter: 121, verse: 2 },
      { book: 'Psalms', chapter: 121, verse: 3 },
      { book: 'Psalms', chapter: 121, verse: 4 },
      { book: 'Psalms', chapter: 121, verse: 5 },
      { book: 'Psalms', chapter: 121, verse: 6 },
      { book: 'Psalms', chapter: 121, verse: 7 },
      { book: 'Psalms', chapter: 121, verse: 8 },
      { book: 'Psalms', chapter: 139, verse: 14 },
    ],
  },
  {
    id: 'anchor-verses',
    title: 'Essential Anchor Scripture',
    subtitle: 'Foundational Passages Across the Canon',
    category: 'Anchor',
    description:
      'Eighteen cornerstone verses spanning Creation, the Prophets, the Gospels, and the Epistles.',
    contextNote:
      'Designed for targeted memorization rather than full-canon transcription. Add this pack to your Memory Deck to master high-leverage passages across Old and New Testaments.',
    verses: [
      { book: 'Genesis', chapter: 1, verse: 1 },
      { book: 'Proverbs', chapter: 3, verse: 5 },
      { book: 'Proverbs', chapter: 3, verse: 6 },
      { book: 'Isaiah', chapter: 40, verse: 31 },
      { book: 'Jeremiah', chapter: 29, verse: 11 },
      { book: 'Matthew', chapter: 6, verse: 9 },
      { book: 'Matthew', chapter: 6, verse: 10 },
      { book: 'Matthew', chapter: 6, verse: 11 },
      { book: 'Matthew', chapter: 6, verse: 12 },
      { book: 'Matthew', chapter: 6, verse: 13 },
      { book: 'John', chapter: 1, verse: 1 },
      { book: 'John', chapter: 3, verse: 16 },
      { book: 'Romans', chapter: 8, verse: 28 },
      { book: '1 Corinthians', chapter: 13, verse: 4 },
      { book: '1 Corinthians', chapter: 13, verse: 5 },
      { book: '1 Corinthians', chapter: 13, verse: 6 },
      { book: '1 Corinthians', chapter: 13, verse: 7 },
      { book: 'Philippians', chapter: 4, verse: 6 },
      { book: 'Philippians', chapter: 4, verse: 7 },
      { book: 'Philippians', chapter: 4, verse: 8 },
      { book: 'Philippians', chapter: 4, verse: 13 },
    ],
  },
  {
    id: 'proverbs-wisdom',
    title: 'Proverbs: Wisdom & Discipline',
    subtitle: 'Concise Maxims for Judgment, Speech & Craft',
    category: 'Wisdom',
    description:
      'Sharp two-clause proverbs on intellectual humility, guarded speech, and deliberate action.',
    contextNote:
      'Hebrew wisdom maxims use antithetical and synthetic parallelism—ideal for Stage 2 (every other word) and Stage 4 (first and last word) recall drills.',
    verses: [
      { book: 'Proverbs', chapter: 1, verse: 7 },
      { book: 'Proverbs', chapter: 3, verse: 5 },
      { book: 'Proverbs', chapter: 3, verse: 6 },
      { book: 'Proverbs', chapter: 4, verse: 23 },
      { book: 'Proverbs', chapter: 15, verse: 1 },
      { book: 'Proverbs', chapter: 16, verse: 3 },
      { book: 'Proverbs', chapter: 16, verse: 9 },
      { book: 'Proverbs', chapter: 27, verse: 17 },
    ],
  },
  {
    id: 'sermon-on-the-mount',
    title: "Sermon on the Mount: Beatitudes & Lord's Prayer",
    subtitle: 'Matthew 5:3–12 & Matthew 6:9–13',
    category: 'Study Plan',
    description:
      'The opening Beatitudes and the Pater Noster from the Sermon on the Mount in the World English Bible.',
    contextNote:
      'Because each Beatitude shares the recurring "Blessed are..." opening and "for..." resolution, Stage 3 (first letters) rapidly builds complete verbatim recall of the sequence.',
    verses: [
      { book: 'Matthew', chapter: 5, verse: 3 },
      { book: 'Matthew', chapter: 5, verse: 4 },
      { book: 'Matthew', chapter: 5, verse: 5 },
      { book: 'Matthew', chapter: 5, verse: 6 },
      { book: 'Matthew', chapter: 5, verse: 7 },
      { book: 'Matthew', chapter: 5, verse: 8 },
      { book: 'Matthew', chapter: 5, verse: 9 },
      { book: 'Matthew', chapter: 5, verse: 10 },
      { book: 'Matthew', chapter: 5, verse: 11 },
      { book: 'Matthew', chapter: 5, verse: 12 },
      { book: 'Matthew', chapter: 6, verse: 9 },
      { book: 'Matthew', chapter: 6, verse: 10 },
      { book: 'Matthew', chapter: 6, verse: 11 },
      { book: 'Matthew', chapter: 6, verse: 12 },
      { book: 'Matthew', chapter: 6, verse: 13 },
    ],
  },
];

export function getCuratedPlanById(planId: string): CuratedPlanDefinition | undefined {
  return CURATED_PLANS.find((plan) => plan.id === planId);
}
