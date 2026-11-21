import axios from 'axios';
import {
  AchievementsData,
  ActivityPoint,
  BookChapterInfo,
  BookChapterProgress,
  BookGuideResponse,
  ChapterCompanionResponse,
  ChapterJustUnlocked,
  CompanionSearchParams,
  CompanionSearchResponse,
  CoverageData,
  CuratedPlanDetail,
  CuratedPlanSummary,
  CustomPlanDetail,
  CustomPlanSummary,
  MemoryItem,
  MemoryStage,
  NextVerseResult,
  PrimaryCompanionLens,
  Progress,
  Result,
  ResultHistoryItem,
  TrailBookResponse,
  TrailOverviewResponse,
  TrendPoint,
  TrendRange,
  User,
  Verse,
  VerseContext,
  WeaknessReport,
} from '../types';
import { CANONICAL_BOOKS } from '../data/books';
import { CURATED_PLANS, CuratedVerseRef, getCuratedPlanById } from '../data/curatedCatalog';
import { mockVerses } from '../data/mockVerses';
import { mockProgress, mockProgressSummary } from '../data/mockProgress';
import {
  getMockBookGuide,
  getMockChapterCompanion,
  getMockCompanionSearch,
  getMockTrailBook,
  getMockTrailOverview,
} from '../data/mockCompanion';
import { createMockAchievementsData } from '../data/trailBadges';

export interface NextVerseChapterResult extends NextVerseResult {
  chapterComplete?: boolean;
}

export interface SubmitResultResponse {
  result: Result;
  progress: Progress;
  chapterJustUnlocked?: ChapterJustUnlocked | null;
}

// Configurable API settings 
const API_URL =
  process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:3001/api');
const USE_MOCK_DATA = process.env.REACT_APP_USE_MOCK_DATA === 'true' || false;

export type AuthMode = 'local' | 'entra';

export interface AuthSession {
  mode: AuthMode;
  user: User | null;
}

let cachedAuthSession: AuthSession | null = null;
let pendingAuthSession: Promise<AuthSession> | null = null;

const notifyAuthChange = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('ttb-auth-change'));
  }
};

export const resetAuthSessionCache = () => {
  cachedAuthSession = null;
  pendingAuthSession = null;
};

// Create axios instance with auth header
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Adding a timeout to avoid long waits if server is down
  timeout: 10000,
});

// Error handling helper
const handleApiError = (error: any) => {
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    console.error('API Error Response:', error.response.data);
    console.error('Status:', error.response.status);
    throw error;
  } else if (error.request) {
    // The request was made but no response was received
    console.error('No response received:', error.request);
    throw new Error('Could not connect to server. Please check your connection.');
  } else {
    // Something happened in setting up the request that triggered an Error
    console.error('Request Error:', error.message);
    throw new Error('An error occurred while making the request.');
  }
};

export function attachAuthHeader<T extends { headers?: Record<string, any> }>(
  requestConfig: T,
  mode: AuthMode,
  token: string | null
): T {
  if (mode !== 'entra' && token && requestConfig.headers) {
    requestConfig.headers.Authorization = `Bearer ${token}`;
  }
  return requestConfig;
}

// Interceptor to add auth token (local mode only)
api.interceptors.request.use(
  (config) =>
    attachAuthHeader(
      config,
      cachedAuthSession?.mode ?? 'local',
      localStorage.getItem('userToken')
    ),
  (error) => Promise.reject(error)
);

