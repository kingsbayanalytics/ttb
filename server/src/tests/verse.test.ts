import request from 'supertest';
import { setupTestApp, connectTestDB, disconnectTestDB } from './test-setup';
import { Verse } from '../models';

// Mock verse data
const mockVerse = {
  verseOrder: 1,
  book: 'Genesis',
  chapter: 1,
  verse: 1,
  text: 'In the beginning, God created the heavens and the earth.',
  characters: 56,
  words: 12
};

const mockVerse2 = {
  verseOrder: 2,
  book: 'Exodus',
  chapter: 1,
  verse: 1,
  text: 'Now these are the names of the sons of Israel, who came into Egypt (every man and his household came with Jacob):',
  characters: 112,
  words: 23
};

describe('Verse API', () => {
  const app = setupTestApp();

  beforeAll(async () => {
    // Connect to test database
    await connectTestDB();
    
    // Clear the database
    await Verse.deleteMany({});
    
    // Add test verses
    await Verse.create(mockVerse);
    await Verse.create(mockVerse2);
  });

  afterAll(async () => {
    // Disconnect from database
    await disconnectTestDB();
  });

  describe('GET /api/verses', () => {
    it('should return all verses', async () => {
      const res = await request(app)
        .get('/api/verses')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].book).toBe('Genesis');
    });
  });

  describe('GET /api/verses/random', () => {
    it('should return a random verse', async () => {
      const res = await request(app)
        .get('/api/verses/random')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data).toHaveProperty('book');
      expect(res.body.data).toHaveProperty('text');
    });
  });

  describe('GET /api/verses/order/:verseOrder', () => {
    it('should return a verse by its order number', async () => {
      const res = await request(app)
        .get('/api/verses/order/1')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.verseOrder).toBe(1);
      expect(res.body.data.book).toBe('Genesis');
      expect(res.body.data.chapter).toBe(1);
      expect(res.body.data.verse).toBe(1);
    });

    it('should return 404 for non-existent verse order', async () => {
      await request(app)
        .get('/api/verses/order/9999')
        .expect('Content-Type', /json/)
        .expect(404);
    });
  });

  describe('GET /api/verses/book/:book', () => {
    it('should return verses for a specific book', async () => {
      const res = await request(app)
        .get('/api/verses/book/Genesis')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].book).toBe('Genesis');
    });

    it('should return 404 for a non-existent book', async () => {
      const res = await request(app)
        .get('/api/verses/book/NonExistentBook')
        .expect('Content-Type', /json/)
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('No verses found for this book');
    });
  });
}); 