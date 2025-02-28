import express from 'express';
import {
  getVerses,
  getVerseById,
  getVerseByOrder,
  getRandomVerse,
  getVersesByBook,
  getVersesByBookAndChapter
} from '../controllers/verseController';

const router = express.Router();

// Get all verses (paginated)
router.get('/', getVerses);

// Get a random verse
router.get('/random', getRandomVerse);

// Get a verse by its order number
router.get('/order/:verseOrder', getVerseByOrder);

// Get verses by book
router.get('/book/:book', getVersesByBook);

// Get verses by book and chapter
router.get('/book/:book/chapter/:chapter', getVersesByBookAndChapter);

// Get a verse by ID
router.get('/:id', getVerseById);

export default router; 