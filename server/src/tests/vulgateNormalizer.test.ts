import fs from 'fs';
import path from 'path';
import {
  DrPsalmInput,
  normalizeDouayBookName,
  normalizeVulgatePsalm,
  normalizeVulgatePsalmEntries,
  validateNormalizedBookChapter,
} from '../utils/vulgateNormalizer';
import {
  MAX_COMMUNITY_QUOTE_EXCERPT_LENGTH,
  validateCommunityBundle,
  validateCommunityEntry,
} from '../utils/communityBundleValidator';
import { isCanonicalBook } from '../utils/bookMapping';

describe('Story 9.3: Vulgate/Douay-Rheims Normalizer & Community Bundle Validator', () => {
  describe('normalizeVulgatePsalm boundary cases', () => {
    it('maps DR 1..8 identically to WEB 1..8', () => {
      for (let n = 1; n <= 8; n += 1) {
        const res = normalizeVulgatePsalm(n);
        expect(res.webChapter).toBe(n);
        expect(res.webChapters).toEqual([n]);
        expect(res.mode).toBe('exact');
        expect(res.originalRef).toBe(`Douay-Rheims Psalm ${n}`);
      }
    });

    it('splits DR 9 (vv. 1-21 -> WEB 9, vv. 22-39 -> WEB 10)', () => {
      const chOnly = normalizeVulgatePsalm(9);
      expect(chOnly.mode).toBe('split');
      expect(chOnly.webChapters).toEqual([9, 10]);
      expect(chOnly.webChapter).toBeNull();

      expect(normalizeVulgatePsalm(9, 1).webChapter).toBe(9);
      expect(normalizeVulgatePsalm(9, 21).webChapter).toBe(9);
      expect(normalizeVulgatePsalm(9, 21).originalRef).toBe('Douay-Rheims Psalm 9 (vv. 1–21)');
      expect(normalizeVulgatePsalm(9, 22).webChapter).toBe(10);
      expect(normalizeVulgatePsalm(9, 39).webChapter).toBe(10);
      expect(normalizeVulgatePsalm(9, 22).originalRef).toBe('Douay-Rheims Psalm 9 (vv. 22–39)');
    });

    it('shifts DR 10..112 by +1 to WEB 11..113', () => {
      expect(normalizeVulgatePsalm(10).webChapter).toBe(11);
      expect(normalizeVulgatePsalm(22).webChapter).toBe(23);
      expect(normalizeVulgatePsalm(22).originalRef).toBe('Douay-Rheims Psalm 22');
      expect(normalizeVulgatePsalm(50).webChapter).toBe(51);
      expect(normalizeVulgatePsalm(90).webChapter).toBe(91);
      expect(normalizeVulgatePsalm(112).webChapter).toBe(113);
    });

    it('splits DR 113 (vv. 1-8 -> WEB 114, vv. 9-26 -> WEB 115)', () => {
      const chOnly = normalizeVulgatePsalm(113);
      expect(chOnly.mode).toBe('split');
      expect(chOnly.webChapters).toEqual([114, 115]);

      expect(normalizeVulgatePsalm(113, 1).webChapter).toBe(114);
      expect(normalizeVulgatePsalm(113, 8).webChapter).toBe(114);
      expect(normalizeVulgatePsalm(113, 9).webChapter).toBe(115);
      expect(normalizeVulgatePsalm(113, 26).webChapter).toBe(115);
    });

    it('merges DR 114 + DR 115 into WEB 116', () => {
      const m114 = normalizeVulgatePsalm(114);
      const m115 = normalizeVulgatePsalm(115);
      expect(m114.mode).toBe('merge');
      expect(m114.webChapter).toBe(116);
      expect(m115.mode).toBe('merge');
      expect(m115.webChapter).toBe(116);
      expect(m114.originalRef).toBe('Douay-Rheims Psalms 114–115');
    });

    it('shifts DR 116..145 by +1 to WEB 117..146', () => {
      expect(normalizeVulgatePsalm(116).webChapter).toBe(117);
      expect(normalizeVulgatePsalm(118).webChapter).toBe(119);
      expect(normalizeVulgatePsalm(120).webChapter).toBe(121);
      expect(normalizeVulgatePsalm(145).webChapter).toBe(146);
    });

    it('merges DR 146 + DR 147 into WEB 147', () => {
      const m146 = normalizeVulgatePsalm(146);
      const m147 = normalizeVulgatePsalm(147);
      expect(m146.mode).toBe('merge');
      expect(m146.webChapter).toBe(147);
      expect(m147.mode).toBe('merge');
      expect(m147.webChapter).toBe(147);
      expect(m146.originalRef).toBe('Douay-Rheims Psalms 146–147');
    });

    it('maps DR 148..150 identically to WEB 148..150 and rejects out-of-range inputs', () => {
      expect(normalizeVulgatePsalm(148).webChapter).toBe(148);
      expect(normalizeVulgatePsalm(149).webChapter).toBe(149);
      expect(normalizeVulgatePsalm(150).webChapter).toBe(150);
      expect(() => normalizeVulgatePsalm(0)).toThrow();
      expect(() => normalizeVulgatePsalm(151)).toThrow();
    });

    it('normalizes a full 150-Psalm Douay-Rheims fixture to exact WEB 1..150 with zero gaps or duplicates', () => {
      const fixture: DrPsalmInput[] = Array.from({ length: 150 }, (_, idx) => {
        const n = idx + 1;
        if (n === 9) {
          return {
            drPsalm: 9,
            title: 'DR Psalm 9',
            body: 'Full DR 9',
            verseBlocks: [
              { verse: 1, text: 'Praise in part 1' },
              { verse: 21, text: 'End of part 1' },
              { verse: 22, text: 'Start of WEB 10' },
              { verse: 39, text: 'End of WEB 10' },
            ],
          };
        }
        if (n === 113) {
          return {
            drPsalm: 113,
            title: 'DR Psalm 113',
            body: 'Full DR 113',
            verseBlocks: [
              { verse: 1, text: 'Exodus from Egypt' },
              { verse: 8, text: 'Flint into springs' },
              { verse: 9, text: 'Not to us, O Lord' },
              { verse: 26, text: 'Bless the Lord' },
            ],
          };
        }
        return {
          drPsalm: n,
          title: `DR Psalm ${n}`,
          body: `Commentary for DR Psalm ${n}`,
        };
      });

      const normalized = normalizeVulgatePsalmEntries(fixture);
      expect(normalized).toHaveLength(150);
      expect(normalized.map((e) => e.chapter)).toEqual(
        Array.from({ length: 150 }, (_, i) => i + 1)
      );

      // Verify split bodies
      const web9 = normalized.find((e) => e.chapter === 9)!;
      const web10 = normalized.find((e) => e.chapter === 10)!;
      expect(web9.body).toContain('v.1: Praise in part 1');
      expect(web9.body).not.toContain('Start of WEB 10');
      expect(web10.body).toContain('v.22: Start of WEB 10');
      expect(web10.source.originalRef).toBe('Douay-Rheims Psalm 9 (vv. 22–39)');

      const web114 = normalized.find((e) => e.chapter === 114)!;
      const web115 = normalized.find((e) => e.chapter === 115)!;
      expect(web114.body).toContain('Exodus from Egypt');
      expect(web115.body).toContain('Not to us, O Lord');

      // Verify merged bodies
      const web116 = normalized.find((e) => e.chapter === 116)!;
      expect(web116.body).toContain('Douay-Rheims Psalm 114');
      expect(web116.body).toContain('Douay-Rheims Psalm 115');
      expect(web116.source.originalRef).toBe('Douay-Rheims Psalms 114–115');

      const web147 = normalized.find((e) => e.chapter === 147)!;
      expect(web147.body).toContain('Douay-Rheims Psalm 146');
      expect(web147.body).toContain('Douay-Rheims Psalm 147');
      expect(web147.source.originalRef).toBe('Douay-Rheims Psalms 146–147');

      // Verify provenance on shifted psalm
      const web23 = normalized.find((e) => e.chapter === 23)!;
      expect(web23.source).toEqual({
        numberingSystem: 'vulgate-dr',
        originalRef: 'Douay-Rheims Psalm 22',
      });
    });
  });

  describe('normalizeDouayBookName aliases', () => {
    it('normalizes every legacy Douay-Rheims book alias 1:1 to canonical bookMapping.ts names', () => {
      const cases: Array<[string, string]> = [
        ['1 Kings', '1 Samuel'],
        ['2 Kings', '2 Samuel'],
        ['3 Kings', '1 Kings'],
        ['4 Kings', '2 Kings'],
        ['1 Esdras', 'Ezra'],
        ['2 Esdras', 'Nehemiah'],
        ['1 Paralipomenon', '1 Chronicles'],
        ['2 Paralipomenon', '2 Chronicles'],
        ['Canticle of Canticles', 'Song of Solomon'],
        ['Ecclesiasticus', 'Sirach'],
        ['Tobias', 'Tobit'],
        ['1 Machabees', '1 Maccabees'],
        ['2 Machabees', '2 Maccabees'],
        ['Apocalypse', 'Revelation'],
        ['Isaias', 'Isaiah'],
        ['Jeremias', 'Jeremiah'],
        ['Ezechiel', 'Ezekiel'],
        ['Osee', 'Hosea'],
        ['Micheas', 'Micah'],
        ['Habacuc', 'Habakkuk'],
        ['Sophonias', 'Zephaniah'],
        ['Aggeus', 'Haggai'],
        ['Zacharias', 'Zechariah'],
        ['Malachias', 'Malachi'],
        ['Jonas', 'Jonah'],
        ['Abdias', 'Obadiah'],
        ['Josue', 'Joshua'],
      ];

      for (const [alias, expected] of cases) {
        const canonical = normalizeDouayBookName(alias);
        expect(canonical).toBe(expected);
        expect(isCanonicalBook(canonical)).toBe(true);
      }

      // Greek-canonical bounds for Esther (1-10) and Daniel (1-14)
      expect(validateNormalizedBookChapter('Esther', 10)).toBe(true);
      expect(validateNormalizedBookChapter('Esther', 11)).toBe(false);
      expect(validateNormalizedBookChapter('Daniel', 14)).toBe(true);
      expect(validateNormalizedBookChapter('Daniel', 15)).toBe(false);
    });
  });

  describe('communityBundleValidator', () => {
    it('validates the shipped community-template.example.json cleanly', () => {
      const templatePath = path.resolve(
        __dirname,
        '../../../data/companion-seeds/community-template.example.json'
      );
      const bundle = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
      const res = validateCommunityBundle(bundle);
      expect(res.valid).toBe(true);
      expect(res.errors).toEqual([]);
    });

    it('rejects quoteExcerpt > 300 chars, non-Reddit externalUrl, missing attribution, or public-domain visibility', () => {
      const validCard = {
        lens: 'community',
        visibility: 'private-owner',
        title: 'Psalm 23 Note',
        summary: 'Readers discuss shepherd imagery.',
        body: '### Summary\nEditorial notes.',
        quoteExcerpt: 'A'.repeat(MAX_COMMUNITY_QUOTE_EXCERPT_LENGTH),
        externalUrl: 'https://www.reddit.com/r/Bible/comments/abc123/psalm_23_thread/',
        source: {
          sourceId: 'reddit-rbible-abc123',
          title: 'Thread Title',
          subreddit: 'r/Bible',
          authorHandle: 'u/reader_one',
          retrievedAt: '2026-11-20T00:00:00.000Z',
        },
      };

      expect(validateCommunityEntry(validCard)).toEqual([]);

      // Quote excerpt 301 chars -> rejected
      const longQuoteIssues = validateCommunityEntry({
        ...validCard,
        quoteExcerpt: 'A'.repeat(301),
      });
      expect(longQuoteIssues.some((i) => i.field === 'quoteExcerpt')).toBe(true);

      // Non-Reddit URL -> rejected
      const badUrlIssues = validateCommunityEntry({
        ...validCard,
        externalUrl: 'https://example.com/not-reddit',
      });
      expect(badUrlIssues.some((i) => i.field === 'externalUrl')).toBe(true);

      // Public-domain visibility -> rejected
      const pubIssues = validateCommunityEntry({
        ...validCard,
        visibility: 'public-domain',
      });
      expect(pubIssues.some((i) => i.field === 'visibility')).toBe(true);

      // Missing authorHandle / subreddit / retrievedAt -> rejected
      const missingSourceIssues = validateCommunityEntry({
        ...validCard,
        source: { sourceId: 'x', title: 'T' },
      });
      expect(missingSourceIssues.map((i) => i.field)).toEqual(
        expect.arrayContaining(['source.subreddit', 'source.authorHandle', 'source.retrievedAt'])
      );
    });
  });
});
