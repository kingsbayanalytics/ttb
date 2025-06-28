# Typing the Bible

This document provides an overview of the "Typing the Bible" project, its current status, and future plans.

## Project Overview

"Typing the Bible" is a web application that transforms the command-line game of the same name into a modern, user-friendly experience. The application allows users to practice their typing skills by transcribing verses from the Bible, track their progress, and view detailed analytics and visualizations.

The project is divided into a React/TypeScript frontend and a Node.js/Express backend, with MongoDB as the database.

## Tech Stack

-   **Frontend**: React.js, TypeScript
-   **Backend**: Node.js, Express.js
-   **Database**: MongoDB

## How to Run

### Backend

1.  Navigate to the `server` directory.
2.  Install dependencies: `npm install`
3.  Start the server: `npm start`

### Frontend

1.  Navigate to the `client` directory.
2.  Install dependencies: `npm install`
3.  Start the development server: `npm start`

## Project Status

The project is well underway, with most of the core functionality implemented. Key completed milestones include:

-   **Project Setup**: The initial project structure, including the client and server, is in place.
-   **Data Migration**: The Bible verse data has been imported into the database.
-   **Core Functionality**: Verse selection, the typing test component, real-time feedback, and progress tracking are all implemented.
-   **User Interface**: The landing page, typing test page, and user profile page have been created.
-   **Authentication**: User registration, login, and session management are functional.

The most recent commits indicate that the core typing functionality is working, and project rules have been established.

## Next Steps

The following tasks are remaining:

-   Implement statistics calculation and the statistics dashboard.
-   Write unit tests for the frontend.
-   Set up a CI/CD pipeline for automated testing and deployment.
-   Create comprehensive deployment documentation.
-   Convert existing plotly charts to web-compatible formats and create a dashboard for viewing analytics.

## Key Files

-   `client/`: Contains the React frontend application.
-   `server/`: Contains the Node.js backend application.
-   `data/`: Contains the Bible data files.
-   `docs/notepads/`: Contains the project documentation, including the project plan and backend setup guide.
-   `Typing the Bible Improvement/`: Contains Python scripts and data analysis related to the original command-line game.
