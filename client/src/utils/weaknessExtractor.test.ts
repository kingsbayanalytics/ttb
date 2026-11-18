import {
  extractTypingErrors,
  recordKeystrokeMismatches,
} from './weaknessExtractor';

describe('weaknessExtractor', () => {
  const sampleVerse =
    "Blessed is the man who doesn't walk in the counsel of the wicked;";

  it('records keystroke mismatches across progressive edits even when corrected later', () => {
    let mismatches = recordKeystrokeMismatches(sampleVerse, 'Blessed is the man who doesnt');
    // At index 28 ("'"), user typed 't' instead of "'"
    expect(mismatches.has(28)).toBe(true);

    // User backspaces and fixes it, then mistypes the final semicolon as ':'
    const withColon =
      "Blessed is the man who doesn't walk in the counsel of the wicked:";
    mismatches = recordKeystrokeMismatches(sampleVerse, withColon, mismatches);

    expect(mismatches.has(28)).toBe(true);
    expect(mismatches.has(sampleVerse.length - 1)).toBe(true);

    const report = extractTypingErrors(sampleVerse, mismatches);
    expect(report.missedChars).toEqual([
      { char: "'", count: 1 },
      { char: ';', count: 1 },
    ]);
    expect(report.missedWords).toEqual([
      { word: "doesn't", count: 1 },
      { word: 'wicked', count: 1 },
    ]);
  });

  it('extracts missed characters and containing words from a typed string or Map', () => {
    const verse = 'In the beginning, God created the heavens.';
    const typed = 'In the beginnXng; God created the heavYns.';

    const fromString = extractTypingErrors(verse, typed);
    expect(fromString.missedChars).toEqual([
      { char: ',', count: 1 },
      { char: 'e', count: 1 },
      { char: 'i', count: 1 },
    ]);
    // Both 'i' and ',' belong to the token "beginning," so "beginning" is counted once per token
    expect(fromString.missedWords).toEqual([
      { word: 'beginning', count: 1 },
      { word: 'heavens', count: 1 },
    ]);

    const mismatchMap = new Map<number, string>([
      [13, 'X'],
      [16, ';'],
    ]);
    const fromMap = extractTypingErrors(verse, mismatchMap);
    expect(fromMap.missedChars).toEqual([
      { char: ',', count: 1 },
      { char: 'i', count: 1 },
    ]);
    expect(fromMap.missedWords).toEqual([{ word: 'beginning', count: 1 }]);
  });

  it('returns empty arrays when there are no errors or verseText is empty', () => {
    expect(extractTypingErrors(sampleVerse, sampleVerse)).toEqual({
      missedChars: [],
      missedWords: [],
    });
    expect(extractTypingErrors('', [0, 1])).toEqual({
      missedChars: [],
      missedWords: [],
    });
  });
});
