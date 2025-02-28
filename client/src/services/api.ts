import axios from 'axios';
import { Verse, User, Progress, Result } from '../types';
import { mockVerses } from '../data/mockVerses';

// Configurable API settings 
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const USE_MOCK_DATA = process.env.REACT_APP_USE_MOCK_DATA === 'true' || false;

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

// Interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
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
};

// Auth Service
export const AuthService = {
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
      const response = await api.post('/users/login', { email, password });
      const userData = response.data.data;
      
      // Save token to localStorage
      if (userData.token) {
        localStorage.setItem('userToken', userData.token);
        localStorage.setItem('userData', JSON.stringify(userData));
      }
      
      return userData;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  // Logout user
  logout: () => {
    localStorage.removeItem('userToken');
    localStorage.removeItem('userData');
  },

  // Get current user from localStorage
  getCurrentUser: (): User | null => {
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
        localStorage.setItem('userData', JSON.stringify(updatedUser));
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
      const response = await api.get('/progress');
      return response.data.data;
    } catch (error) {
      handleApiError(error);
      
      // Return empty array as fallback
      return [];
    }
  },

  // Get progress for a specific verse
  getVerseProgress: async (verseId: string): Promise<Progress | null> => {
    try {
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
      const response = await api.get('/progress/summary');
      return response.data.data;
    } catch (error) {
      handleApiError(error);
      
      // Return mock summary data as fallback
      return {
        completedVerses: 0,
        attemptedVerses: 0,
        totalVerses: mockVerses.length,
        percentageCompleted: 0,
        averageWPM: 0,
        bestWPM: 0,
        averageAccuracy: 0,
        totalTests: 0
      };
    }
  },

  // Submit a typing test result
  submitResult: async (result: Omit<Result, '_id'>): Promise<{ result: Result, progress: Progress }> => {
    try {
      const response = await api.post('/progress/result', result);
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
      
      return { result: mockResult, progress: mockProgress };
    }
  },
}; 