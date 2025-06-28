import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './components/Home';
import Login from './components/Login';
import Register from './components/Register';
import TypingTest from './components/TypingTest';
import Progress from './components/Progress';
import Profile from './components/Profile';
import './App.css';

// Create a simple component to handle the check-localstorage page
const CheckLocalStorage = () => {
  // Redirect to the actual HTML file
  React.useEffect(() => {
    window.location.href = '/check-localstorage.html';
  }, []);
  
  return <div>Redirecting to localStorage check page...</div>;
};

function App() {
  return (
    <div className="App">
      <Navbar />
      <main className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/typing" element={<TypingTest />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/check-localstorage" element={<CheckLocalStorage />} />
        </Routes>
      </main>
      <footer>
        <div className="container">
          <p>&copy; {new Date().getFullYear()} Type the Bible. Inspired by the original command-line game by Kenneth Burchfiel.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
