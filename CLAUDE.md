# Typing the Bible - Claude's Project Overview

## Project Summary

"Typing the Bible" is a modern web application that transforms Bible verse transcription into an engaging typing practice experience. This application combines spiritual engagement with practical skill development, allowing users to improve their typing speed and accuracy while memorizing scripture.

## Tech Stack

### Frontend
- **React.js** with TypeScript for type-safe component development
- **React Router** for navigation
- **Axios** for API communication
- **CSS3** for responsive styling

### Backend
- **Node.js** with Express.js for RESTful API
- **MongoDB** for data persistence
- **Mongoose** for object modeling
- **JWT** for authentication
- **TypeScript** for type safety

## Running the Application

### Prerequisites
- Node.js v14 or higher
- MongoDB (local or Atlas)
- Git

### Quick Start

#### Backend Setup
```bash
cd server
npm install
npm run dev  # Development mode with nodemon
```

#### Frontend Setup
```bash
cd client
npm install
npm start  # Runs on http://localhost:3000
```

### Environment Configuration

Create `.env` files in both client and server directories:

#### Server `.env`:
```
MONGODB_URI=mongodb://localhost:27017/typethebible
JWT_SECRET=your_secret_key
PORT=5000
```

#### Client `.env.development`:
```
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_USE_MOCK_DATA=false
```

## Project Architecture

### File Structure
```
ttb/
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/       # UI components
│   │   │   ├── TypingTest.tsx
│   │   │   ├── Progress.tsx
│   │   │   └── ...
│   │   ├── services/         # API integration
│   │   ├── types/           # TypeScript definitions
│   │   └── App.tsx
│   └── public/
├── server/                   # Express backend
│   ├── src/
│   │   ├── controllers/     # Request handlers
│   │   ├── models/         # Database schemas
│   │   ├── routes/         # API endpoints
│   │   ├── middleware/     # Auth & validation
│   │   └── index.ts
│   └── tests/
├── data/                    # Bible verse data
├── docs/                    # Documentation
│   └── notepads/
│       ├── project-plan.md
│       └── backend-setup.md
└── Typing the Bible Improvement/  # Original Python analytics

```

## Current Features

### Completed ✅
- **Core Typing Functionality**: Real-time typing with immediate feedback
- **User Authentication**: Registration, login, and session management
- **Verse Selection**: Random, sequential, or by book/chapter
- **Progress Tracking**: WPM, accuracy, and completion tracking
- **Database Integration**: MongoDB with verse and user data
- **Responsive UI**: Works on desktop and mobile devices
- **API Architecture**: RESTful endpoints for all operations

### In Progress 🚧
- **Statistics Dashboard**: Comprehensive analytics visualization
- **Testing Suite**: Frontend unit tests
- **CI/CD Pipeline**: Automated testing and deployment

## Feature Enhancements Inspired by BibViz

### Data Analytics & Visualization
1. **Verse Connection Map**
   - Interactive visualization showing relationships between typed verses
   - Cross-references and thematic connections
   - Similar to BibViz's contradiction mapping but for positive connections

2. **Thematic Progress Tracking**
   - Categorize verses by themes (faith, love, wisdom, prophecy)
   - Visual progress bars for each theme
   - Achievement system for completing thematic collections

3. **Book Completion Heatmap**
   - Visual representation of typing coverage across all biblical books
   - Color-coded by completion percentage
   - Click to drill down into specific chapters

### Interactive Learning Features
1. **Contextual Mode**
   - Show surrounding verses for better understanding
   - Optional commentary and historical context
   - Links to related verses

2. **Difficulty Analysis**
   - Track which verses have highest error rates
   - Personalized practice recommendations
   - Adaptive difficulty based on user performance

3. **Memory Challenge Mode**
   - Progressive verse hiding (show fewer words over time)
   - Fill-in-the-blank exercises
   - Verse completion competitions

### Community & Social Features
1. **Global Statistics**
   - Most typed verses across all users
   - Community progress on typing the entire Bible
   - Leaderboards by book, speed, and accuracy

2. **Study Groups**
   - Create or join typing groups
   - Shared progress tracking
   - Group challenges and goals

3. **Verse of the Day**
   - Community-wide daily challenge
   - Special achievements for streaks
   - Social sharing of accomplishments

### Advanced Features
1. **Multi-Translation Support**
   - Type verses in different Bible translations
   - Compare typing difficulty across translations
   - Language learning mode (type in original languages)

2. **Voice Typing Integration**
   - Speech-to-text for accessibility
   - Practice pronunciation alongside typing
   - Audio verse playback

3. **Offline Progressive Web App**
   - Cache verses for offline practice
   - Sync progress when reconnected
   - Installable as desktop/mobile app

## Technical Improvements

### Performance Optimizations
- Implement verse caching strategy
- Add pagination for large datasets
- Optimize database queries with indexing
- Implement lazy loading for components

### Testing Strategy
- Unit tests for all components
- Integration tests for API endpoints
- E2E tests for critical user flows
- Performance benchmarking

### DevOps & Deployment
- Docker containerization
- GitHub Actions for CI/CD
- Environment-based configuration
- Monitoring and logging setup

## Recommended Next Steps

1. **Complete Current Sprint**
   - Finish statistics dashboard implementation
   - Add comprehensive test coverage
   - Set up automated deployment

2. **Phase 2: Enhanced Analytics**
   - Implement verse connection visualization
   - Add thematic categorization
   - Create progress heatmaps

3. **Phase 3: Social Features**
   - Build community features
   - Add leaderboards and achievements
   - Implement study groups

4. **Phase 4: Advanced Features**
   - Multi-translation support
   - Voice typing capabilities
   - PWA conversion

## Running Tests

```bash
# Backend tests
cd server
npm test

# Frontend tests (when implemented)
cd client
npm test

# E2E tests
npm run test:e2e
```

## Useful Commands

```bash
# Lint and format code
npm run lint
npm run format

# Build for production
npm run build

# Database operations
npm run seed  # Populate with verse data
npm run migrate  # Run database migrations
```

## Resources

- [Project Repository](https://github.com/yourusername/ttb)
- [Original Python Game](./Typing the Bible Improvement/)
- [BibViz Inspiration](https://philb61.github.io/)
- [API Documentation](./docs/api.md) (to be created)

## Notes for Development

- Always run linting before commits
- Follow the existing code style and patterns
- Test features in both mock and real data modes
- Keep accessibility in mind (keyboard navigation, screen readers)
- Optimize for both speed and accuracy tracking

---

*This document is maintained by Claude to track project progress and feature planning. Last updated: 2025-07-18*