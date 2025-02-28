import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import TodoList from './components/TodoList';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <h1>Todo App</h1>
        </header>
        <main>
          <Routes>
            <Route path="/" element={<TodoList />} />
          </Routes>
        </main>
        <footer>
          <p>&copy; {new Date().getFullYear()} Todo App</p>
        </footer>
      </div>
    </Router>
  );
}

export default App; 