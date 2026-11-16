/**
 * Counts the number of mismatched or overflow characters in `typedText` compared to `targetText`.
 */
export function countIncorrectCharacters(typedText: string, targetText: string): number {
  let incorrect = 0;
  for (let i = 0; i < typedText.length; i++) {
    if (i >= targetText.length || typedText[i] !== targetText[i]) {
      incorrect++;
    }
  }
  return incorrect;
}

/**
 * Calculates typing accuracy as an integer percentage clamped to [0, 100].
 * Returns 100 when no characters have been typed (`typedLength <= 0`).
 */
export function calculateAccuracy(typedLength: number, incorrectCount: number): number {
  if (!Number.isFinite(typedLength) || typedLength <= 0) {
    return 100;
  }
  if (!Number.isFinite(incorrectCount)) {
    return 0;
  }
  const rawAccuracy = Math.round(((typedLength - incorrectCount) / typedLength) * 100);
  return Math.max(0, Math.min(100, rawAccuracy));
}

/**
 * Calculates rounded words per minute, returning 0 when duration or word count is non-positive.
 */
export function calculateWpm(words: number, durationMs: number): number {
  if (!Number.isFinite(words) || !Number.isFinite(durationMs) || durationMs <= 0 || words <= 0) {
    return 0;
  }
  const durationInMinutes = durationMs / 1000 / 60;
  return Math.round(words / durationInMinutes);
}

/**
 * Calculates characters per second, returning 0 when duration or character count is non-positive.
 */
export function calculateCps(characters: number, durationMs: number): number {
  if (!Number.isFinite(characters) || !Number.isFinite(durationMs) || durationMs <= 0 || characters <= 0) {
    return 0;
  }
  return characters / (durationMs / 1000);
}
