# Type Through The Bible

A web application that helps users improve their typing skills while memorizing Bible verses. This project is inspired by the original "Type Through The Bible" game by Kenneth Burchfiel, but reimagined as a modern web application.

## Project Overview

Type Through The Bible is a full-stack web application that allows users to practice typing Bible verses. The application tracks typing speed, accuracy, and progress over time, providing detailed analytics to help users improve their typing skills while engaging with biblical content.

## Features

- **Bible Verse Typing Practice**: Practice typing with verses from various books of the Bible
- **Real-time Feedback**: Get immediate feedback on typing accuracy and speed
- **Progress Tracking**: Track your typing speed (WPM), accuracy, and overall progress
- **User Accounts**: Create an account to save your progress and track your improvement over time
- **Verse Selection**: Choose verses randomly, sequentially, or from specific books and chapters
- **Detailed Analytics**: View statistics about your typing performance
- **Responsive Design**: Works on desktop and mobile devices

## Application Architecture

### System Architecture

```mermaid
graph TD
    Client[Client Browser] <--> API[API Server]
    API <--> DB[(MongoDB)]
    
    subgraph "Frontend - React"
        Client --> Components[React Components]
        Components --> Services[API Services]
        Services --> State[Application State]
    end
    
    subgraph "Backend - Node.js/Express"
        API --> Routes[API Routes]
        Routes --> Controllers[Controllers]
        Controllers --> Models[Mongoose Models]
        Models --> DB
    end
    
    style Client fill:#f9f,stroke:#333,stroke-width:2px
    style API fill:#bbf,stroke:#333,stroke-width:2px
    style DB fill:#bfb,stroke:#333,stroke-width:2px
```

### User Flow

```mermaid
flowchart TD
    Start([User Visits Site]) --> LoggedIn{Logged In?}
    LoggedIn -->|No| Login[Login/Register]
    LoggedIn -->|Yes| Dashboard[Dashboard]
    
    Login --> Dashboard
    
    Dashboard --> SelectVerse[Select Verse]
    SelectVerse --> Random[Random Verse]
    SelectVerse --> Sequential[Next Untyped Verse]
    SelectVerse --> ByBook[Verse from Specific Book]
    
    Random --> TypingTest[Typing Test]
    Sequential --> TypingTest
    ByBook --> TypingTest
    
    TypingTest --> Typing[User Types Verse]
    Typing --> Completed{Completed?}
    
    Completed -->|No| Typing
    Completed -->|Yes| Results[View Results]
    
    Results --> SaveProgress[Save Progress]
    SaveProgress --> NextAction{Next Action}
    
    NextAction -->|Retry| TypingTest
    NextAction -->|New Verse| SelectVerse
    NextAction -->|View Stats| Statistics[View Statistics]
    NextAction -->|Exit| End([End Session])
    
    Statistics --> NextAction
```

### Data Flow

```mermaid
sequenceDiagram
    participant User
    participant Client as React Client
    participant API as Express API
    participant DB as MongoDB
    
    User->>Client: Login/Register
    Client->>API: POST /api/auth/login or register
    API->>DB: Validate/Create User
    DB->>API: User Data
    API->>Client: Auth Token + User Info
    
    User->>Client: Request Verse
    Client->>API: GET /api/verses
    API->>DB: Query Verses
    DB->>API: Verse Data
    API->>Client: Verse Data
    
    User->>Client: Complete Typing Test
    Client->>Client: Calculate WPM, Accuracy
    Client->>API: POST /api/progress
    API->>DB: Save Progress Data
    DB->>API: Confirmation
    API->>Client: Success Response
    
    User->>Client: View Statistics
    Client->>API: GET /api/progress
    API->>DB: Query User Progress
    DB->>API: Progress Data
    API->>Client: Statistics Data
    Client->>User: Display Statistics
```

## Project Structure

The project is organized into two main directories:

- `server`: Backend API built with Node.js, Express, and MongoDB
- `client`: Frontend application built with React and TypeScript

```
project/
├── client/               # Frontend React application
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── services/     # API services
│   │   ├── types/        # TypeScript type definitions
│   │   └── App.tsx       # Main application component
│   └── public/           # Static assets
│
├── server/               # Backend Node.js/Express API
│   ├── src/
│   │   ├── controllers/  # Request handlers
│   │   ├── models/       # Database models
│   │   ├── routes/       # API routes
│   │   └── index.ts      # Server entry point
│   └── tests/            # Server tests
│
├── src/                  # Shared code (if applicable)
└── docs/                 # Documentation
```

## Component Structure

```mermaid
classDiagram
    App --> Navbar
    App --> Home
    App --> TypingTest
    App --> Progress
    App --> Profile
    App --> Login
    App --> Register
    
    class App {
        +render()
    }
    
    class Navbar {
        +user: User
        +logout()
        +render()
    }
    
    class Home {
        +render()
    }
    
    class TypingTest {
        +verse: Verse
        +typedText: string
        +startTime: Date
        +endTime: Date
        +wpm: number
        +accuracy: number
        +fetchVerse()
        +handleTyping()
        +calculateResults()
        +saveProgress()
        +render()
    }
    
    class Progress {
        +statistics: Stats[]
        +fetchStats()
        +render()
    }
    
    class Profile {
        +user: User
        +stats: UserStats
        +fetchUserData()
        +updateProfile()
        +render()
    }
    
    class Login {
        +email: string
        +password: string
        +handleLogin()
        +render()
    }
    
    class Register {
        +name: string
        +email: string
        +password: string
        +handleRegister()
        +render()
    }
```

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or Atlas)

### Installation

1. Clone the repository
2. Install dependencies for both server and client:

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### Running the Application

#### Development Mode

1. Start the server:

```bash
# From the server directory
npm run dev
```

2. Start the client:

```bash
# From the client directory
npm start
```

3. Open your browser and navigate to `http://localhost:3000`

#### Production Mode

1. Build the client:

```bash
# From the client directory
npm run build
```

2. Start the server in production mode:

```bash
# From the server directory
npm start
```

## API Endpoints

- `GET /api/verses`: Get verses (with filtering options)
- `GET /api/verses/:id`: Get a specific verse
- `POST /api/progress`: Save typing test results
- `GET /api/progress`: Get user progress statistics
- `POST /api/auth/register`: Register a new user
- `POST /api/auth/login`: Login a user

## Technologies Used

### Backend
- Node.js
- Express
- MongoDB
- Mongoose
- TypeScript

### Frontend
- React
- TypeScript
- React Router
- Axios
- CSS3

## License

This project is licensed under the MIT License.

## Acknowledgments

- Inspired by the original "Type Through The Bible" game by Kenneth Burchfiel
- Bible verses provided by public domain sources
