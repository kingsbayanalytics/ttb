export interface CuratedVerseRef {
  book: string;
  chapter: number;
  verse: number;
}

export type CuratedPlanCategory =
  | 'Mantra'
  | 'Anchor'
  | 'Wisdom'
  | 'Study Plan'
  | 'Gospels'
  | 'Epistles';

export interface CuratedPlanDefinition {
  id: string;
  title: string;
  subtitle: string;
  category: CuratedPlanCategory;
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
    id: 'psalm-23-complete',
    title: "Psalm 23: The Shepherd's Mantra",
    subtitle: 'Complete 6-Verse Psalm for Calm & Trust',
    category: 'Mantra',
    description:
      'Every verse of Psalm 23 in sequence—short enough to master verbatim in a single week of daily typing.',
    contextNote:
      'Six tightly linked verses move from pastoral stillness to courage in the valley and overflowing gratitude. Ideal for reaching Stage 5 full recall.',
    verses: [
      { book: 'Psalms', chapter: 23, verse: 1 },
      { book: 'Psalms', chapter: 23, verse: 2 },
      { book: 'Psalms', chapter: 23, verse: 3 },
      { book: 'Psalms', chapter: 23, verse: 4 },
      { book: 'Psalms', chapter: 23, verse: 5 },
      { book: 'Psalms', chapter: 23, verse: 6 },
    ],
  },
  {
    id: 'psalm-91-protection',
    title: 'Psalm 91: Refuge & Protection',
    subtitle: 'Complete 16-Verse Psalm of Steadfast Courage',
    category: 'Mantra',
    description:
      'The complete Psalm 91—traditionally prayed at nightfall for shelter, peace, and steady resolve.',
    contextNote:
      'Notice the shifting voice from first-person trust (vv. 1–2) to second-person promise (vv. 3–13) to divine assurance (vv. 14–16).',
    verses: [
      { book: 'Psalms', chapter: 91, verse: 1 },
      { book: 'Psalms', chapter: 91, verse: 2 },
      { book: 'Psalms', chapter: 91, verse: 3 },
      { book: 'Psalms', chapter: 91, verse: 4 },
      { book: 'Psalms', chapter: 91, verse: 5 },
      { book: 'Psalms', chapter: 91, verse: 6 },
      { book: 'Psalms', chapter: 91, verse: 7 },
      { book: 'Psalms', chapter: 91, verse: 8 },
      { book: 'Psalms', chapter: 91, verse: 9 },
      { book: 'Psalms', chapter: 91, verse: 10 },
      { book: 'Psalms', chapter: 91, verse: 11 },
      { book: 'Psalms', chapter: 91, verse: 12 },
      { book: 'Psalms', chapter: 91, verse: 13 },
      { book: 'Psalms', chapter: 91, verse: 14 },
      { book: 'Psalms', chapter: 91, verse: 15 },
      { book: 'Psalms', chapter: 91, verse: 16 },
    ],
  },
  {
    id: 'anchor-verses',
    title: 'Essential Anchor Scripture',
    subtitle: 'Foundational Passages Across the Canon',
    category: 'Anchor',
    description:
      'Twenty-one cornerstone verses spanning Creation, the Prophets, the Gospels, and the Epistles.',
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
    id: 'ecclesiastes-seasons',
    title: 'Ecclesiastes 3: A Time for Everything',
    subtitle: 'Ecclesiastes 3:1–8 & 3:11',
    category: 'Wisdom',
    description:
      'The classic poetic meditation on seasons, impermanence, and eternity placed in the human heart.',
    contextNote:
      'Fourteen paired opposites create a hypnotic typing rhythm that builds bilateral keystroke cadence while grounding perspective.',
    verses: [
      { book: 'Ecclesiastes', chapter: 3, verse: 1 },
      { book: 'Ecclesiastes', chapter: 3, verse: 2 },
      { book: 'Ecclesiastes', chapter: 3, verse: 3 },
      { book: 'Ecclesiastes', chapter: 3, verse: 4 },
      { book: 'Ecclesiastes', chapter: 3, verse: 5 },
      { book: 'Ecclesiastes', chapter: 3, verse: 6 },
      { book: 'Ecclesiastes', chapter: 3, verse: 7 },
      { book: 'Ecclesiastes', chapter: 3, verse: 8 },
      { book: 'Ecclesiastes', chapter: 3, verse: 11 },
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
  {
    id: 'gospel-of-john',
    title: 'Gospel of John: Light, Word & Life',
    subtitle: 'John 1, 3, 8, 10, 11, 14, 15 & 16',
    category: 'Gospels',
    description:
      'The Prologue of the Word, John 3:16, and the central "I Am" and peace declarations across the Fourth Gospel.',
    contextNote:
      'John pairs deceptively simple vocabulary—light, life, truth, vine, peace—with deep philosophical cadence.',
    verses: [
      { book: 'John', chapter: 1, verse: 1 },
      { book: 'John', chapter: 1, verse: 2 },
      { book: 'John', chapter: 1, verse: 3 },
      { book: 'John', chapter: 1, verse: 4 },
      { book: 'John', chapter: 1, verse: 5 },
      { book: 'John', chapter: 3, verse: 16 },
      { book: 'John', chapter: 3, verse: 17 },
      { book: 'John', chapter: 8, verse: 12 },
      { book: 'John', chapter: 10, verse: 10 },
      { book: 'John', chapter: 11, verse: 25 },
      { book: 'John', chapter: 14, verse: 6 },
      { book: 'John', chapter: 14, verse: 27 },
      { book: 'John', chapter: 15, verse: 5 },
      { book: 'John', chapter: 16, verse: 33 },
    ],
  },
  {
    id: 'romans-8-assurance',
    title: 'Romans 8: Unshakeable Assurance',
    subtitle: 'Romans 8:1, 18, 28, 31, 35 & 37–39',
    category: 'Epistles',
    description:
      "Paul's soaring rhetorical crescendo on perseverance, hope, and love that cannot be severed.",
    contextNote:
      'Longer compound sentences and punctuation make Romans 8 an excellent stamina and comma-accuracy workout.',
    verses: [
      { book: 'Romans', chapter: 8, verse: 1 },
      { book: 'Romans', chapter: 8, verse: 18 },
      { book: 'Romans', chapter: 8, verse: 28 },
      { book: 'Romans', chapter: 8, verse: 31 },
      { book: 'Romans', chapter: 8, verse: 35 },
      { book: 'Romans', chapter: 8, verse: 37 },
      { book: 'Romans', chapter: 8, verse: 38 },
      { book: 'Romans', chapter: 8, verse: 39 },
    ],
  },
  {
    id: 'love-and-peace',
    title: 'Love, Peace & Steadfastness',
    subtitle: '1 Corinthians 13, Philippians 4 & Isaiah',
    category: 'Epistles',
    description:
      'The hymn of love paired with anxiety-quieting passages from Philippians and Isaiah for calm daily practice.',
    contextNote:
      'Great for evening wind-down typing sessions—short declarative clauses keep WPM smooth while reinforcing steadiness.',
    verses: [
      { book: '1 Corinthians', chapter: 13, verse: 4 },
      { book: '1 Corinthians', chapter: 13, verse: 5 },
      { book: '1 Corinthians', chapter: 13, verse: 6 },
      { book: '1 Corinthians', chapter: 13, verse: 7 },
      { book: '1 Corinthians', chapter: 13, verse: 8 },
      { book: '1 Corinthians', chapter: 13, verse: 13 },
      { book: 'Philippians', chapter: 4, verse: 6 },
      { book: 'Philippians', chapter: 4, verse: 7 },
      { book: 'Philippians', chapter: 4, verse: 8 },
      { book: 'Philippians', chapter: 4, verse: 13 },
      { book: 'Isaiah', chapter: 26, verse: 3 },
      { book: 'Isaiah', chapter: 40, verse: 31 },
      { book: 'Isaiah', chapter: 41, verse: 10 },
    ],
  },
];

export function getCuratedPlanById(planId: string): CuratedPlanDefinition | undefined {
  return CURATED_PLANS.find((plan) => plan.id === planId);
}
