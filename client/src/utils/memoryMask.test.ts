import {
  maskVerseForStage,
  renderMaskedVerseCharacters,
  MEMORY_STAGES,
} from './memoryMask';

describe('memoryMask utility (Epic 5)', () => {
  const sampleVerse = 'In the beginning, God created the heavens and the earth.';

  it('defines all 5 progressive stages in order', () => {
    expect(MEMORY_STAGES.map((s) => s.stage)).toEqual([1, 2, 3, 4, 5]);
  });

  it('Stage 1 returns full unmasked text', () => {
    expect(maskVerseForStage(sampleVerse, 1)).toBe(sampleVerse);
  });

  it('Stage 2 masks every 2nd word while preserving punctuation and length', () => {
    const masked = maskVerseForStage(sampleVerse, 2);
    expect(masked).toBe('In ___ beginning, ___ created ___ heavens ___ the _____.');
    expect(masked).toHaveLength(sampleVerse.length);
  });

  it('Stage 3 keeps the first letter/digit of each word and preserves punctuation', () => {
    const masked = maskVerseForStage(sampleVerse, 3);
    expect(masked).toBe('I_ t__ b________, G__ c______ t__ h______ a__ t__ e____.');
    expect(masked).toHaveLength(sampleVerse.length);

    const quotedVerse = '"Plans to prosper you," declares Yahweh.';
    expect(maskVerseForStage(quotedVerse, 3)).toBe('"P____ t_ p______ y__," d_______ Y_____.');
  });

  it('Stage 4 keeps only the first and last word visible and masks middle words', () => {
    const masked = maskVerseForStage(sampleVerse, 4);
    expect(masked).toBe('In ___ _________, ___ _______ ___ _______ ___ ___ earth.');
    expect(masked).toHaveLength(sampleVerse.length);
  });

  it('Stage 5 masks all alphanumeric characters while preserving punctuation and spaces', () => {
    const masked = maskVerseForStage(sampleVerse, 5);
    expect(masked).toBe('__ ___ _________, ___ _______ ___ _______ ___ ___ _____.');
    expect(masked).toHaveLength(sampleVerse.length);
  });

  it('renderMaskedVerseCharacters reveals typed characters with correct/incorrect status and keeps untyped characters masked', () => {
    const verse = 'The LORD is my shepherd.';
    // Stage 2: "The ____ is __ shepherd."
    const descriptors = renderMaskedVerseCharacters(verse, 'The LOX', 2);

    expect(descriptors).toHaveLength(verse.length);

    // Typed prefix 'The LO' is correct and revealed
    expect(descriptors[0]).toEqual({
      index: 0,
      displayChar: 'T',
      actualChar: 'T',
      status: 'correct',
      isMasked: false,
    });
    expect(descriptors[4]).toEqual({
      index: 4,
      displayChar: 'L',
      actualChar: 'L',
      status: 'correct',
      isMasked: false,
    });
    expect(descriptors[5]).toEqual({
      index: 5,
      displayChar: 'O',
      actualChar: 'O',
      status: 'correct',
      isMasked: false,
    });
    // Index 6 typed 'X' instead of 'R' -> revealed as actualChar 'R' with status 'incorrect'
    expect(descriptors[6]).toEqual({
      index: 6,
      displayChar: 'R',
      actualChar: 'R',
      status: 'incorrect',
      isMasked: false,
    });
    // Index 7 ('D' in LORD) is not yet typed, so it remains masked '_' in Stage 2
    expect(descriptors[7]).toEqual({
      index: 7,
      displayChar: '_',
      actualChar: 'D',
      status: 'untyped',
      isMasked: true,
    });
  });
});
