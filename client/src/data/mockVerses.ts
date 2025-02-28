import { Verse } from '../types';

// Sample Bible verses for development/testing when API is not available
export const mockVerses: Verse[] = [
  {
    _id: '1',
    verseOrder: 1,
    book: 'Genesis',
    chapter: 1,
    verse: 1,
    text: 'In the beginning God created the heavens and the earth.',
    characters: 56,
    words: 10
  },
  {
    _id: '2',
    verseOrder: 2,
    book: 'John',
    chapter: 3,
    verse: 16,
    text: 'For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.',
    characters: 137,
    words: 25
  },
  {
    _id: '3',
    verseOrder: 3,
    book: 'Psalm',
    chapter: 23,
    verse: 1,
    text: 'The LORD is my shepherd, I lack nothing.',
    characters: 41,
    words: 8
  },
  {
    _id: '4',
    verseOrder: 4,
    book: 'Proverbs',
    chapter: 3,
    verse: 5,
    text: 'Trust in the LORD with all your heart and lean not on your own understanding.',
    characters: 76,
    words: 15
  },
  {
    _id: '5',
    verseOrder: 5,
    book: 'Romans',
    chapter: 8,
    verse: 28,
    text: 'And we know that in all things God works for the good of those who love him, who have been called according to his purpose.',
    characters: 117,
    words: 22
  },
  {
    _id: '6',
    verseOrder: 6,
    book: 'Philippians',
    chapter: 4,
    verse: 13,
    text: 'I can do all this through him who gives me strength.',
    characters: 52,
    words: 11
  },
  {
    _id: '7',
    verseOrder: 7,
    book: 'Matthew',
    chapter: 11,
    verse: 28,
    text: 'Come to me, all you who are weary and burdened, and I will give you rest.',
    characters: 71,
    words: 16
  },
  {
    _id: '8',
    verseOrder: 8,
    book: 'Isaiah',
    chapter: 40,
    verse: 31,
    text: 'But those who hope in the LORD will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint.',
    characters: 158,
    words: 30
  },
  {
    _id: '9',
    verseOrder: 9,
    book: 'Ephesians',
    chapter: 2,
    verse: 8,
    text: 'For it is by grace you have been saved, through faith—and this is not from yourselves, it is the gift of God.',
    characters: 106,
    words: 21
  },
  {
    _id: '10',
    verseOrder: 10,
    book: 'Jeremiah',
    chapter: 29,
    verse: 11,
    text: 'For I know the plans I have for you," declares the LORD, "plans to prosper you and not to harm you, plans to give you hope and a future.',
    characters: 129,
    words: 26
  }
]; 