import React, { useState } from 'react';
import { render, screen, fireEvent, waitFor, within } from '../../test-utils';
import { CompanionDrawer } from './CompanionDrawer';
import { isSafeHttpsUrl } from './CompanionMarkdown';
import { CompanionService } from '../../services/api';
import {
  getMockBookGuide,
  getMockChapterCompanion,
} from '../../data/mockCompanion';
import {
  BookGuideResponse,
  ChapterCompanionResponse,
  CompanionPurpose,
} from '../../types';

// Mock ONLY services/api.ts (AD-6)
jest.mock('../../services/api', () => ({
  CompanionService: {
    getChapterCompanion: jest.fn(),
    getBookGuide: jest.fn(),
    searchCompanion: jest.fn(),
  },
}));

const HEBREW_OCTAVES = [
  'ALEPH',
  'BETH',
  'GIMEL',
  'DALETH',
  'HE',
  'VAU',
  'ZAIN',
  'CHETH',
  'TETH',
  'JOD',
  'CAPH',
  'LAMED',
  'MEM',
  'NUN',
  'SAMECH',
  'AIN',
  'PE',
  'TZADDI',
  'KOPH',
  'RESH',
  'SCHIN',
  'TAU',
] as const;

function buildBloomedPsalm23Fixture(): ChapterCompanionResponse {
  return {
    workId: 'web-bible',
    book: 'Psalms',
    chapter: 23,
    unlocked: true,
    progress: {
      completedVerses: 6,
      totalVerses: 6,
      state: 'bloomed',
      bestWPM: 74,
      bestAccuracy: 99,
      unlockedAt: '2026-11-19T12:00:00.000Z',
    },
    lensCounts: {
      'hoodoo-folk': 1,
      'historical-classic': 1,
      community: 1,
    },
    lenses: {
      'hoodoo-folk': [
        {
          id: 'ps23-folk',
          upsertKey: 'web-bible:Psalms:23:chapter-companion:hoodoo-folk:pd-test:0',
          workId: 'web-bible',
          sectionKey: 'PSA',
          book: 'Psalms',
          chapter: 23,
          entryType: 'chapter-companion',
          lens: 'hoodoo-folk',
          visibility: 'public-domain',
          sortOrder: 0,
          title: 'Guidance & Quiet Shelter (Test Entry)',
          summary: 'Synthetic folkloric test summary for Psalm 23.',
          body: '### Devotional Practice\nRead quietly at dawn with **steady breath** and *calm attention*.\n\n- Light a white candle\n- Reflect on verses 1 through 4',
          purposes: [
            {
              title: 'FOR PEACEFUL CROSSING',
              body: 'Speak verses 1–4 before setting out on a new path.',
              page: 18,
              citedVerses: ['1-4', '6'],
              ritualTags: ['White Candle', 'Hyssop', 'Morning Practice'],
            },
          ],
          indexPurposes: [
            { purpose: 'Peaceful home and safe travel', source: 'powers-index', verseRange: '1-4' },
          ],
          ritualTags: ['White Candle', 'Hyssop', 'Morning Practice'],
          citedVerses: ['1-4', '6'],
          dailySchedule: [],
          source: {
            sourceId: 'pd-test',
            title: 'Public-Domain Folkloric Anthology',
            author: 'Test Compiler',
            year: 1923,
            pages: [18, 19],
            numberingSystem: 'masoretic-web',
            license: 'public-domain',
          },
        },
      ],
      'historical-classic': [
        {
          id: 'ps23-classic',
          upsertKey: 'web-bible:Psalms:23:chapter-companion:historical-classic:haydock-1859:0',
          workId: 'web-bible',
          sectionKey: 'PSA',
          book: 'Psalms',
          chapter: 23,
          entryType: 'chapter-companion',
          lens: 'historical-classic',
          visibility: 'public-domain',
          sortOrder: 0,
          title: 'Pastoral Care & Banquet Hospitality',
          summary: 'Classical commentary aligned from the Latin Vulgate numbering.',
          body: '### Historical Context\nThe shepherd metaphor bridges wilderness guidance and temple fellowship.',
          purposes: [],
          indexPurposes: [],
          ritualTags: ['Pastoral Lyric'],
          citedVerses: ['1-6'],
          dailySchedule: [],
          source: {
            sourceId: 'haydock-1859',
            title: 'Catholic Bible Commentary',
            author: 'George Leo Haydock',
            year: 1859,
            edition: '1859 Dunigan Ed.',
            numberingSystem: 'vulgate-dr',
            originalRef: 'Douay-Rheims Psalm 22',
            license: 'public-domain',
          },
        },
      ],
      community: [
        {
          id: 'ps23-community',
          upsertKey: 'web-bible:Psalms:23:chapter-companion:community:rbible-test:0',
          workId: 'web-bible',
          sectionKey: 'PSA',
          book: 'Psalms',
          chapter: 23,
          entryType: 'chapter-companion',
          lens: 'community',
          visibility: 'public-domain',
          sortOrder: 0,
          title: 'Why tsalmaveth reads as deepest shadow',
          summary: 'Readers compare Hebrew poetic compounds in verse 4.',
          body: '### Reader Takeaway\nNotice the grammatical shift from "He" to "You" at the center of the psalm.',
          quoteExcerpt: 'The shift to second-person address happens right in the valley.',
          purposes: [],
          indexPurposes: [],
          ritualTags: ['Hebrew Poetry'],
          citedVerses: ['4'],
          dailySchedule: [],
          source: {
            sourceId: 'rbible-test',
            title: 'Study Thread on Psalm 23',
            authorHandle: 'u/scholar_pilgrim',
            subreddit: 'r/Bible',
            license: 'fair-use-excerpt',
            retrievedAt: '2026-11-20T00:00:00.000Z',
          },
          externalUrl: 'https://www.reddit.com/r/Bible/comments/example/psalm_23/',
        },
      ],
    },
  };
}

