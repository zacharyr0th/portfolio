'use client';

/*
 * Navbar component that provides navigation and wallet connection functionality
 * Features a responsive design with dark theme
 */

import Link from 'next/link';
import { NavLink } from './NavLink';
import { useThemeToggle, ThemeType } from '../hooks/useThemeToggle';

const ConnectionIcons = () => {
  return (
    <div className="hidden md:grid grid-cols-5 w-56 gap-4">
      {/* Banks */}
      <button 
        className="flex items-center justify-center p-1.5 text-secondary transition-colors hover:text-primary"
        aria-label="Connect bank accounts"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-5 w-5" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M3 6.5l9-3 9 3M3 6.5v13M21 6.5v13M6 19.5h12M6 10h.01M6 13h.01M6 16h.01M18 10h.01M18 13h.01M18 16h.01M12 10h.01M12 13h.01M12 16h.01" 
          />
        </svg>
      </button>

      {/* Brokerages */}
      <button 
        className="flex items-center justify-center p-1.5 text-secondary transition-colors hover:text-primary"
        aria-label="Connect brokerage accounts"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-5 w-5" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" 
          />
        </svg>
      </button>

      {/* Centralized Exchanges */}
      <button 
        className="flex items-center justify-center p-1.5 text-secondary transition-colors hover:text-primary"
        aria-label="Connect exchange accounts"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-5 w-5" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" 
          />
        </svg>
      </button>

      {/* Wallets */}
      <button 
        className="flex items-center justify-center p-1.5 text-secondary transition-colors hover:text-primary"
        aria-label="Connect crypto wallets"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-5 w-5" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" 
          />
        </svg>
      </button>

      {/* Theme Toggle */}
      <ThemeToggle />
    </div>
  );
};

const ThemeToggle = () => {
  const { mounted, theme, toggleTheme } = useThemeToggle();

  if (!mounted) return null;

  const icons = {
    dark: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
      </svg>
    ),
    light: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    cold: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v20M7 4l5 5 5-5M7 20l5-5 5 5M2 12h20M4 7l5 5-5 5M20 7l-5 5 5 5" />
      </svg>
    ),
    'chrome-bubblegum': (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" />
      </svg>
    )
  };

  return (
    <button 
      onClick={toggleTheme}
      className="flex items-center justify-center p-1.5 text-secondary transition-colors hover:text-primary"
      aria-label="Toggle theme"
    >
      {icons[theme as ThemeType] || icons.dark}
    </button>
  );
};

const Navbar = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card md:border-none border-b border-custom">
      <div className="max-w-full px-3 sm:px-4">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Left section */}
          <div className="flex items-center space-x-3 sm:space-x-6">
            <Link href="/" className="text-primary">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center bg-card">
                <span className="text-base sm:text-lg font-semibold">N</span>
              </div>
            </Link>
            <div className="flex items-center space-x-1">
              <NavLink href="/">Dashboard</NavLink>
              <span className="text-muted mx-1">•</span>
              <NavLink href="/accounts">Accounts</NavLink>
            </div>
          </div>

          {/* Right section - Connection Icons */}
          <ConnectionIcons />
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 