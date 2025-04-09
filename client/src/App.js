import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './templates/login/Login';
import Register from './templates/register/Register';
import Menu from './components/menu/menu';
import YearlyStats from './templates/goal/YearlyStats';
import Statistics from './templates/statistics/Statistics';
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(true);

  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  return (
    <Router>
      <div className="App">
        {isLoggedIn && <Menu onLogout={handleLogout} />}
        <div className={`content ${isLoggedIn ? 'with-menu' : ''}`}>
          <Routes>
            <Route path="/" element={
              isLoggedIn ? <Navigate to="/dashboard" /> : <Login />
            } />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<div></div>} />
            <Route path="/account-book" element={<div>가계부</div>} />
            <Route path="/statistics/*" element={<Statistics />} />
            <Route path="/goal" element={<YearlyStats />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
