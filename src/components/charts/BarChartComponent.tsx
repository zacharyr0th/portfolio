/*
 * Reusable bar chart component for displaying performance data with asset breakdown
 */

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { CHART_COLORS, CHART_CONFIG, formatPercentage } from './ChartConfig';

interface Breakdown {
  crypto: number;
  stocks: number;
  cash: number;
  other: number;
}

interface DataPoint {
  month: string;
  returns: number;
  breakdown: Breakdown;
}

interface BarChartProps {
  data: DataPoint[];
  title: string;
}

export const BarChartComponent = ({ data, title }: BarChartProps) => {
  return (
    <div className="chart-container p-4 bg-card rounded-lg">
      <h3 className="text-sm font-medium text-secondary mb-4">{title}</h3>
      <div style={{ height: CHART_CONFIG.containerHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={data}
            barSize={32}
            maxBarSize={32}
          >
            <CartesianGrid {...CHART_CONFIG.gridStyle} />
            <XAxis
              dataKey="month"
              {...CHART_CONFIG.axisStyle}
            />
            <YAxis
              {...CHART_CONFIG.axisStyle}
              tickFormatter={formatPercentage}
            />
            <Tooltip
              contentStyle={CHART_CONFIG.tooltipStyle}
              formatter={(value: number) => [`${value}%`, 'Returns']}
              cursor={{ fill: 'rgba(var(--card-background), 0.1)' }}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value) => (
                <span style={{ color: 'rgb(var(--text-secondary))' }}>{value}</span>
              )}
            />
            {/* Only apply radius to the top bars when positive, bottom when negative */}
            <Bar
              dataKey="breakdown.crypto"
              stackId="1"
              fill={CHART_COLORS.primary}
              name="Crypto"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="breakdown.stocks"
              stackId="1"
              fill={CHART_COLORS.secondary}
              name="Stocks"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="breakdown.cash"
              stackId="1"
              fill={CHART_COLORS.tertiary}
              name="Cash"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="breakdown.other"
              stackId="1"
              fill={CHART_COLORS.quaternary}
              name="Other"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}; 