import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Verse } from '../types';
import { VerseService, ProgressService, AuthService } from '../services/api';

const TypingTest: React.FC = () => {
  const [verse, setVerse] = useState<Verse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [typedText, setTypedText] = useState<string>('');
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [completed, setCompleted] = useState<boolean>(false);
  const [wpm, setWpm] = useState<number>(0);
  const [accuracy, setAccuracy] = useState<number>(0);
  const [incorrectCharCount, setIncorrectCharCount] = useState<number>(0);
  const [verseSelectionMode, setVerseSelectionMode] = useState<'random' | 'book' | 'sequential'>('random');
  const [selectedBook, setSelectedBook] = useState<string>('');
  const [selectedChapter, setSelectedChapter] = useState<number>(1);
  const [availableBooks, setAvailableBooks] = useState<string[]>([
    'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 
    'Matthew', 'Mark', 'Luke', 'John', 'Acts',
    'Romans', 'Corinthians', 'Galatians', 'Ephesians', 'Philippians',
    'Colossians', 'Thessalonians', 'Timothy', 'Titus', 'Philemon',
    'Hebrews', 'James', 'Peter', 'John', 'Jude', 'Revelation'
  ]);
  
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const navigate = useNavigate();
  const user = AuthService.getCurrentUser();

  // Load a verse on component mount
  useEffect(() => {
    fetchVerse();
  }, []);

  // Focus the textarea when verse is loaded
  useEffect(() => {
    if (verse && inputRef.current) {
      inputRef.current.focus();
    }
  }, [verse]);

  // Set start time on first keystroke
  useEffect(() => {
    if (typedText.length === 1 && !startTime) {
      setStartTime(new Date());
    }
  }, [typedText, startTime]);

  // Check for completion and calculate stats
  useEffect(() => {
    if (!verse || !typedText) return;

    // Check for completion
    if (typedText.length === verse.text.length && !completed) {
      const now = new Date();
      setEndTime(now);
      setCompleted(true);
      
      // Calculate final stats
      const durationInMinutes = (now.getTime() - (startTime?.getTime() || now.getTime())) / 1000 / 60;
      const wordsPerMinute = Math.round(verse.words / durationInMinutes);
      setWpm(wordsPerMinute);
      
      // Submit result if logged in
      if (user) {
        submitResult(now, wordsPerMinute, incorrectCharCount);
      }
    }
    
    // Calculate accuracy as we type
    let incorrect = 0;
    for (let i = 0; i < typedText.length; i++) {
      if (typedText[i] !== verse.text[i]) {
        incorrect++;
      }
    }
    setIncorrectCharCount(incorrect);
    
    const accuracyPercentage = Math.round(((typedText.length - incorrect) / typedText.length) * 100) || 100;
    setAccuracy(accuracyPercentage);
  // eslint-disable-next-line react-hooks/exhaustive-deps  
  }, [typedText, verse, completed, startTime, user, incorrectCharCount]);

  const fetchVerse = async () => {
    try {
      setLoading(true);
      setError(null);
      setTypedText('');
      setStartTime(null);
      setEndTime(null);
      setCompleted(false);
      
      let data: Verse;
      
      switch (verseSelectionMode) {
        case 'book':
          if (!selectedBook) {
            setError('Please select a book');
            setLoading(false);
            return;
          }
          try {
            const bookResults = await VerseService.getVersesByBook(selectedBook);
            if (bookResults.data.length === 0) {
              setError(`No verses found for ${selectedBook}`);
              setLoading(false);
              return;
            }
            // Get a random verse from this book
            const randomBookIndex = Math.floor(Math.random() * bookResults.data.length);
            data = bookResults.data[randomBookIndex];
          } catch (err) {
            throw new Error(`Failed to fetch verse from ${selectedBook}.`);
          }
          break;
          
        case 'sequential':
          try {
            // Get the user's progress to find the next verse they should do
            const progress = user ? await ProgressService.getUserProgress() : [];
            
            // Find the highest verse order they've attempted
            let nextVerseOrder = 1;
            if (progress.length > 0) {
              const maxVerseOrder = Math.max(...progress.map(p => p.verseOrder));
              nextVerseOrder = maxVerseOrder + 1;
            }
            
            data = await VerseService.getVerseByOrder(nextVerseOrder);
          } catch (err) {
            // If we can't get sequential verse, fall back to random
            console.error('Failed to get sequential verse, falling back to random:', err);
            data = await VerseService.getRandomVerse();
          }
          break;
          
        case 'random':
        default:
          data = await VerseService.getRandomVerse();
          break;
      }
      
      setVerse(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch verse. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const submitResult = async (endTime: Date, wpm: number, incorrectChars: number) => {
    if (!verse || !startTime) return;

    try {
      const duration = endTime.getTime() - startTime.getTime(); // in milliseconds
      const cps = verse.characters / (duration / 1000);
      
      await ProgressService.submitResult({
        user: user?._id || '',
        verse: verse._id,
        verseOrder: verse.verseOrder,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration,
        wpm,
        cps,
        accuracy,
        incorrectCharacters: incorrectChars,
        totalCharacters: verse.characters
      });
    } catch (err) {
      console.error('Failed to submit result:', err);
      // We'll continue even if result submission fails
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTypedText(e.target.value);
  };

  const handleTryAnotherVerse = () => {
    fetchVerse();
  };

  const handleViewProgress = () => {
    navigate('/progress');
  };

  const handleVerseSelectionModeChange = (mode: 'random' | 'book' | 'sequential') => {
    setVerseSelectionMode(mode);
  };

  const handleBookChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedBook(e.target.value);
  };

  const handleFetchVerseClick = () => {
    fetchVerse();
  };

  if (loading) {
    return <div className="loading">Loading verse...</div>;
  }

  if (error) {
    return (
      <div className="error-container">
        <p className="error-message">{error}</p>
        <button onClick={fetchVerse} className="primary-button">
          Try Again
        </button>
      </div>
    );
  }

  if (!verse) {
    return <div className="error">No verse found</div>;
  }

  // Highlight correct/incorrect characters in the verse
  const renderVerse = () => {
    if (!verse) return null;
    
    return verse.text.split('').map((char, index) => {
      let className = '';
      
      if (index < typedText.length) {
        className = typedText[index] === char ? 'correct' : 'incorrect';
      }
      
      return (
        <span key={index} className={className}>
          {char}
        </span>
      );
    });
  };

  return (
    <div className="typing-test-container">
      <div className="verse-settings">
        <div className="selection-controls">
          <div className="mode-selector">
            <label>Verse Selection Mode:</label>
            <div className="mode-buttons">
              <button 
                className={`selection-button ${verseSelectionMode === 'random' ? 'active' : ''}`}
                onClick={() => handleVerseSelectionModeChange('random')}
              >
                Random
              </button>
              
              <button 
                className={`selection-button ${verseSelectionMode === 'book' ? 'active' : ''}`}
                onClick={() => handleVerseSelectionModeChange('book')}
              >
                By Book
              </button>
              
              <button 
                className={`selection-button ${verseSelectionMode === 'sequential' ? 'active' : ''}`}
                onClick={() => handleVerseSelectionModeChange('sequential')}
                disabled={!user}
                title={!user ? "Login to use sequential mode" : ""}
              >
                Sequential
              </button>
            </div>
          </div>
          
          {verseSelectionMode === 'book' && (
            <div className="book-selector">
              <select value={selectedBook} onChange={handleBookChange}>
                <option value="">-- Select a Book --</option>
                {availableBooks.map(book => (
                  <option key={book} value={book}>{book}</option>
                ))}
              </select>
            </div>
          )}
          
          <button 
            className="primary-button"
            onClick={handleFetchVerseClick}
            disabled={verseSelectionMode === 'book' && !selectedBook}
          >
            Get Verse
          </button>
        </div>
      </div>
      
      <div className="verse-reference">
        <h2>{verse.book} {verse.chapter}:{verse.verse}</h2>
      </div>
      
      <div className="verse-display">{renderVerse()}</div>
      
      <div className="typing-stats">
        {startTime && !completed && (
          <>
            <div className="stat">
              <span className="stat-label">WPM:</span> {wpm}
            </div>
            <div className="stat">
              <span className="stat-label">Accuracy:</span> {accuracy}%
            </div>
            <div className="stat">
              <span className="stat-label">Progress:</span>{' '}
              {Math.round((typedText.length / verse.text.length) * 100)}%
            </div>
          </>
        )}
      </div>
      
      {completed ? (
        <div className="results-container">
          <h3>Verse Completed!</h3>
          
          <div className="results">
            <div className="result-item">
              <span className="result-label">Words Per Minute:</span>
              <span className="result-value">{wpm}</span>
            </div>
            
            <div className="result-item">
              <span className="result-label">Accuracy:</span>
              <span className="result-value">{accuracy}%</span>
            </div>
            
            <div className="result-item">
              <span className="result-label">Time:</span>
              <span className="result-value">
                {startTime && endTime
                  ? `${((endTime.getTime() - startTime.getTime()) / 1000).toFixed(1)} seconds`
                  : 'N/A'}
              </span>
            </div>
          </div>
          
          <div className="results-actions">
            <button onClick={handleTryAnotherVerse} className="primary-button">
              Try Another Verse
            </button>
            
            {user && (
              <button onClick={handleViewProgress} className="secondary-button">
                View Progress
              </button>
            )}
          </div>
        </div>
      ) : (
        <textarea
          ref={inputRef}
          className="typing-input"
          value={typedText}
          onChange={handleInputChange}
          placeholder="Start typing the verse above..."
          disabled={completed}
          autoFocus
        />
      )}
      
      {!completed && (
        <button onClick={handleTryAnotherVerse} className="secondary-button mt-4">
          Get Another Verse
        </button>
      )}
    </div>
  );
};

export default TypingTest; 