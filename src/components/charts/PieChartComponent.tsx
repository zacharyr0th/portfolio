/*
 * Reusable pie chart component for displaying allocation data
 */

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import { CHART_COLORS, CHART_CONFIG, formatCurrency } from './ChartConfig';

interface DataPoint {
  name: string;
  value: number;
}

interface PieChartProps {
  data: DataPoint[];
  title: string;
  netWorth?: number;
}

const CenterLabel = ({ viewBox, netWorth }: { viewBox: any; netWorth: number }) => {
  const { cx, cy } = viewBox;
  return (
    <g>
      <text
        x={cx}
        y={cy - 10}
        textAnchor="middle"
        fill="rgb(var(--text-secondary))"
        fontSize="12px"
      >
        Net Worth
      </text>
      <text
        x={cx}
        y={cy + 10}
        textAnchor="middle"
        fill="rgb(var(--primary))"
        fontSize="18px"
        fontWeight="500"
      >
        {formatCurrency(netWorth)}
      </text>
    </g>
  );
};

export const PieChartComponent = ({ data, title, netWorth = 0 }: PieChartProps) => {
  return (
    <div className="chart-container p-4 bg-card rounded-lg">
      <h3 className="text-sm font-medium text-secondary mb-4">{title}</h3>
      <div style={{ height: CHART_CONFIG.containerHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="45%"
              innerRadius={85}
              outerRadius={120}
              paddingAngle={4}
              dataKey="value"
            >
              {data.map((_, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={Object.values(CHART_COLORS)[index % Object.values(CHART_COLORS).length]} 
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={CHART_CONFIG.tooltipStyle}
              formatter={(value: number) => [`${value}%`, 'Allocation']}
            />
            {netWorth > 0 && <CenterLabel viewBox={{ cx: "50%", cy: "45%" }} netWorth={netWorth} />}
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}; 