describe('CompanionDrawer & Multi-Lens Reading Room', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (CompanionService.getChapterCompanion as jest.Mock).mockResolvedValue(
      buildBloomedPsalm23Fixture()
    );
    (CompanionService.getBookGuide as jest.Mock).mockResolvedValue(
      getMockBookGuide('Psalms')
    );
  });

  it('renders ARIA dialog, multi-lens tabs, arrow-key tab navigation, purposes, Douay-Rheims badge, and community card', async () => {
    const onClose = jest.fn();
    render(
      <CompanionDrawer
        isOpen={true}
        book="Psalms"
        chapter={23}
        workId="web-bible"
        onClose={onClose}
      />
    );

    const dialog = await screen.findByRole('dialog', { name: /Psalm 23/i });
    expect(dialog.tagName).toBe('DIALOG');
    expect(dialog).toHaveAttribute('open');
    const bloomStats = await screen.findByTestId('companion-bloom-stats');
    expect(bloomStats).toHaveTextContent(
      'Bloomed Nov 19 · 6/6 verses · Best 74 WPM · 99% Acc'
    );

    const tablist = await screen.findByRole('tablist', {
      name: /Companion study lenses/i,
    });
    const tabs = within(tablist).getAllByRole('tab');
    expect(tabs).toHaveLength(3);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[0]).toHaveTextContent('Hoodoo & Folk');
    expect(tabs[1]).toHaveAttribute('aria-selected', 'false');
    expect(tabs[2]).toHaveAttribute('aria-selected', 'false');

    // Hoodoo & Folk panel content: purposes[], ritualTags[], indexPurposes[]
    expect(screen.getByText('FOR PEACEFUL CROSSING')).toBeInTheDocument();
    expect(screen.getByText('White Candle')).toBeInTheDocument();
    expect(screen.getByTestId('companion-index-purposes')).toHaveTextContent(
      'Peaceful home and safe travel'
    );

    // ArrowRight moves selection & focus to Historical & Classic
    fireEvent.keyDown(tabs[0], { key: 'ArrowRight' });
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    expect(document.activeElement).toBe(tabs[1]);
    expect(screen.getByTestId('vulgate-provenance-badge')).toHaveTextContent(
      'Douay-Rheims Psalm 22'
    );

    // ArrowRight again moves to Community r/Bible
    fireEvent.keyDown(tabs[1], { key: 'ArrowRight' });
    expect(tabs[2]).toHaveAttribute('aria-selected', 'true');
    expect(document.activeElement).toBe(tabs[2]);
    expect(screen.getByTestId('community-quote-card')).toHaveTextContent(
      'The shift to second-person address happens right in the valley.'
    );
    expect(screen.getByTestId('community-quote-card')).toHaveTextContent('u/scholar_pilgrim');
    expect(screen.getByTestId('community-quote-card')).toHaveTextContent('r/Bible');

    const extLink = screen.getByTestId('companion-external-link');
    expect(extLink).toHaveAttribute(
      'href',
      'https://www.reddit.com/r/Bible/comments/example/psalm_23/'
    );
    expect(extLink).toHaveAttribute('target', '_blank');
    expect(extLink).toHaveAttribute('rel', 'noopener noreferrer');

    // ArrowLeft wraps back to Historical & Classic; Home jumps to Hoodoo & Folk
    fireEvent.keyDown(tabs[2], { key: 'ArrowLeft' });
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(tabs[1], { key: 'Home' });
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('displays warm Editorial Atlas empty states when a lens has zero curated entries', async () => {
    const fixture = buildBloomedPsalm23Fixture();
    fixture.lensCounts.community = 0;
    fixture.lenses.community = [];
    (CompanionService.getChapterCompanion as jest.Mock).mockResolvedValueOnce(fixture);

    render(
      <CompanionDrawer isOpen={true} book="Psalms" chapter={23} onClose={jest.fn()} />
    );

    const communityTab = await screen.findByTestId('companion-tab-community');
    fireEvent.click(communityTab);

    expect(screen.getByTestId('companion-empty-community')).toHaveTextContent(
      'No community highlights archived for Psalm 23 yet.'
    );
  });

  it('traps Tab focus inside the drawer, closes on Escape or backdrop click, and restores focus to the trigger', async () => {
    const Harness: React.FC = () => {
      const [open, setOpen] = useState(false);
      return (
        <div>
          <button
            type="button"
            data-testid="opener-btn"
            onClick={() => setOpen(true)}
          >
            Open Companion
          </button>
          <CompanionDrawer
            isOpen={open}
            book="Psalms"
            chapter={23}
            onClose={() => setOpen(false)}
          />
        </div>
      );
    };

    render(<Harness />);

    const opener = screen.getByTestId('opener-btn');
    opener.focus();
    expect(document.activeElement).toBe(opener);

    fireEvent.click(opener);

    const closeBtn = await screen.findByTestId('companion-close-button');
    expect(document.activeElement).toBe(closeBtn);

    // Wait for content & footer buttons so we can verify Tab focus wrap
    const nextBtn = await screen.findByTestId('companion-type-next-chapter');
    const dialog = screen.getByTestId('companion-drawer');

    // Shift+Tab from first focusable wraps to last focusable
    closeBtn.focus();
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(nextBtn);

    // Tab from last focusable wraps back to first focusable
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: false });
    expect(document.activeElement).toBe(closeBtn);

    // Escape closes the drawer and restores focus to opener
    fireEvent.keyDown(dialog, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByTestId('companion-drawer')).not.toBeInTheDocument();
    });
    expect(document.activeElement).toBe(opener);

    // Re-open and close via backdrop click on the <dialog> element
    fireEvent.click(opener);
    const reopenedDialog = await screen.findByTestId('companion-drawer');
    fireEvent.click(reopenedDialog);
    await waitFor(() => {
      expect(screen.queryByTestId('companion-drawer')).not.toBeInTheDocument();
    });
    expect(document.activeElement).toBe(opener);
  });

  it('renders locked chapter teaser with progress, lens counts, Continue Typing CTA, and zero prose leaked', async () => {
    const lockedResponse: ChapterCompanionResponse = {
      workId: 'web-bible',
      book: 'Genesis',
      chapter: 4,
      unlocked: false,
      progress: {
        completedVerses: 14,
        totalVerses: 26,
        state: 'in_progress',
      },
      lensCounts: {
        'hoodoo-folk': 1,
        'historical-classic': 2,
        community: 0,
      },
      lenses: {
        'hoodoo-folk': [],
        'historical-classic': [],
        community: [],
      },
    };
    (CompanionService.getChapterCompanion as jest.Mock).mockResolvedValueOnce(lockedResponse);
    const onTypeChapter = jest.fn();
    const onClose = jest.fn();

    render(
      <CompanionDrawer
        isOpen={true}
        book="Genesis"
        chapter={4}
        onClose={onClose}
        onTypeChapter={onTypeChapter}
      />
    );

    const teaser = await screen.findByTestId('companion-locked-teaser');
    expect(teaser).toHaveTextContent('14 / 26 verses');
    expect(screen.getByTestId('companion-locked-lens-counts')).toHaveTextContent(
      'Hoodoo & Folk (1)'
    );
    expect(screen.getByTestId('companion-locked-lens-counts')).toHaveTextContent(
      'Historical & Classic (2)'
    );
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();

    const continueBtn = screen.getByTestId('companion-continue-typing-btn');
    expect(continueBtn).toHaveTextContent('Continue Typing Chapter 4 →');
    fireEvent.click(continueBtn);
    expect(onTypeChapter).toHaveBeenCalledWith('Genesis', 4);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders all 22 Hebrew octaves and quick-jump strip for Psalm 119', async () => {
    const ps119Purposes: CompanionPurpose[] = HEBREW_OCTAVES.map((octave, idx) => {
      const start = idx * 8 + 1;
      const end = start + 7;
      return {
        title: `Meditation for ${octave}`,
        body: `Practice verses ${start} through ${end} with steady focus.`,
        citedVerses: [`${start}-${end}`],
        ritualTags: ['Study', 'Steadfastness'],
        octave,
        verseRange: `${start}-${end}`,
      };
    });

    const ps119Fixture = buildBloomedPsalm23Fixture();
    if (ps119Fixture.unlocked) {
      ps119Fixture.chapter = 119;
      ps119Fixture.progress.completedVerses = 176;
      ps119Fixture.progress.totalVerses = 176;
      ps119Fixture.lenses['hoodoo-folk'][0].chapter = 119;
      ps119Fixture.lenses['hoodoo-folk'][0].purposes = ps119Purposes;
    }
    (CompanionService.getChapterCompanion as jest.Mock).mockResolvedValueOnce(ps119Fixture);

    render(
      <CompanionDrawer isOpen={true} book="Psalms" chapter={119} onClose={jest.fn()} />
    );

    const strip = await screen.findByTestId('psalm-119-octave-strip');
    const jumpButtons = within(strip).getAllByRole('button');
    expect(jumpButtons).toHaveLength(22);
    expect(jumpButtons[0]).toHaveTextContent('ALEPH');
    expect(jumpButtons[21]).toHaveTextContent('TAU');

    expect(screen.getByText('Meditation for ALEPH')).toBeInTheDocument();
    expect(screen.getByText('Meditation for TAU')).toBeInTheDocument();
    expect(screen.getByText(/Verses 1-8/)).toBeInTheDocument();
    expect(screen.getByText(/Verses 169-176/)).toBeInTheDocument();

    fireEvent.click(jumpButtons[21]);
    expect(jumpButtons[21]).toHaveClass('is-active');
  });

  it('renders Book Guide mode with introductions, 14-slot Daily Prayer Schedule, and bonus meditations', async () => {
    const guideFixture: BookGuideResponse = getMockBookGuide('Psalms');
    (CompanionService.getBookGuide as jest.Mock).mockResolvedValueOnce(guideFixture);
    const onTypeChapter = jest.fn();

    render(
      <CompanionDrawer
        isOpen={true}
        book="Psalms"
        mode="guide"
        onClose={jest.fn()}
        onTypeChapter={onTypeChapter}
      />
    );

    const guidePanel = await screen.findByTestId('book-guide-panel');
    expect(guidePanel).toHaveTextContent('2 / 150 chapters bloomed');
    expect(
      screen.getByText(/Introduction to the Five Books of the Psalter/i)
    ).toBeInTheDocument();

    const scheduleSection = screen.getByTestId('daily-prayer-schedule');
    expect(scheduleSection).toHaveTextContent('Daily Prayer Schedule (14 Slots)');
    const rows = within(scheduleSection).getAllByRole('row');
    // 1 header row + 14 morning/evening slots = 15 rows
    expect(rows).toHaveLength(15);
    expect(scheduleSection).toHaveTextContent('Sunday morning');
    expect(scheduleSection).toHaveTextContent('Saturday evening');

    expect(screen.getByTestId('book-guide-meditations')).toHaveTextContent(
      'Evening Stillness & Breath Cadence'
    );

    const typePsalm23Btn = within(scheduleSection).getByRole('button', {
      name: 'Type Psalm 23',
    });
    fireEvent.click(typePsalm23Btn);
    expect(onTypeChapter).toHaveBeenCalledWith('Psalms', 23);
  });

  it('renders <script> tags as literal escaped text and blocks javascript: / http: externalUrl values (AD-16)', async () => {
    expect(isSafeHttpsUrl('https://www.reddit.com/r/Bible/')).toBe(true);
    expect(isSafeHttpsUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeHttpsUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    expect(isSafeHttpsUrl('http://example.com/insecure')).toBe(false);

    const xssPayload = '<script>window.__xssExecuted = true; alert("xss")</script>';
    const unsafeFixture = buildBloomedPsalm23Fixture();
    if (unsafeFixture.unlocked) {
      unsafeFixture.lenses['hoodoo-folk'][0].body = `### Safe Heading\n${xssPayload}`;
      unsafeFixture.lenses['hoodoo-folk'][0].purposes[0].body = `Purpose note ${xssPayload}`;
      unsafeFixture.lenses['hoodoo-folk'][0].externalUrl = 'javascript:alert("pwned")';
    }
    (CompanionService.getChapterCompanion as jest.Mock).mockResolvedValueOnce(unsafeFixture);

    const { container } = render(
      <CompanionDrawer isOpen={true} book="Psalms" chapter={23} onClose={jest.fn()} />
    );

    await screen.findByText('Safe Heading');
    const activePanel = screen.getByRole('tabpanel');
    // Literal text is visible to the user, NOT parsed as HTML
    expect(within(activePanel).getByText(xssPayload)).toBeInTheDocument();
    expect(within(activePanel).getByText(`Purpose note ${xssPayload}`)).toBeInTheDocument();
    expect(container.querySelectorAll('script')).toHaveLength(0);
    expect((window as any).__xssExecuted).toBeUndefined();
    // Unsafe javascript: URL is completely omitted from the active panel
    expect(within(activePanel).queryByTestId('companion-external-link')).not.toBeInTheDocument();
  });

  it('keeps client mockCompanion fixtures 100% public-domain / synthetic with zero copyrighted vault names', () => {
    const serialized = JSON.stringify({
      ps23: getMockChapterCompanion('Psalms', 23),
      gen1: getMockChapterCompanion('Genesis', 1),
      guide: getMockBookGuide('Psalms'),
    });
    expect(serialized).not.toMatch(/Anna Riva/i);
    expect(serialized).not.toMatch(/Power of the Psalms/i);
  });
});
