'use client';

/*
 * Collapsible sidebar component that displays market information
 * Features DeFi/TradFi toggle and category navigation
 */

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

interface MarketItem {
  symbol: string;
  price: string;
  change: number;
}

type ViewMode = 'defi' | 'tradfi';

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('defi');
  const pathname = usePathname();

  // Handle window resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsOpen(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close sidebar on mobile when route changes
  useEffect(() => {
    if (isMobile) {
      setIsOpen(false);
    }
  }, [pathname, isMobile]);

  // Close sidebar on mobile when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const sidebar = document.getElementById('sidebar');
      const toggleButton = document.getElementById('sidebar-toggle');
      if (isMobile && 
          sidebar && 
          !sidebar.contains(event.target as Node) && 
          toggleButton && 
          !toggleButton.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobile]);
  
  const defiMarketData: MarketItem[] = [
    { symbol: 'BTC', price: '$13.3', change: 1.7 },
    { symbol: 'ETH', price: '$86.3', change: 0.1 },
    { symbol: 'XRP', price: '$63.1', change: 4.8 },
    { symbol: 'BNB', price: '$31.0', change: 6.0 },
    { symbol: 'SOL', price: '$75.0', change: 0.4 },
  ];

  const tradfiMarketData: MarketItem[] = [
    { symbol: 'AAPL', price: '$169.3', change: 0.8 },
    { symbol: 'MSFT', price: '$401.4', change: 1.2 },
    { symbol: 'GOOGL', price: '$142.5', change: -0.5 },
    { symbol: 'AMZN', price: '$178.3', change: 2.1 },
    { symbol: 'NVDA', price: '$875.4', change: 3.2 },
  ];

  const defiCategories = [
    'Majors', 'Non-EVM', 'EVM', 'Dinos', 'RWA', 'DePIN',
    'Bridges', 'CEX', 'AI', 'Stables', 'Memes'
  ];

  const tradfiCategories = [
    'US Stocks', 'Global Stocks', 'Bonds', 'Commodities', 
    'Forex', 'ETFs', 'Mutual Funds', 'Real Estate'
  ];

  const currentMarketData = viewMode === 'defi' ? defiMarketData : tradfiMarketData;
  const currentCategories = viewMode === 'defi' ? defiCategories : tradfiCategories;

  return (
    <>
      {/* Toggle button - only visible on mobile */}
      <button
        id="sidebar-toggle"
        onClick={() => setIsOpen(!isOpen)}
        className={`md:hidden fixed right-3 top-[4.25rem] p-1.5 sm:p-2 rounded-lg border border-custom bg-card text-secondary z-50 transition-all duration-300 ${
          isOpen ? 'translate-x-0 rotate-180' : ''
        }`}
        aria-label="Toggle sidebar"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4 sm:h-5 sm:w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Sidebar */}
      <aside
        id="sidebar"
        className={`${
          isMobile
            ? `fixed top-14 sm:top-16 right-0 h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] w-full md:w-64 transform transition-all duration-300 border-l border-custom ${
                isOpen ? 'translate-x-0' : 'translate-x-full'
              }`
            : 'sticky top-16 h-[calc(100vh-4rem)] w-64 flex-shrink-0'
        } bg-card overflow-y-auto`}
      >
        <div className="p-3 sm:p-4">
          {/* DeFi/TradFi Toggle */}
          <div className="flex space-x-2 mb-6">
            <button
              onClick={() => setViewMode('defi')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all duration-200 ${
                viewMode === 'defi'
                  ? 'bg-[var(--hover-color)] text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--hover-color)]'
              }`}
            >
              DeFi
            </button>
            <button
              onClick={() => setViewMode('tradfi')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all duration-200 ${
                viewMode === 'tradfi'
                  ? 'bg-[var(--hover-color)] text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--hover-color)]'
              }`}
            >
              TradFi
            </button>
          </div>

          {/* Market Data Section */}
          <div className="mb-4 sm:mb-6">
            <h2 className="text-base sm:text-lg font-medium mb-3 sm:mb-4 text-[var(--text-primary)]">
              {viewMode === 'defi' ? 'Crypto Majors' : 'Stock Market'}
            </h2>
            <div className="space-y-2 sm:space-y-3">
              {currentMarketData.map((item) => (
                <div key={item.symbol} className="flex items-center justify-between">
                  <span className="text-sm sm:text-base text-[var(--text-secondary)]">{item.symbol}</span>
                  <div className="flex items-center space-x-3 sm:space-x-4">
                    <span className="text-sm sm:text-base text-[var(--text-secondary)]">{item.price}</span>
                    <span className={`text-sm sm:text-base min-w-[50px] sm:min-w-[60px] text-right ${
                      item.change >= 0 ? 'text-[var(--success)]' : 'text-[var(--error)]'
                    }`}>
                      {item.change > 0 ? '+' : ''}{item.change}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div className="space-y-1.5 sm:space-y-2">
            {currentCategories.map((category) => (
              <button
                key={category}
                className="w-full text-left p-2.5 rounded-lg flex items-center justify-between text-sm sm:text-base text-[var(--text-secondary)] transition-colors hover:bg-[var(--hover-color)]"
              >
                <span>{category}</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar; 