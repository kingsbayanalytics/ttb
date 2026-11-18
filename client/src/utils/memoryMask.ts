export type MemoryStage = 1 | 2 | 3 | 4 | 5;

export interface MemoryStageMeta {
  stage: MemoryStage;
  title: string;
  shortTitle: string;
  description: string;
}

export const MEMORY_STAGES: ReadonlyArray<MemoryStageMeta> = [
  {
    stage: 1,
    title: 'Stage 1 · Full Text',
    shortTitle: 'Full Text',
    description: 'Complete scripture text visible to establish rhythm and keystroke accuracy.',
  },
  {
    stage: 2,
    title: 'Stage 2 · Every Other Word',
    shortTitle: 'Every Other Word',
    description: 'Alternating words are masked while punctuation and cadence remain visible.',
  },
  {
    stage: 3,
    title: 'Stage 3 · First Letters',
    shortTitle: 'First Letters',
    description: 'Only the opening letter of each word and punctuation marks are shown.',
  },
  {
    stage: 4,
    title: 'Stage 4 · First & Last Word',
    shortTitle: 'First & Last Word',
    description: 'Bookend words anchor the verse while the interior is recalled from memory.',
  },
  {
    stage: 5,
    title: 'Stage 5 · Full Recall',
    shortTitle: 'Full Recall',
    description: 'All letters masked; type the entire passage from internalized memory.',
  },
];

export interface MaskedCharacterDescriptor {
  index: number;
  displayChar: string;
  actualChar: string;
  status: 'untyped' | 'correct' | 'incorrect';
  isMasked: boolean;
}

const ALPHANUMERIC_REGEX = /[A-Za-z0-9]/;

function maskAllAlphanumeric(token: string): string {
  return token
    .split('')
    .map((ch) => (ALPHANUMERIC_REGEX.test(ch) ? '_' : ch))
    .join('');
}

function maskKeepFirstAlphanumeric(token: string): string {
  let keptFirst = false;
  return token
    .split('')
    .map((ch) => {
      if (!ALPHANUMERIC_REGEX.test(ch)) {
        return ch;
      }
      if (!keptFirst) {
        keptFirst = true;
        return ch;
      }
      return '_';
    })
    .join('');
}

/**
 * Masks a verse string according to the 5 progressive memorization stages.
 * Always preserves exact character length, whitespace, and punctuation.
 */
export function maskVerseForStage(text: string, stage: MemoryStage): string {
  if (!text || stage === 1) {
    return text;
  }

  const parts = text.split(/(\s+)/);
  const wordIndices: number[] = [];

  parts.forEach((part, partIdx) => {
    if (part && !/^\s+$/.test(part) && ALPHANUMERIC_REGEX.test(part)) {
      wordIndices.push(partIdx);
    }
  });

  const totalWords = wordIndices.length;
  const wordOrderByPartIndex = new Map<number, number>();
  wordIndices.forEach((partIdx, orderIdx) => {
    wordOrderByPartIndex.set(partIdx, orderIdx);
  });

  return parts
    .map((part, partIdx) => {
      const wordOrder = wordOrderByPartIndex.get(partIdx);
      if (wordOrder === undefined) {
        return part;
      }

      switch (stage) {
        case 2:
          // 1-indexed words 2, 4, 6... (0-indexed odd indices) are masked
          return wordOrder % 2 === 1 ? maskAllAlphanumeric(part) : part;
        case 3:
          return maskKeepFirstAlphanumeric(part);
        case 4:
          if (wordOrder === 0 || wordOrder === totalWords - 1) {
            return part;
          }
          return maskAllAlphanumeric(part);
        case 5:
          return maskAllAlphanumeric(part);
        default:
          return part;
      }
    })
    .join('');
}

/**
 * Produces per-character display descriptors for live typing across Stages 1–5.
 * Characters already typed (< typedText.length) reveal the true character with
 * 'correct' or 'incorrect' status; untyped characters show the stage-masked text.
 */
export function renderMaskedVerseCharacters(
  verseText: string,
  typedText: string,
  stage: MemoryStage
): MaskedCharacterDescriptor[] {
  const maskedText = maskVerseForStage(verseText, stage);
  const descriptors: MaskedCharacterDescriptor[] = [];

  for (let i = 0; i < verseText.length; i += 1) {
    const actualChar = verseText[i];
    const maskedChar = maskedText[i] ?? actualChar;

    if (i < typedText.length) {
      const isCorrect = typedText[i] === actualChar;
      descriptors.push({
        index: i,
        displayChar: actualChar,
        actualChar,
        status: isCorrect ? 'correct' : 'incorrect',
        isMasked: false,
      });
    } else {
      descriptors.push({
        index: i,
        displayChar: maskedChar,
        actualChar,
        status: 'untyped',
        isMasked: maskedChar !== actualChar,
      });
    }
  }

  return descriptors;
}
