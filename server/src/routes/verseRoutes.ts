import express from 'express';
import {
  getVerses,
  getVerseById,
  getVerseByOrder,
  getRandomVerse,
  getNextVerse,
  getVersesByBook,
  getVersesByBookAndChapter,
  getBookChapters,
  getVerseContext
} from '../controllers/verseController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// Get all verses (paginated)
router.get('/', getVerses);

// Get a random verse
router.get('/random', getRandomVerse);

// Get next untyped verse (overall or scoped to ?book=); mounted before /:id
router.get('/next', protect, getNextVerse);

// Get a verse by its order number
router.get('/order/:verseOrder', getVerseByOrder);

// Get immediate previous & next verses for passage flow context
router.get('/context/:verseOrder', getVerseContext);

// Get chapter list and verse counts for a book (mounted before /book/:book)
router.get('/book/:book/chapters', getBookChapters);

// Get verses by book
router.get('/book/:book', getVersesByBook);

// Get verses by book and chapter
router.get('/book/:book/chapter/:chapter', getVersesByBookAndChapter);

// Get a verse by ID
router.get('/:id', getVerseById);

export default router; 