import React from 'react';
import { render, screen, fireEvent, waitFor } from '../../test-utils';
import { MemoryStudio } from './MemoryStudio';
import { MemoryService, PlanService, ProgressService, AuthService, VerseService } from '../../services/api';
import { MemoryItem } from '../../types';

jest.mock('../../services/api', () => ({
  MemoryService: {
    getDeck: jest.fn(),
    saveVerse: jest.fn(),
    addPack: jest.fn(),
    recordPractice: jest.fn(),
    updateStage: jest.fn(),
    removeVerse: jest.fn(),
  },
  PlanService: {
    getPlans: jest.fn(),
    getPlanDetail: jest.fn(),
    getCustomPlans: jest.fn(),
    createCustomPlan: jest.fn(),
    updateCustomPlan: jest.fn(),
    deleteCustomPlan: jest.fn(),
    addCustomPlanToMemory: jest.fn(),
  },
  VerseService: {
    getBookChapters: jest.fn(),
  },
  ProgressService: {
    submitResult: jest.fn(),
  },
  AuthService: {
    getCurrentUser: jest.fn(),
    getCachedAuthMode: jest.fn(),
    getAuthSession: jest.fn(),
  },
}));

const sampleMemoryItem: MemoryItem = {
  _id: 'mem-1',
  user: 'u1',
  verseOrder: 13940,
  book: 'Psalms',
  chapter: 23,
  verseNum: 1,
  stage: 1,
  stageCompletions: 0,
  verse: {
    _id: 'v-23-1',
    verseOrder: 13940,
    book: 'Psalms',
    chapter: 23,
    verse: 1,
    text: 'The LORD is my shepherd.',
    characters: 24,
    words: 5,
  },
};

