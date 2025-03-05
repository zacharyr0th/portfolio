/*
 * Reusable stats card component for displaying financial statistics
 */

import { formatCurrency } from './charts/ChartConfig';

interface AllocationItem {
  label: string;
  value: number;
}

interface StatsCardProps {
  netWorth: number;
  liquidity: number;
  debt: number;
  portfolio: number;
  allocation: AllocationItem[];
}

export const StatsCard = ({
  netWorth,
  liquidity,
  debt,
  portfolio,
  allocation
}: StatsCardProps) => {
  return (
    <div className="stats-container">
      <div className="stats-group">
        <div className="stats-label">Net Worth</div>
        <div className="total-value">{formatCurrency(netWorth)}</div>
      </div>
      <div className="stats-group">
        <div className="stats-label">Liquidity</div>
        <div className="total-value">{formatCurrency(liquidity)}</div>
      </div>
      <div className="stats-group">
        <div className="stats-label">Debt</div>
        <div className="total-value">{formatCurrency(debt)}</div>
      </div>
      <div className="stats-group">
        <div className="stats-label">Portfolio</div>
        <div className="total-value">{formatCurrency(portfolio)}</div>
      </div>
      <div className="allocation-row">
        {allocation.map((item) => (
          <div key={item.label} className="allocation-item">
            <span className="allocation-value">{item.value}%</span>
            <div className="allocation-label">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}; 