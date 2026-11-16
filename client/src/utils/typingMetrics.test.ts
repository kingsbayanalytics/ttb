import {
  countIncorrectCharacters,
  calculateAccuracy,
  calculateWpm,
  calculateCps,
} from './typingMetrics';

describe('typingMetrics', () => {
  describe('countIncorrectCharacters', () => {
    it('returns 0 for empty typed text', () => {
      expect(countIncorrectCharacters('', 'In the beginning')).toBe(0);
    });

    it('counts all characters when all are wrong', () => {
      expect(countIncorrectCharacters('XXXXX', 'Hello')).toBe(5);
    });

    it('counts mismatched characters for partial/mixed input', () => {
      expect(countIncorrectCharacters('In thX', 'In the')).toBe(1);
    });

    it('counts overflow characters when typedText is longer than targetText', () => {
      expect(countIncorrectCharacters('Hello!!', 'Hello')).toBe(2);
      expect(countIncorrectCharacters('Hxllo!!', 'Hello')).toBe(3);
    });

    it('returns 0 when typed text exactly matches target text', () => {
      expect(countIncorrectCharacters('Hello', 'Hello')).toBe(0);
    });
  });

  describe('calculateAccuracy', () => {
    it('returns 100 for empty or non-positive typed length', () => {
      expect(calculateAccuracy(0, 0)).toBe(100);
      expect(calculateAccuracy(-3, 0)).toBe(100);
    });

    it('returns 0 when all typed characters are incorrect (never falls back to 100)', () => {
      expect(calculateAccuracy(5, 5)).toBe(0);
    });

    it('rounds mixed accuracy to the nearest integer', () => {
      expect(calculateAccuracy(6, 1)).toBe(83);
    });

    it('clamps accuracy to [0, 100]', () => {
      expect(calculateAccuracy(5, 8)).toBe(0);
      expect(calculateAccuracy(5, -2)).toBe(100);
    });

    it('handles non-finite inputs safely', () => {
      expect(calculateAccuracy(NaN, 0)).toBe(100);
      expect(calculateAccuracy(Infinity, 0)).toBe(100);
      expect(calculateAccuracy(5, NaN)).toBe(0);
      expect(calculateAccuracy(5, Infinity)).toBe(0);
    });
  });

  describe('calculateWpm', () => {
    it('calculates rounded words per minute for normal and fractional rates', () => {
      expect(calculateWpm(12, 30000)).toBe(24);
      expect(calculateWpm(10, 45000)).toBe(13);
      expect(calculateWpm(11, 45000)).toBe(15);
    });

    it('returns 0 for zero or negative duration (never Infinity or NaN)', () => {
      expect(calculateWpm(12, 0)).toBe(0);
      expect(calculateWpm(12, -5000)).toBe(0);
    });

    it('returns 0 for non-positive or non-finite inputs', () => {
      expect(calculateWpm(0, 30000)).toBe(0);
      expect(calculateWpm(-5, 30000)).toBe(0);
      expect(calculateWpm(NaN, 30000)).toBe(0);
      expect(calculateWpm(Infinity, 30000)).toBe(0);
      expect(calculateWpm(12, NaN)).toBe(0);
      expect(calculateWpm(12, Infinity)).toBe(0);
    });
  });

  describe('calculateCps', () => {
    it('calculates characters per second for normal duration', () => {
      expect(calculateCps(56, 30000)).toBeCloseTo(56 / 30, 10);
    });

    it('returns 0 for zero or negative duration (never Infinity or NaN)', () => {
      expect(calculateCps(56, 0)).toBe(0);
      expect(calculateCps(56, -500)).toBe(0);
    });

    it('returns 0 for non-positive or non-finite inputs', () => {
      expect(calculateCps(0, 30000)).toBe(0);
      expect(calculateCps(-10, 30000)).toBe(0);
      expect(calculateCps(NaN, 30000)).toBe(0);
      expect(calculateCps(Infinity, 30000)).toBe(0);
      expect(calculateCps(56, NaN)).toBe(0);
      expect(calculateCps(56, Infinity)).toBe(0);
    });
  });
});
