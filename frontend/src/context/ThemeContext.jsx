import { useEffect, useState } from 'react';
import { ThemeContext } from './themeContext.js';

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() =>
    localStorage.getItem('rabyas_theme') === 'light' ? 'light' : 'dark'
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('rabyas_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((currentTheme) => currentTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
