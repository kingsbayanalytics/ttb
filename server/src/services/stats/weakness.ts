export interface WeakResultInput {
  missedChars?: ReadonlyArray<{ char: string; count: number }> | null;
  missedWords?: ReadonlyArray<{ word: string; count: number }> | null;
}

export interface WeaknessCharacterStat {
  char: string;
  label: string;
  count: number;
}

export interface WeaknessWordStat {
  word: string;
  count: number;
}

export interface WeaknessReport {
  topCharacters: WeaknessCharacterStat[];
  topWords: WeaknessWordStat[];
  totalTrackedAttempts: number;
  suggestedDrillText: string;
}

const CHARACTER_LABELS: Record<string, string> = {
  ' ': 'Space (␣)',
  ';': 'Semicolon (;)',
  ':': 'Colon (:)',
  ',': 'Comma (,)',
  '.': 'Period (.)',
  "'": "Apostrophe (')",
  '"': 'Quotation (")',
  '?': 'Question (?)',
  '!': 'Exclamation (!)',
  '-': 'Hyphen (-)',
  '(': 'Left Paren (()',
  ')': 'Right Paren ())',
};

export function describeCharacterLabel(char: string): string {
  if (Object.prototype.hasOwnProperty.call(CHARACTER_LABELS, char)) {
    return CHARACTER_LABELS[char];
  }
  return char;
}

/**
 * Aggregates missed characters and words across user Result documents into a ranked WeaknessReport.
 */
export function buildWeaknessReport(
  results: ReadonlyArray<WeakResultInput>,
  maxItems = 10
): WeaknessReport {
  const charTotals = new Map<string, number>();
  const wordTotals = new Map<string, number>();
  let totalTrackedAttempts = 0;

  for (const row of results) {
    const hasChars = Array.isArray(row.missedChars) && row.missedChars.length > 0;
    const hasWords = Array.isArray(row.missedWords) && row.missedWords.length > 0;
    if (hasChars || hasWords) {
      totalTrackedAttempts += 1;
    }

    if (Array.isArray(row.missedChars)) {
      for (const item of row.missedChars) {
        if (
          item &&
          typeof item.char === 'string' &&
          item.char.length > 0 &&
          typeof item.count === 'number' &&
          item.count > 0
        ) {
          charTotals.set(item.char, (charTotals.get(item.char) ?? 0) + item.count);
        }
      }
    }

    if (Array.isArray(row.missedWords)) {
      for (const item of row.missedWords) {
        if (
          item &&
          typeof item.word === 'string' &&
          item.word.trim().length > 0 &&
          typeof item.count === 'number' &&
          item.count > 0
        ) {
          const cleanWord = item.word.trim();
          wordTotals.set(cleanWord, (wordTotals.get(cleanWord) ?? 0) + item.count);
        }
      }
    }
  }

  const topCharacters: WeaknessCharacterStat[] = Array.from(charTotals.entries())
    .map(([char, count]) => ({
      char,
      label: describeCharacterLabel(char),
      count,
    }))
    .sort((a, b) => b.count - a.count || a.char.localeCompare(b.char))
    .slice(0, maxItems);

  const topWords: WeaknessWordStat[] = Array.from(wordTotals.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word))
    .slice(0, maxItems);

  const drillWords = topWords.slice(0, 6).map((item) => item.word);
  let suggestedDrillText = '';
  if (drillWords.length > 0) {
    // Repeat top weak words twice with editorial punctuation so user practices both words and transitions
    suggestedDrillText = `${drillWords.join(' ')} ${drillWords.join(' ')}`;
  } else if (topCharacters.length > 0) {
    const sampleChars = topCharacters
      .slice(0, 5)
      .map((item) => (item.char === ' ' ? '_' : item.char));
    suggestedDrillText = sampleChars.join(' ');
  }

  return {
    topCharacters,
    topWords,
    totalTrackedAttempts,
    suggestedDrillText,
  };
}
