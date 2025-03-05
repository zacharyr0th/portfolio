/*
 * Custom hook for managing theme state and transitions
 */

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';

export type ThemeType = 'dark' | 'light' | 'cold' | 'chrome-bubblegum';

export const useThemeToggle = () => {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const themeOrder: ThemeType[] = ['dark', 'light', 'cold', 'chrome-bubblegum'];
    const currentIndex = themeOrder.indexOf(theme as ThemeType);
    const nextIndex = (currentIndex + 1) % themeOrder.length;
    setTheme(themeOrder[nextIndex]);
  };

  return {
    mounted,
    theme,
    toggleTheme
  };
}; 