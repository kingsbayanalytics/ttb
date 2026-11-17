import request from 'supertest';
import { setupTestApp, connectTestDB, disconnectTestDB } from './test-setup';
import { Progress, User, Verse } from '../models';

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

  describe('GET /api/verses/next', () => {
    let token = '';
    let userId = '';

    beforeEach(async () => {
      await User.deleteMany({});
      await Progress.deleteMany({});
      await Verse.deleteMany({});

      await Verse.create([
        mockVerse,
        {
          verseOrder: 3,
          book: 'Genesis',
          chapter: 1,
          verse: 2,
          text: 'The earth was formless and empty.',
          characters: 33,
          words: 6,
        },
        mockVerse2,
      ]);

      const regRes = await request(app)
        .post('/api/users')
        .send({
          username: 'nextverseuser',
          email: 'nextverse@example.com',
          password: 'password123',
        })
        .expect(201);
      token = regRes.body.data.token;
      userId = regRes.body.data._id;
    });

    it('requires authentication', async () => {
      await request(app).get('/api/verses/next').expect(401);
      await request(app).get('/api/verses/next?book=Genesis').expect(401);
    });

    it('returns the lowest untyped verseOrder overall and ignores incomplete progress', async () => {
      const gen1 = await Verse.findOne({ verseOrder: 1 });
      await Progress.create({
        user: userId,
        verse: gen1!._id,
        verseOrder: 1,
        completed: false,
        attempts: 1,
        bestWPM: 20,
        bestAccuracy: 80,
      });

      const firstRes = await request(app)
        .get('/api/verses/next')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(firstRes.body.success).toBe(true);
      expect(firstRes.body.data.complete).toBe(false);
      expect(firstRes.body.data.verse.verseOrder).toBe(1);

      await Progress.updateOne({ user: userId, verse: gen1!._id }, { completed: true });

      const secondRes = await request(app)
        .get('/api/verses/next')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(secondRes.body.data.complete).toBe(false);
      expect(secondRes.body.data.verse.verseOrder).toBe(2);
      expect(secondRes.body.data.verse.book).toBe('Exodus');
    });

    it('scopes to ?book= and returns explicit {complete:true, verse:null} when finished', async () => {
      const gen1 = await Verse.findOne({ verseOrder: 1 });
      const gen2 = await Verse.findOne({ verseOrder: 3 });

      const firstGen = await request(app)
        .get('/api/verses/next?book=Genesis')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(firstGen.body.data.complete).toBe(false);
      expect(firstGen.body.data.verse.verseOrder).toBe(1);

      await Progress.create([
        {
          user: userId,
          verse: gen1!._id,
          verseOrder: 1,
          completed: true,
          attempts: 1,
          bestWPM: 50,
          bestAccuracy: 95,
        },
        {
          user: userId,
          verse: gen2!._id,
          verseOrder: 3,
          completed: true,
          attempts: 1,
          bestWPM: 55,
          bestAccuracy: 98,
        },
      ]);

      const doneGen = await request(app)
        .get('/api/verses/next?book=Genesis')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(doneGen.body).toEqual({
        success: true,
        data: {
          complete: true,
          verse: null,
        },
      });

      // Exodus is still untyped overall
      const nextOverall = await request(app)
        .get('/api/verses/next')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(nextOverall.body.data.complete).toBe(false);
      expect(nextOverall.body.data.verse.book).toBe('Exodus');
    });

    it('returns 404 when ?book= has no seeded verses', async () => {
      const res = await request(app)
        .get('/api/verses/next?book=NonExistentBook')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('No verses found for this book');
    });
  });
}); 