describe('MemoryStudio (Epics 5 & 7)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AuthService.getCurrentUser as jest.Mock).mockReturnValue({ _id: 'u1', username: 'owner' });
    (AuthService.getCachedAuthMode as jest.Mock).mockReturnValue('local');
    (AuthService.getAuthSession as jest.Mock).mockResolvedValue({
      mode: 'local',
      user: { _id: 'u1', username: 'owner' },
    });
    (MemoryService.getDeck as jest.Mock).mockResolvedValue([sampleMemoryItem]);
    (PlanService.getPlans as jest.Mock).mockResolvedValue([]);
    (PlanService.getCustomPlans as jest.Mock).mockResolvedValue([]);
    (VerseService.getBookChapters as jest.Mock).mockResolvedValue([
      { chapter: 23, verseCount: 6 },
    ]);
    (ProgressService.submitResult as jest.Mock).mockResolvedValue({});
  });

  it('renders saved Memory Deck verses, all 5 progressive stages, and the 4 curated study plans', async () => {
    render(<MemoryStudio />);

    expect(await screen.findByTestId('memory-verse-display', {}, { timeout: 3000 })).toHaveTextContent(
      'The LORD is my shepherd.'
    );
    expect(screen.getByTestId('memory-deck-count')).toHaveTextContent('1 Verse in Deck');

    // All 4 curated packs are rendered
    expect(screen.getByTestId('curated-plan-psalms-mantras')).toBeInTheDocument();
    expect(screen.getByTestId('curated-plan-anchor-verses')).toBeInTheDocument();
    expect(screen.getByTestId('curated-plan-proverbs-wisdom')).toBeInTheDocument();
    expect(screen.getByTestId('curated-plan-sermon-on-the-mount')).toBeInTheDocument();

    // Practice links point to /typing?plan=<id>
    expect(screen.getByTestId('practice-plan-psalms-mantras')).toHaveAttribute(
      'href',
      '/typing?plan=psalms-mantras'
    );
  });

  it('switches progressive recall stages and masks untyped words accordingly', async () => {
    (MemoryService.updateStage as jest.Mock).mockResolvedValue({
      ...sampleMemoryItem,
      stage: 2,
    });

    render(<MemoryStudio />);
    const verseDisplay = await screen.findByTestId('memory-verse-display');
    expect(verseDisplay).toHaveTextContent('The LORD is my shepherd.');

    fireEvent.click(screen.getByTestId('stage-tab-2'));

    await waitFor(() => {
      expect(MemoryService.updateStage).toHaveBeenCalledWith('mem-1', 2);
      expect(screen.getByTestId('memory-verse-display')).toHaveTextContent(
        'The ____ is __ shepherd.'
      );
    });
  });

  it('auto-promotes stage when a verse is typed with >=95% accuracy', async () => {
    (MemoryService.recordPractice as jest.Mock).mockResolvedValue({
      ...sampleMemoryItem,
      stage: 2,
      stageCompletions: 1,
    });

    render(<MemoryStudio />);
    const input = await screen.findByTestId('memory-typing-input');

    fireEvent.change(input, { target: { value: 'The LORD is my shepherd.' } });

    await waitFor(() => {
      expect(MemoryService.recordPractice).toHaveBeenCalledWith(
        'mem-1',
        expect.objectContaining({
          accuracy: 100,
          stage: 1,
          advance: true,
        })
      );
      expect(screen.getByTestId('memory-practice-feedback')).toHaveTextContent(
        'Promoted to Stage 2!'
      );
    });
  });

  it('adds a curated pack to the Memory Deck and removes an item', async () => {
    (MemoryService.addPack as jest.Mock).mockResolvedValue({
      packId: 'psalms-mantras',
      resolvedCount: 1,
      data: [sampleMemoryItem],
    });
    (MemoryService.removeVerse as jest.Mock).mockResolvedValue({ _id: 'mem-1' });

    render(<MemoryStudio />);
    await screen.findByTestId('memory-verse-display');

    fireEvent.click(screen.getByTestId('add-pack-psalms-mantras'));

    await waitFor(() => {
      expect(MemoryService.addPack).toHaveBeenCalledWith('psalms-mantras');
      expect(screen.getByTestId('pack-status-message')).toHaveTextContent(
        'Added "Psalms for Daily Mantras & Focus" to your Memory Deck'
      );
    });

    fireEvent.click(
      screen.getByRole('button', { name: /Remove Psalms 23:1 from Memory Deck/i })
    );

    await waitFor(() => {
      expect(MemoryService.removeVerse).toHaveBeenCalledWith('mem-1');
      expect(screen.getByTestId('memory-empty-state')).toBeInTheDocument();
    });
  });

  it('filters expanded 10 curated plans by category and creates & deletes a custom playlist', async () => {
    const createdPlan = {
      _id: 'custom-1',
      title: 'Evening Psalms',
      description: 'Calm night verses',
      totalVerses: 1,
      completedVerses: 0,
      inMemoryDeckCount: 1,
      verseRefs: [{ book: 'Psalms', chapter: 23, verse: 1 }],
    };
    (PlanService.createCustomPlan as jest.Mock).mockResolvedValue(createdPlan);
    (PlanService.deleteCustomPlan as jest.Mock).mockResolvedValue({ deletedPlanId: 'custom-1' });

    render(<MemoryStudio />);
    await screen.findByTestId('memory-verse-display');

    // Expanded plans present
    expect(screen.getByTestId('curated-plan-psalm-23-complete')).toBeInTheDocument();
    expect(screen.getByTestId('curated-plan-gospel-of-john')).toBeInTheDocument();
    expect(screen.getByTestId('curated-plan-romans-8-assurance')).toBeInTheDocument();

    // Filter to Gospels only
    fireEvent.click(screen.getByTestId('filter-category-gospels'));
    expect(screen.getByTestId('curated-plan-gospel-of-john')).toBeInTheDocument();
    expect(screen.queryByTestId('curated-plan-psalm-23-complete')).not.toBeInTheDocument();

    // Reset filter to All
    fireEvent.click(screen.getByTestId('filter-category-all'));
    expect(screen.getByTestId('curated-plan-psalm-23-complete')).toBeInTheDocument();

    // Create custom playlist
    fireEvent.click(screen.getByTestId('new-playlist-button'));
    fireEvent.change(screen.getByLabelText('Playlist Title'), {
      target: { value: 'Evening Psalms' },
    });
    fireEvent.change(screen.getByLabelText('Description (optional)'), {
      target: { value: 'Calm night verses' },
    });
    fireEvent.click(screen.getByTestId('add-verse-to-playlist-btn'));
    fireEvent.click(screen.getByTestId('save-playlist-submit'));

    expect(await screen.findByTestId('custom-plan-custom-1')).toBeInTheDocument();
    expect(screen.getByTestId('practice-custom-plan-custom-1')).toHaveAttribute(
      'href',
      '/typing?customPlan=custom-1'
    );

    // Delete custom playlist via confirmation dialog
    fireEvent.click(screen.getByTestId('delete-custom-plan-custom-1'));
    fireEvent.click(screen.getByTestId('confirm-delete-playlist-btn'));

    await waitFor(() => {
      expect(PlanService.deleteCustomPlan).toHaveBeenCalledWith('custom-1');
      expect(screen.queryByTestId('custom-plan-custom-1')).not.toBeInTheDocument();
    });
  });
});
