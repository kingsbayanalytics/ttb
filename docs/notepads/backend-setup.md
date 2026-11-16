# Backend Setup for Type the Bible

## API Configuration

The "Type the Bible" application requires a backend API server to fetch Bible verses and handle user authentication, progress tracking, and other functionalities.

### Local Development

For local development, you can run the frontend in mock data mode, which doesn't require a backend connection.

1. Make sure `client/.env.development` contains:
   ```
   REACT_APP_API_URL=http://localhost:3001/api
   REACT_APP_USE_MOCK_DATA=true
   ```

2. With this configuration, the application will use mock verse data instead of making actual API calls.

### Setting Up the Backend

To use actual backend services:

1. Install dependencies from the repository root (or inside `server/`):
   ```
   npm run install:all
   ```

2. Configure the database connection in `server/.env` (see `server/.env.example`):
   ```
   MONGODB_URI=mongodb://localhost:27017/type-the-bible
   JWT_SECRET=your_secret_key
   PORT=3001
   NODE_ENV=development
   ```

3. Import the Bible verses into MongoDB (from `server/`):
   ```
   cd server
   npm run import-data
   ```

4. Start the backend server in development mode (from `server/`):
   ```
   npm run dev
   ```
   (For production, run `npm run build && npm start`.)

5. Update the frontend configuration to use the actual API:
   ```
   # In client/.env.development
   REACT_APP_API_URL=http://localhost:3001/api
   REACT_APP_USE_MOCK_DATA=false
   ```

## API Endpoints

The backend provides the following endpoints:

### Verses

- `GET /api/verses` - Get all verses (paginated)
- `GET /api/verses/:id` - Get a verse by ID
- `GET /api/verses/order/:verseOrder` - Get a verse by order number
- `GET /api/verses/random` - Get a random verse
- `GET /api/verses/book/:book` - Get verses by book
- `GET /api/verses/book/:book/chapter/:chapter` - Get verses by book and chapter

### Authentication

- `POST /api/users` - Register a new user
- `POST /api/users/login` - Login user
- `GET /api/users/profile` - Get user profile (requires authentication)
- `PUT /api/users/profile` - Update user profile (requires authentication)

### Progress

- `GET /api/progress` - Get user progress (requires authentication)
- `GET /api/progress/verse/:verseId` - Get progress for a specific verse (requires authentication)
- `GET /api/progress/summary` - Get progress summary (requires authentication)
- `POST /api/progress/result/:verseId` - Submit a typing test result (requires authentication)

## Error Handling

The API returns error responses in the following format:

```json
{
  "success": false,
  "error": "Error message",
  "stack": null
}
```

Status codes:
- 200: Success
- 400: Bad request (invalid input)
- 401: Unauthorized (authentication required)
- 404: Not found
- 500: Server error

## Fallback Mode

The frontend is designed to work even if the backend is not available. It will use mock data for verses and will store progress locally in the browser.

To deploy the application without a backend, set `REACT_APP_USE_MOCK_DATA=true` in the `client/.env.production` file. 