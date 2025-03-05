/*
 * Mock data for dashboard charts and statistics
 */

export const portfolioData = [
  { 
    month: 'Jan', 
    value: 10000,
    breakdown: {
      crypto: 4200,
      stocks: 3000,
      cash: 1500,
      other: 1300
    }
  },
  { 
    month: 'Feb', 
    value: 12000,
    breakdown: {
      crypto: 5040,
      stocks: 3600,
      cash: 1800,
      other: 1560
    }
  },
  { 
    month: 'Mar', 
    value: 11500,
    breakdown: {
      crypto: 4830,
      stocks: 3450,
      cash: 1725,
      other: 1495
    }
  },
  { 
    month: 'Apr', 
    value: 13000,
    breakdown: {
      crypto: 5460,
      stocks: 3900,
      cash: 1950,
      other: 1690
    }
  },
  { 
    month: 'May', 
    value: 12800,
    breakdown: {
      crypto: 5376,
      stocks: 3840,
      cash: 1920,
      other: 1664
    }
  },
  { 
    month: 'Jun', 
    value: 14500,
    breakdown: {
      crypto: 6090,
      stocks: 4350,
      cash: 2175,
      other: 1885
    }
  },
];

export const allocationData = [
  { name: 'Crypto', value: 42 },
  { name: 'Stocks', value: 30 },
  { name: 'Cash', value: 15 },
  { name: 'Other', value: 13 },
];

export const performanceData = [
  { 
    month: 'Jan', 
    returns: 5.2,
    breakdown: {
      crypto: 3.1,
      stocks: 1.2,
      cash: 0.4,
      other: 0.5
    }
  },
  { 
    month: 'Feb', 
    returns: 3.8,
    breakdown: {
      crypto: 2.0,
      stocks: 1.0,
      cash: 0.3,
      other: 0.5
    }
  },
  { 
    month: 'Mar', 
    returns: -2.1,
    breakdown: {
      crypto: -1.5,
      stocks: -0.4,
      cash: 0.1,
      other: -0.3
    }
  },
  { 
    month: 'Apr', 
    returns: 4.5,
    breakdown: {
      crypto: 2.5,
      stocks: 1.2,
      cash: 0.3,
      other: 0.5
    }
  },
  { 
    month: 'May', 
    returns: -1.3,
    breakdown: {
      crypto: -1.0,
      stocks: -0.2,
      cash: 0.1,
      other: -0.2
    }
  },
  { 
    month: 'Jun', 
    returns: 6.2,
    breakdown: {
      crypto: 3.5,
      stocks: 1.8,
      cash: 0.4,
      other: 0.5
    }
  },
];

export const statsData = {
  netWorth: 14500,
  liquidity: 5200,
  debt: -2800,
  portfolio: 12100,
  allocation: [
    { label: 'Crypto', value: 42 },
    { label: 'Stocks', value: 30 },
    { label: 'Cash', value: 15 },
    { label: 'Other', value: 13 },
  ]
}; 