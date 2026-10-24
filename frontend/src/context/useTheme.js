import { useContext } from 'react';
import { ThemeContext } from './themeContext.js';

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme doit être utilisé au sein d’un <ThemeProvider>');
  }
  return context;
};
