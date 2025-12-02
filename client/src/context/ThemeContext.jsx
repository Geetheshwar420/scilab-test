import React, { createContext, useState, useEffect } from 'react';

export const ThemeContext = createContext({
    theme: 'dark',
    toggleTheme: () => { }
});

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState('dark');

    // Persist theme in localStorage
    useEffect(() => {
        const saved = localStorage.getItem('theme');
        if (saved) setTheme(saved);
    }, []);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};
