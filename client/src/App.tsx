import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuthSession } from './context/AuthContext';
import Navbar from './components/Navbar';
import Home from './components/Home';
import Login from './components/Login';
import Register from './components/Register';
import TypingTest from './components/TypingTest';
import Progress from './components/Progress';
import Profile from './components/Profile';
import { Dashboard } from './components/dashboard';
import './App.css';

const AppRoutes: React.FC = () => {
  const { mode } = useAuthSession();

  return (
    <div className="App">
      <Navbar />
      <main className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          {mode !== 'entra' && <Route path="/login" element={<Login />} />}
          {mode !== 'entra' && <Route path="/register" element={<Register />} />}
          <Route path="/typing" element={<TypingTest />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </main>
      <footer>
        <div className="container">
          <p>&copy; {new Date().getFullYear()} Type the Bible. Inspired by the original command-line game by Kenneth Burchfiel.</p>
        </div>
      </footer>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
