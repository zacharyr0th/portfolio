/*
 * Dashboard charts component that displays portfolio analytics
 */

'use client';

import { LineChartComponent } from './charts/LineChartComponent';
import { PieChartComponent } from './charts/PieChartComponent';
import { BarChartComponent } from './charts/BarChartComponent';
import { StatsCard } from './StatsCard';
import {
  portfolioData,
  allocationData,
  performanceData,
  statsData
} from '../data/mockData';

export default function DashboardCharts() {
  return (
    <div className="grid grid-cols-1 gap-6 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <LineChartComponent
          data={portfolioData}
          title=""
        />
        <PieChartComponent
          data={allocationData}
          title=""
          netWorth={statsData.netWorth}
        />
        <BarChartComponent
          data={performanceData}
          title=""
        />
      </div>
      <div className="grid grid-cols-1 gap-6">
        <StatsCard {...statsData} />
      </div>
    </div>
  );
} 