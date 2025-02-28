import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Verse } from '../models';

// Load environment variables
dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/type-the-bible');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

// Define the structure of a CSV row
interface VerseRow {
  Verse_Order: string;
  Book: string;
  Chapter: string;
  Verse: string;
  Text: string;
  [key: string]: string; // For any other fields
}

// Import Bible verses from CSV
const importVerses = async () => {
  const results: VerseRow[] = [];
  const dataPath = path.join(__dirname, '../../../data/WEB_Catholic_Version_for_game_updated.csv');

  // Check if file exists
  if (!fs.existsSync(dataPath)) {
    console.error(`File not found: ${dataPath}`);
    process.exit(1);
  }

  // Read CSV file
  fs.createReadStream(dataPath)
    .pipe(csv())
    .on('data', (data: VerseRow) => results.push(data))
    .on('end', async () => {
      console.log(`CSV file successfully processed. Found ${results.length} verses.`);
      
      try {
        // Connect to database
        await connectDB();
        
        // Clear existing verses
        await Verse.deleteMany({});
        console.log('Existing verses deleted');
        
        // Process and insert verses
        const verses = results.map(row => ({
          verseOrder: parseInt(row.Verse_Order),
          book: row.Book,
          chapter: parseInt(row.Chapter),
          verse: parseInt(row.Verse),
          text: row.Text,
          characters: row.Text.length,
          words: row.Text.split(/\s+/).length
        }));
        
        // Insert in batches to avoid memory issues
        const batchSize = 1000;
        for (let i = 0; i < verses.length; i += batchSize) {
          const batch = verses.slice(i, i + batchSize);
          await Verse.insertMany(batch);
          console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(verses.length / batchSize)}`);
        }
        
        console.log('All verses imported successfully');
        process.exit(0);
      } catch (error: any) {
        console.error(`Error importing verses: ${error.message}`);
        process.exit(1);
      }
    });
};

// Run the import
importVerses(); 