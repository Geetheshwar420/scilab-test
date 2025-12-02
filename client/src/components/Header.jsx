import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Header.css';
import { useAuth } from '../hooks/useAuth';

export default function Header({ toggleTheme, currentTheme }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const { user } = useAuth(); // user object contains metadata with role

    const handleToggle = () => setMenuOpen(!menuOpen);

    // Determine if the logged‑in user is an admin
    const isAdmin = user && user.user_metadata && user.user_metadata.role === 'admin';

    return (
        <header className="app-header">
            <div className="logo">🧪 PhysicsDept</div>
            <button className="hamburger" onClick={handleToggle} aria-label="Toggle navigation">
                ☰
            </button>
            <nav className={`nav-links ${menuOpen ? 'open' : ''}`}>
                <Link to="/dashboard" onClick={() => setMenuOpen(false)}>Dashboard</Link>
                <Link to="/exam" onClick={() => setMenuOpen(false)}>Exams</Link>
                {isAdmin && (
                    <Link to="/admin" onClick={() => setMenuOpen(false)}>Admin</Link>
                )}
            </nav>
            <button className="theme-toggle" onClick={toggleTheme}>
                {currentTheme === 'dark' ? '🌞 Light' : '🌙 Dark'}
            </button>
        </header>
    );
}
