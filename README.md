# Todo Application

A full-stack Todo application built with React, TypeScript, Express, and MongoDB.

## Project Structure

The project is organized into two main directories:

- `server`: Backend API built with Express and MongoDB
- `client`: Frontend application built with React and TypeScript

## Features

- Create, read, update, and delete todos
- Mark todos as completed
- Responsive design for mobile and desktop
- RESTful API for data management

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

- `GET /api/todos`: Get all todos
- `GET /api/todos/:id`: Get a specific todo
- `POST /api/todos`: Create a new todo
- `PUT /api/todos/:id`: Update a todo
- `DELETE /api/todos/:id`: Delete a todo

## Technologies Used

### Backend
- Node.js
- Express
- MongoDB
- Mongoose

### Frontend
- React
- TypeScript
- Axios
- React Router

## License

This project is licensed under the MIT License.
