import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthProvider';
import { useAuth } from './hooks/useAuth';
import { useContext } from 'react';
import { ThemeContext } from './context/ThemeContext';
import Header from './components/Header';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Exam from './pages/Exam';
import Admin from './pages/Admin';

const PrivateRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/exam/:examId" element={<PrivateRoute><Exam /></PrivateRoute>} />
      <Route path="/admin" element={<PrivateRoute><Admin /></PrivateRoute>} />
      <Route path="/" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

export default function App() {
  const { theme, toggleTheme } = useContext(ThemeContext);
  return (
    <AuthProvider>
      <Router>
        {/* Header removed as per user request */}
        <button
          onClick={toggleTheme}
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 1000,
            padding: '10px 15px',
            borderRadius: '20px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {theme === 'dark' ? '🌞 Light' : '🌙 Dark'}
        </button>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}
