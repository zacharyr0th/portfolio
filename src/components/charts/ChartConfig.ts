/*
 * Shared configuration for chart components
 * Provides consistent styling and formatting across all charts
 */

export const CHART_COLORS = {
  primary: 'rgb(var(--success))',
  secondary: 'rgb(var(--foreground))',
  tertiary: 'rgb(var(--text-secondary))',
  quaternary: 'rgb(var(--text-muted))'
};

export const CHART_CONFIG = {
  containerHeight: 300,
  tooltipStyle: {
    backgroundColor: 'rgb(var(--card-background))',
    borderColor: 'rgb(var(--border-color))',
  },
  gridStyle: {
    strokeDasharray: '3 3',
    stroke: 'rgb(var(--border-color))'
  },
  axisStyle: {
    stroke: 'rgb(var(--text-secondary))',
    fontSize: 12
  }
};

export const formatCurrency = (value: number) => `$${value.toLocaleString()}`;
export const formatPercentage = (value: number) => `${value}%`; 