// Verse Service
export const VerseService = {
  // Get all verses (paginated)
  getAllVerses: async (page = 1, limit = 20): Promise<{ data: Verse[], total: number, pages: number }> => {
    try {
      if (USE_MOCK_DATA) {
        return {
          data: mockVerses,
          total: mockVerses.length,
          pages: 1
        };
      }
      
      const response = await api.get(`/verses?page=${page}&limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching verses:', error);
      
      // Fallback to mock data if API fails
      return {
        data: mockVerses,
        total: mockVerses.length,
        pages: 1
      };
    }
  },

  // Get a verse by ID
  getVerseById: async (id: string): Promise<Verse> => {
    try {
      if (USE_MOCK_DATA) {
        const verse = mockVerses.find(v => v._id === id);
        if (!verse) throw new Error('Verse not found');
        return verse;
      }
      
      const response = await api.get(`/verses/${id}`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching verse by ID:', error);
      
      // Fallback to mock data if API fails
      const verse = mockVerses.find(v => v._id === id);
      if (!verse) throw new Error('Verse not found');
      return verse;
    }
  },

  // Get a verse by order number
  getVerseByOrder: async (verseOrder: number): Promise<Verse> => {
    try {
      if (USE_MOCK_DATA) {
        const verse = mockVerses.find(v => v.verseOrder === verseOrder);
        if (!verse) throw new Error('Verse not found');
        return verse;
      }
      
      const response = await api.get(`/verses/order/${verseOrder}`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching verse by order:', error);
      
      // Fallback to mock data if API fails
      const verse = mockVerses.find(v => v.verseOrder === verseOrder);
      if (!verse) throw new Error('Verse not found');
      return verse;
    }
  },

  // Get a random verse
  getRandomVerse: async (): Promise<Verse> => {
    try {
      if (USE_MOCK_DATA) {
        // Get a random verse from the mock data
        const randomIndex = Math.floor(Math.random() * mockVerses.length);
        return mockVerses[randomIndex];
      }
      
      const response = await api.get('/verses/random');
      return response.data.data;
    } catch (error) {
      console.error('Error fetching random verse:', error);
      
      // Fallback to mock data if API fails
      const randomIndex = Math.floor(Math.random() * mockVerses.length);
      return mockVerses[randomIndex];
    }
  },

  // Get verses by book
  getVersesByBook: async (book: string, page = 1, limit = 20): Promise<{ data: Verse[], total: number, pages: number }> => {
    try {
      if (USE_MOCK_DATA) {
        const filteredVerses = mockVerses.filter(v => v.book.toLowerCase() === book.toLowerCase());
        return {
          data: filteredVerses,
          total: filteredVerses.length,
          pages: 1
        };
      }
      
      const response = await api.get(`/verses/book/${book}?page=${page}&limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching verses by book:', error);
      
      // Fallback to mock data if API fails
      const filteredVerses = mockVerses.filter(v => v.book.toLowerCase() === book.toLowerCase());
      return {
        data: filteredVerses,
        total: filteredVerses.length,
        pages: 1
      };
    }
  },

  // Get verses by book and chapter
  getVersesByBookAndChapter: async (book: string, chapter: number): Promise<Verse[]> => {
    try {
      if (USE_MOCK_DATA) {
        return mockVerses.filter(
          v => v.book.toLowerCase() === book.toLowerCase() && v.chapter === chapter
        );
      }
      
      const response = await api.get(`/verses/book/${book}/chapter/${chapter}`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching verses by book and chapter:', error);
      
      // Fallback to mock data if API fails
      return mockVerses.filter(
        v => v.book.toLowerCase() === book.toLowerCase() && v.chapter === chapter
      );
    }
  },

  // Get next untyped verse (overall, scoped to a book, or scoped to a book + chapter)
  getNextVerse: async (
    book?: string,
    afterVerseOrderOrOptions?: number | { afterVerseOrder?: number; chapter?: number },
    chapterArg?: number
  ): Promise<NextVerseChapterResult> => {
    const afterVerseOrder =
      typeof afterVerseOrderOrOptions === 'number'
        ? afterVerseOrderOrOptions
        : afterVerseOrderOrOptions?.afterVerseOrder;
    const chapter =
      chapterArg !== undefined
        ? chapterArg
        : typeof afterVerseOrderOrOptions === 'object' && afterVerseOrderOrOptions !== null
        ? afterVerseOrderOrOptions.chapter
        : undefined;

    try {
      if (USE_MOCK_DATA) {
        let candidates = book
          ? mockVerses.filter((v) => v.book.toLowerCase() === book.toLowerCase())
          : mockVerses;
        if (chapter !== undefined) {
          candidates = candidates.filter((v) => v.chapter === chapter);
        }
        const sorted = [...candidates].sort((a, b) => a.verseOrder - b.verseOrder);
        const nextAfter =
          afterVerseOrder !== undefined
            ? sorted.find((v) => v.verseOrder > afterVerseOrder) ?? sorted[0]
            : sorted[0];
        if (sorted.length === 0) {
          return { complete: true, verse: null };
        }
        return chapter !== undefined
          ? { complete: false, chapterComplete: false, verse: nextAfter }
          : { complete: false, verse: nextAfter };
      }

      const params: Record<string, string | number> = {};
      if (book) params.book = book;
      if (chapter !== undefined) params.chapter = chapter;
      if (afterVerseOrder !== undefined) params.afterVerseOrder = afterVerseOrder;
      const response = await api.get('/verses/next', {
        params: Object.keys(params).length > 0 ? params : undefined,
      });
      return response.data.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  // Get chapter list and verse counts for a book
  getBookChapters: async (book: string): Promise<BookChapterInfo[]> => {
    try {
      if (USE_MOCK_DATA) {
        const counts = new Map<number, number>();
        mockVerses
          .filter((v) => v.book.toLowerCase() === book.toLowerCase())
          .forEach((v) => counts.set(v.chapter, (counts.get(v.chapter) ?? 0) + 1));
        return Array.from(counts.entries())
          .sort((a, b) => a[0] - b[0])
          .map(([chapter, verseCount]) => ({ chapter, verseCount }));
      }
      const response = await api.get(`/verses/book/${encodeURIComponent(book)}/chapters`);
      return response.data.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  // Get immediate previous and next verses around a verseOrder for passage flow
  getVerseContext: async (verseOrder: number): Promise<VerseContext> => {
    try {
      if (USE_MOCK_DATA) {
        const prev = mockVerses.find((v) => v.verseOrder === verseOrder - 1) ?? null;
        const next = mockVerses.find((v) => v.verseOrder === verseOrder + 1) ?? null;
        return { prev, next };
      }
      const response = await api.get(`/verses/context/${verseOrder}`);
      return response.data.data;
    } catch (error) {
      return { prev: null, next: null };
    }
  },
};

const readStoredLocalUser = (): User | null => {
  const userDataString = localStorage.getItem('userData');
  if (userDataString) {
    try {
      return JSON.parse(userDataString);
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  }
  return null;
};

// Auth Service
export const AuthService = {
  // Fetch auth mode and (in entra mode) owner session from server
  getAuthSession: async (forceRefresh = false): Promise<AuthSession> => {
    if (!forceRefresh && cachedAuthSession) {
      return cachedAuthSession;
    }
    if (!forceRefresh && pendingAuthSession) {
      return pendingAuthSession;
    }

    const request = (async (): Promise<AuthSession> => {
      try {
        const response = await api.get('/auth/mode');
        const payload = response?.data?.data;
        if (payload?.mode === 'entra') {
          const session: AuthSession = {
            mode: 'entra',
            user: payload.user ?? null,
          };
          cachedAuthSession = session;
          return session;
        }
        const session: AuthSession = {
          mode: 'local',
          user: readStoredLocalUser(),
        };
        cachedAuthSession = session;
        return session;
      } catch (_error) {
        return {
          mode: 'local',
          user: readStoredLocalUser(),
        };
      } finally {
        pendingAuthSession = null;
      }
    })();

    pendingAuthSession = request;
    return request;
  },

  // Get auth mode ('local' | 'entra')
  getAuthMode: async (): Promise<AuthMode> => {
    const session = await AuthService.getAuthSession();
    return session.mode;
  },

  // Synchronously read cached auth mode (defaults to 'local')
  getCachedAuthMode: (): AuthMode => {
    return cachedAuthSession?.mode ?? 'local';
  },

  // Register a new user
  register: async (username: string, email: string, password: string): Promise<User> => {
    try {
      const response = await api.post('/users', { username, email, password });
      return response.data.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  // Login user
  login: async (email: string, password: string): Promise<User> => {
    try {
      console.log('Attempting login with:', { email, password: '***' });
      console.log('API URL:', API_URL);
      const response = await api.post('/users/login', { email, password });
      console.log('Login response:', response);
      const userData = response.data.data;
      
      // Save token to localStorage
      if (userData.token) {
        localStorage.setItem('userToken', userData.token);
        localStorage.setItem('userData', JSON.stringify(userData));
        if (cachedAuthSession?.mode === 'local') {
          cachedAuthSession = { mode: 'local', user: userData };
        }
        notifyAuthChange();
      }
      
      return userData;
    } catch (error) {
      console.error('Login API error:', error);
      handleApiError(error);
      throw error;
    }
  },

  // Logout user
  logout: () => {
    localStorage.removeItem('userToken');
    localStorage.removeItem('userData');
    if (cachedAuthSession?.mode === 'local') {
      cachedAuthSession = { mode: 'local', user: null };
    }
    notifyAuthChange();
  },

  // Get current user (owner session in entra mode, localStorage in local mode)
  getCurrentUser: (): User | null => {
    if (cachedAuthSession?.mode === 'entra') {
      return cachedAuthSession.user;
    }
    return readStoredLocalUser();
  },

  // Get user profile
  getUserProfile: async (): Promise<User> => {
    try {
      const response = await api.get('/users/profile');
      return response.data.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  // Update user profile
  updateUserProfile: async (data: Partial<User>): Promise<User> => {
    try {
      const response = await api.put('/users/profile', data);
      
      // Update stored user data with the new profile
      const currentUser = AuthService.getCurrentUser();
      if (currentUser) {
        const updatedUser = { ...currentUser, ...response.data.data };
        if (cachedAuthSession?.mode === 'entra') {
          cachedAuthSession = { mode: 'entra', user: updatedUser };
        } else {
          localStorage.setItem('userData', JSON.stringify(updatedUser));
          if (cachedAuthSession?.mode === 'local') {
            cachedAuthSession = { mode: 'local', user: updatedUser };
          }
        }
        notifyAuthChange();
      }
      
      return response.data.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },
};

// Progress Service
export const ProgressService = {
  // Get user progress
  getUserProgress: async (): Promise<Progress[]> => {
    try {
      if (USE_MOCK_DATA) {
        console.log('Using mock progress data');
        return mockProgress;
      }
      
      const response = await api.get('/progress');
      return response.data.data;
    } catch (error) {
      handleApiError(error);
      
      // Return mock data as fallback
      console.log('Using fallback mock progress data');
      return mockProgress;
    }
  },

  // Get progress for a specific verse
  getVerseProgress: async (verseId: string): Promise<Progress | null> => {
    try {
      if (USE_MOCK_DATA) {
        const progress = mockProgress.find(p => p.verse === verseId);
        return progress || null;
      }
      
      const response = await api.get(`/progress/verse/${verseId}`);
      return response.data.data;
    } catch (error) {
      handleApiError(error);
      return null;
    }
  },

  // Get progress summary
  getProgressSummary: async (): Promise<any> => {
    try {
      if (USE_MOCK_DATA) {
        console.log('Using mock progress summary');
        return mockProgressSummary;
      }
      
      const response = await api.get('/progress/summary');
      return response.data.data;
    } catch (error) {
      handleApiError(error);
      
      // Return mock summary data as fallback
      console.log('Using fallback mock progress summary');
      return mockProgressSummary;
    }
  },

  // Submit a typing test result
  submitResult: async (result: Omit<Result, '_id'>): Promise<SubmitResultResponse> => {
    try {
      const response = await api.post(`/progress/result/${result.verse}`, result);
      return response.data.data;
    } catch (error) {
      console.error('Failed to submit result:', error);
      
      // Create a mock result response
      const mockResult: Result = {
        _id: `mock-${Date.now()}`,
        ...result
      };
      
      const mockProgress: Progress = {
        _id: `mock-${Date.now()}`,
        user: result.user,
        verse: result.verse,
        verseOrder: result.verseOrder,
        completed: true,
        attempts: 1,
        bestWPM: result.wpm,
        bestAccuracy: result.accuracy,
        lastAttemptDate: new Date().toISOString()
      };
      
      return { result: mockResult, progress: mockProgress, chapterJustUnlocked: null };
    }
  },

  // Get individual typing test results history
  getUserResults: async (): Promise<ResultHistoryItem[]> => {
    try {
      if (USE_MOCK_DATA) {
        return [];
      }

      const response = await api.get('/progress/results');
      return response.data.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  // Modify an individual typing test result
  updateResult: async (
    resultId: string,
    updates: { wpm?: number; accuracy?: number; duration?: number; incorrectCharacters?: number }
  ): Promise<{ result: ResultHistoryItem; progress: Progress | null }> => {
    try {
      const response = await api.patch(`/progress/result/${resultId}`, updates);
      return response.data.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  // Delete an individual typing test result
  deleteResult: async (
    resultId: string
  ): Promise<{ deletedResultId: string; progress: Progress | null }> => {
    try {
      const response = await api.delete(`/progress/result/${resultId}`);
      return response.data.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  // Delete all results & progress for a verse
  deleteVerseProgress: async (
    verseId: string
  ): Promise<{ verseId: string; deletedResultsCount: number }> => {
    try {
      const response = await api.delete(`/progress/verse/${verseId}`);
      return response.data.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  // Get chapter & book completion counts and percentages for the active verse
  getBookChapterProgress: async (
    book: string,
    chapter: number
  ): Promise<BookChapterProgress> => {
    try {
      if (USE_MOCK_DATA) {
        const bookVerses = mockVerses.filter(
          (v) => v.book.toLowerCase() === book.toLowerCase()
        );
        const chapterVerses = bookVerses.filter((v) => v.chapter === chapter);
        const completedIds = new Set(
          mockProgress.filter((p) => p.completed).map((p) => String(p.verse))
        );
        const bookCompleted = bookVerses.filter((v) => completedIds.has(v._id)).length;
        const chapterCompleted = chapterVerses.filter((v) => completedIds.has(v._id)).length;
        return {
          book,
          chapter,
          chapterCompleted,
          chapterTotal: chapterVerses.length,
          chapterPercentage:
            chapterVerses.length > 0
              ? Math.round((chapterCompleted / chapterVerses.length) * 1000) / 10
              : 0,
          bookCompleted,
          bookTotal: bookVerses.length,
          bookPercentage:
            bookVerses.length > 0
              ? Math.round((bookCompleted / bookVerses.length) * 1000) / 10
              : 0,
        };
      }

      const response = await api.get('/progress/book-context', {
        params: { book, chapter },
      });
      return response.data.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },
};

function getBrowserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export const StatsService = {
  getTrend: async (range: TrendRange = '30', tz?: string): Promise<TrendPoint[]> => {
    try {
      if (USE_MOCK_DATA) {
        return [];
      }

      const response = await api.get('/stats/trend', {
        params: {
          range,
          tz: tz || getBrowserTimeZone(),
        },
      });
      return response.data.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  getActivity: async (year?: number, tz?: string): Promise<ActivityPoint[]> => {
    try {
      if (USE_MOCK_DATA) {
        return [];
      }

      const params: Record<string, string | number> = {
        tz: tz || getBrowserTimeZone(),
      };
      if (year !== undefined) {
        params.year = year;
      }

      const response = await api.get('/stats/activity', { params });
      return response.data.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  getCoverage: async (): Promise<CoverageData> => {
    try {
      if (USE_MOCK_DATA) {
        return {
          overall: { totalVerses: 0, completedVerses: 0, percentage: 0 },
          testaments: [
            { testament: 'Old Testament', totalVerses: 0, completedVerses: 0, percentage: 0 },
            { testament: 'New Testament', totalVerses: 0, completedVerses: 0, percentage: 0 },
          ],
          books: CANONICAL_BOOKS.map((book, index) => ({
            book,
            testament: index < 46 ? 'Old Testament' : 'New Testament',
            totalVerses: 0,
            completedVerses: 0,
            percentage: 0,
          })),
        };
      }

      const response = await api.get('/stats/coverage');
      return response.data.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  getWeakness: async (): Promise<WeaknessReport> => {
    try {
      if (USE_MOCK_DATA) {
        return {
          topCharacters: [],
          topWords: [],
          totalTrackedAttempts: 0,
          suggestedDrillText: '',
        };
      }

      const response = await api.get('/stats/weakness');
      return response.data.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  getAchievements: async (tz?: string): Promise<AchievementsData> => {
    try {
      if (USE_MOCK_DATA) {
        return createMockAchievementsData();
      }

      const response = await api.get('/stats/achievements', {
        params: {
          tz: tz || getBrowserTimeZone(),
        },
      });
      return response.data.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },
};

export const MemoryService = {
  getDeck: async (): Promise<MemoryItem[]> => {
    try {
      if (USE_MOCK_DATA) {
        return [];
      }
      const response = await api.get('/memory');
      return response.data.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  saveVerse: async (payload: {
    verseId?: string;
    book?: string;
    chapter?: number;
    verse?: number;
    packId?: string;
  }): Promise<MemoryItem> => {
    try {
      const response = await api.post('/memory', payload);
      return response.data.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  addPack: async (
    packId: string
  ): Promise<{ packId: string; resolvedCount: number; data: MemoryItem[] }> => {
    try {
      const response = await api.post(`/memory/pack/${packId}`);
      return {
        packId: response.data.packId,
        resolvedCount: response.data.resolvedCount,
        data: response.data.data,
      };
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  recordPractice: async (
    id: string,
    payload: { wpm: number; accuracy: number; stage: MemoryStage; advance?: boolean }
  ): Promise<MemoryItem> => {
    try {
      const response = await api.post(`/memory/${id}/practice`, payload);
      return response.data.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  updateStage: async (id: string, stage: MemoryStage): Promise<MemoryItem> => {
    try {
      const response = await api.patch(`/memory/${id}`, { stage });
      return response.data.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  removeVerse: async (id: string): Promise<{ _id: string }> => {
    try {
      const response = await api.delete(`/memory/${id}`);
      return response.data.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },
};

export const PlanService = {
  getPlans: async (): Promise<CuratedPlanSummary[]> => {
    try {
      if (USE_MOCK_DATA) {
        return CURATED_PLANS.map((plan) => ({
          id: plan.id,
          title: plan.title,
          subtitle: plan.subtitle,
          category: plan.category,
          description: plan.description,
          contextNote: plan.contextNote,
          totalVerses: plan.verses.length,
          completedVerses: 0,
          inMemoryDeckCount: 0,
          verseRefs: plan.verses,
        }));
      }
      const response = await api.get('/plans');
      return response.data.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  getPlanDetail: async (planId: string): Promise<CuratedPlanDetail> => {
    try {
      if (USE_MOCK_DATA) {
        const plan = getCuratedPlanById(planId);
        if (!plan) {
          throw new Error(`Plan ${planId} not found`);
        }
        const resolved = plan.verses
          .map((ref) =>
            mockVerses.find(
              (v) => v.book === ref.book && v.chapter === ref.chapter && v.verse === ref.verse
            )
          )
          .filter((v): v is Verse => Boolean(v));
        return {
          id: plan.id,
          title: plan.title,
          subtitle: plan.subtitle,
          category: plan.category,
          description: plan.description,
          contextNote: plan.contextNote,
          totalVerses: plan.verses.length,
          completedVerses: 0,
          inMemoryDeckCount: 0,
          verseRefs: plan.verses,
          verses: resolved,
          completedVerseIds: [],
        };
      }
      const response = await api.get(`/plans/${planId}`);
      return response.data.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  getCustomPlans: async (): Promise<CustomPlanSummary[]> => {
    try {
      if (USE_MOCK_DATA) {
        return [];
      }
      const response = await api.get('/plans/custom');
      return response.data.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  createCustomPlan: async (payload: {
    title: string;
    description?: string;
    verses?: CuratedVerseRef[];
  }): Promise<CustomPlanSummary> => {
    try {
      const response = await api.post('/plans/custom', payload);
      return response.data.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  getCustomPlanDetail: async (planId: string): Promise<CustomPlanDetail> => {
    try {
      const response = await api.get(`/plans/custom/${planId}`);
      return response.data.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  updateCustomPlan: async (
    planId: string,
    payload: {
      title?: string;
      description?: string;
      verses?: CuratedVerseRef[];
      addVerse?: CuratedVerseRef;
      removeVerse?: CuratedVerseRef;
    }
  ): Promise<CustomPlanSummary> => {
    try {
      const response = await api.patch(`/plans/custom/${planId}`, payload);
      return response.data.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  deleteCustomPlan: async (planId: string): Promise<{ deletedPlanId: string }> => {
    try {
      const response = await api.delete(`/plans/custom/${planId}`);
      return response.data.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  addCustomPlanToMemory: async (
    planId: string
  ): Promise<{ addedCount: number; totalInDeck: number; data: MemoryItem[] }> => {
    try {
      const response = await api.post(`/plans/custom/${planId}/add-to-memory`);
      return {
        addedCount: response.data.addedCount,
        totalInDeck: response.data.totalInDeck,
        data: response.data.data,
      };
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },
};

export const CompanionService = {
  getChapterCompanion: async (
    book: string,
    chapter: number,
    workId = 'web-bible',
    lens?: PrimaryCompanionLens
  ): Promise<ChapterCompanionResponse> => {
    try {
      if (USE_MOCK_DATA) {
        return getMockChapterCompanion(book, chapter, workId);
      }
      const params: Record<string, string> = { workId };
      if (lens) {
        params.lens = lens;
      }
      const response = await api.get(
        `/companion/${encodeURIComponent(book)}/${chapter}`,
        { params }
      );
      return response.data.data;
    } catch (error: any) {
      if (!error?.response) {
        return getMockChapterCompanion(book, chapter, workId);
      }
      handleApiError(error);
      throw error;
    }
  },

  getBookGuide: async (
    book: string,
    workId = 'web-bible'
  ): Promise<BookGuideResponse> => {
    try {
      if (USE_MOCK_DATA) {
        return getMockBookGuide(book, workId);
      }
      const response = await api.get(`/companion/${encodeURIComponent(book)}/guide`, {
        params: { workId },
      });
      return response.data.data;
    } catch (error: any) {
      if (!error?.response) {
        return getMockBookGuide(book, workId);
      }
      handleApiError(error);
      throw error;
    }
  },

  searchCompanion: async (
    params: CompanionSearchParams = {}
  ): Promise<CompanionSearchResponse> => {
    try {
      if (USE_MOCK_DATA) {
        return getMockCompanionSearch(params);
      }
      const queryParams: Record<string, string | number> = {
        workId: params.workId || 'web-bible',
      };
      if (params.book) queryParams.book = params.book;
      if (params.lens) queryParams.lens = params.lens;
      if (params.tag) queryParams.tag = params.tag;
      if (params.q) queryParams.q = params.q;
      if (params.page !== undefined) queryParams.page = params.page;
      if (params.limit !== undefined) queryParams.limit = params.limit;

      const response = await api.get('/companion/search', { params: queryParams });
      return response.data.data;
    } catch (error: any) {
      if (!error?.response) {
        return getMockCompanionSearch(params);
      }
      handleApiError(error);
      throw error;
    }
  },
};

export const TrailService = {
  getOverview: async (workId = 'web-bible'): Promise<TrailOverviewResponse> => {
    try {
      if (USE_MOCK_DATA) {
        return getMockTrailOverview(workId);
      }
      const response = await api.get('/trail/overview', {
        params: { workId },
      });
      return response.data.data;
    } catch (error: any) {
      if (!error?.response) {
        return getMockTrailOverview(workId);
      }
      handleApiError(error);
      throw error;
    }
  },

  getBookTrail: async (
    book: string,
    workId = 'web-bible'
  ): Promise<TrailBookResponse> => {
    try {
      if (USE_MOCK_DATA) {
        return getMockTrailBook(book, workId);
      }
      const response = await api.get(`/trail/books/${encodeURIComponent(book)}`, {
        params: { workId },
      });
      return response.data.data;
    } catch (error: any) {
      if (!error?.response) {
        return getMockTrailBook(book, workId);
      }
      handleApiError(error);
      throw error;
    }
  },
};
