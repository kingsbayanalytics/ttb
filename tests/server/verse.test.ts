import request from 'supertest';
import mongoose from 'mongoose';
import { setupTestApp } from '../../server/src/tests/test-setup';
import { Verse } from '../../server/src/models';

describe('Verse API', () => {
  const app = setupTestApp();

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
    book: 'Genesis',
    chapter: 2,
    verse: 1,
    text: 'Thus the heavens and the earth were finished, and all the host of them.',
    characters: 70,
    words: 14
  };

  const mockVerse3 = {
    verseOrder: 3,
    book: 'Exodus',
    chapter: 1,
    verse: 1,
    text: 'These are the names of the sons of Israel who came into Egypt with Jacob, each man with his household:',
    characters: 100,
    words: 20
  };

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/type-the-bible-test');
    await Verse.deleteMany({});
    await Verse.create(mockVerse);
    await Verse.create(mockVerse2);
    await Verse.create(mockVerse3);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('GET /api/verses', () => {
    it('should return all verses', async () => {
      const res = await request(app)
        .get('/api/verses')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(3);
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
      // Since it's random, we can't assert the exact verse, but we can check its structure
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

  describe('GET /api/verses/book/:bookName', () => {
    it('should return verses for a specific book', async () => {
      const res = await request(app)
        .get('/api/verses/book/Genesis')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].book).toBe('Genesis');
      expect(res.body.data[1].book).toBe('Genesis');
    });

    it('should return an empty array for a non-existent book', async () => {
      const res = await request(app)
        .get('/api/verses/book/NonExistentBook')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(0);
    });
  });
}); 