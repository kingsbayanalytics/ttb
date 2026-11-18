export interface MissedCharItem {
  char: string;
  count: number;
}

export interface MissedWordItem {
  word: string;
  count: number;
}

export interface ExtractedTypingErrors {
  missedChars: MissedCharItem[];
  missedWords: MissedWordItem[];
}

interface WordSpan {
  word: string;
  start: number;
  end: number;
}

/**
 * Records any character index in `verseText` where `typedText[i]` mismatched `verseText[i]`.
 * Returns a new Set containing all previously recorded indices plus any new mismatch indices.
 */
export function recordKeystrokeMismatches(
  verseText: string,
  typedText: string,
  existingIndices?: ReadonlySet<number>
): Set<number> {
  const next = new Set<number>(existingIndices ?? []);
  const maxIndex = Math.min(typedText.length, verseText.length);
  for (let i = 0; i < maxIndex; i += 1) {
    if (typedText[i] !== verseText[i]) {
      next.add(i);
    }
  }
  return next;
}

function normalizeToken(token: string): string {
  const trimmed = token.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, '');
  return trimmed.length > 0 ? trimmed : token.trim();
}

function buildWordSpans(verseText: string): WordSpan[] {
  const spans: WordSpan[] = [];
  const regex = /\S+/g;
  let match: RegExpExecArray | null = regex.exec(verseText);
  while (match !== null) {
    const raw = match[0];
    const normalized = normalizeToken(raw);
    if (normalized.length > 0) {
      spans.push({
        word: normalized,
        start: match.index,
        end: match.index + raw.length - 1,
      });
    }
    match = regex.exec(verseText);
  }
  return spans;
}

function resolveErrorIndices(
  verseText: string,
  errorSource:
    | ReadonlySet<number>
    | ReadonlyArray<number>
    | ReadonlyMap<number, string>
    | string
): number[] {
  if (typeof errorSource === 'string') {
    const indices: number[] = [];
    const maxLen = Math.min(errorSource.length, verseText.length);
    for (let i = 0; i < maxLen; i += 1) {
      if (errorSource[i] !== verseText[i]) {
        indices.push(i);
      }
    }
    return indices;
  }

  if (errorSource instanceof Map) {
    const indices: number[] = [];
    Array.from(errorSource.entries()).forEach(([idx, typedChar]) => {
      if (idx >= 0 && idx < verseText.length && typedChar !== verseText[idx]) {
        indices.push(idx);
      }
    });
    return indices;
  }

  const unique = new Set<number>();
  Array.from(errorSource as Iterable<number>).forEach((idx) => {
    if (Number.isInteger(idx) && idx >= 0 && idx < verseText.length) {
      unique.add(idx);
    }
  });
  return Array.from(unique).sort((a, b) => a - b);
}

/**
 * Maps recorded mismatch indices (or final typed string / mismatch map) in `verseText`
 * to missed character/punctuation counts and missed containing words.
 */
export function extractTypingErrors(
  verseText: string,
  errorSource:
    | ReadonlySet<number>
    | ReadonlyArray<number>
    | ReadonlyMap<number, string>
    | string
): ExtractedTypingErrors {
  if (!verseText) {
    return { missedChars: [], missedWords: [] };
  }

  const indices = resolveErrorIndices(verseText, errorSource);
  if (indices.length === 0) {
    return { missedChars: [], missedWords: [] };
  }

  const charCounts = new Map<string, number>();
  const wordCounts = new Map<string, number>();
  const spans = buildWordSpans(verseText);
  const countedSpanStarts = new Set<number>();

  for (const idx of indices) {
    const expectedChar = verseText[idx];
    if (!expectedChar) continue;

    charCounts.set(expectedChar, (charCounts.get(expectedChar) ?? 0) + 1);

    const span = spans.find((s) => idx >= s.start && idx <= s.end);
    if (span && !countedSpanStarts.has(span.start)) {
      countedSpanStarts.add(span.start);
      wordCounts.set(span.word, (wordCounts.get(span.word) ?? 0) + 1);
    }
  }

  const missedChars: MissedCharItem[] = Array.from(charCounts.entries())
    .map(([char, count]) => ({ char, count }))
    .sort((a, b) => b.count - a.count || (a.char < b.char ? -1 : a.char > b.char ? 1 : 0));

  const missedWords: MissedWordItem[] = Array.from(wordCounts.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count || (a.word < b.word ? -1 : a.word > b.word ? 1 : 0));

  return { missedChars, missedWords };
}
