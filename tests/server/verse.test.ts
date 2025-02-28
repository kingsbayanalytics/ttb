import request from 'supertest';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Verse } from '../../server/src/models';

// Load environment variables
dotenv.config();

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

describe('Verse API', () => {
  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/type-the-bible-test');
    
    // Clear the database
    await Verse.deleteMany({});
    
    // Add a test verse
    await Verse.create(mockVerse);
  });

  afterAll(async () => {
    // Disconnect from database
    await mongoose.connection.close();
  });

  describe('GET /api/verses', () => {
    it('should return all verses', async () => {
      const res = await request('http://localhost:5000')
        .get('/api/verses')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].book).toBe('Genesis');
    });
  });

  describe('GET /api/verses/random', () => {
    it('should return a random verse', async () => {
      const res = await request('http://localhost:5000')
        .get('/api/verses/random')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.book).toBe('Genesis');
    });
  });

  describe('GET /api/verses/order/:verseOrder', () => {
    it('should return a verse by its order number', async () => {
      const res = await request('http://localhost:5000')
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
      await request('http://localhost:5000')
        .get('/api/verses/order/9999')
        .expect('Content-Type', /json/)
        .expect(404);
    });
  });
}); 