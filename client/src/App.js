import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './templates/Login';
import Register from './templates/Register';
import Menu from './components/menu/menu';
import YearlyStats from './templates/YearlyStats';
import Statistics from './templates/Statistics';
import './App.css';

function App() {
  const isLoggedIn = true;

  return (
    <Router>
      <div className="App">
        {isLoggedIn && <Menu />}
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
