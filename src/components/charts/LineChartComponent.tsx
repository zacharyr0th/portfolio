/*
 * Reusable line chart component for displaying time series data with asset breakdown
 */

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import { CHART_COLORS, CHART_CONFIG, formatCurrency } from './ChartConfig';

interface Breakdown {
  crypto: number;
  stocks: number;
  cash: number;
  other: number;
}

interface DataPoint {
  month: string;
  value: number;
  breakdown: Breakdown;
}

interface LineChartProps {
  data: DataPoint[];
  title: string;
}

export const LineChartComponent = ({ data, title }: LineChartProps) => {
  return (
    <div className="chart-container p-4 bg-card rounded-lg">
      <h3 className="text-sm font-medium text-secondary mb-4">{title}</h3>
      <div style={{ height: CHART_CONFIG.containerHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <CartesianGrid {...CHART_CONFIG.gridStyle} />
            <XAxis
              dataKey="month"
              {...CHART_CONFIG.axisStyle}
            />
            <YAxis
              {...CHART_CONFIG.axisStyle}
              tickFormatter={formatCurrency}
            />
            <Tooltip
              contentStyle={CHART_CONFIG.tooltipStyle}
              formatter={(value: number) => [formatCurrency(value), 'Value']}
            />
            <Area
              type="monotone"
              dataKey="breakdown.crypto"
              stackId="1"
              stroke={CHART_COLORS.primary}
              fill={CHART_COLORS.primary}
            />
            <Area
              type="monotone"
              dataKey="breakdown.stocks"
              stackId="1"
              stroke={CHART_COLORS.secondary}
              fill={CHART_COLORS.secondary}
            />
            <Area
              type="monotone"
              dataKey="breakdown.cash"
              stackId="1"
              stroke={CHART_COLORS.tertiary}
              fill={CHART_COLORS.tertiary}
            />
            <Area
              type="monotone"
              dataKey="breakdown.other"
              stackId="1"
              stroke={CHART_COLORS.quaternary}
              fill={CHART_COLORS.quaternary}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}; 