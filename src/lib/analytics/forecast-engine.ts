export type DailyRevenuePoint = {
  date: string;
  revenue: number;
};

export type ForecastResult = {
  status: 'SUCCESS' | 'INSUFFICIENT_DATA';
  message?: string;
  next7Days: number;
  next30Days: number;
  projectedMonthly: number;
  trend: 'GROWING' | 'STABLE' | 'DECLINING';
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  recentAverageDaily: number;
  weekOverWeekGrowthPct: number | null;
};

export function computeForecast(series: DailyRevenuePoint[]): ForecastResult {
  const activeDays = series.filter((d) => d.revenue > 0);
  const spanDays = series.length;

  if (spanDays < 14 || activeDays.length < 7) {
    return {
      status: 'INSUFFICIENT_DATA',
      message: 'Insufficient historical data',
      next7Days: 0,
      next30Days: 0,
      projectedMonthly: 0,
      trend: 'STABLE',
      confidence: 'LOW',
      recentAverageDaily: 0,
      weekOverWeekGrowthPct: null,
    };
  }

  const recent28 = series.slice(-28);
  const recentAvg = recent28.reduce((s, d) => s + d.revenue, 0) / recent28.length;

  const prior28 = series.slice(-56, -28);
  const priorAvg = prior28.length > 0 ? prior28.reduce((s, d) => s + d.revenue, 0) / prior28.length : recentAvg;

  let weekOverWeekGrowthPct: number | null = null;
  if (priorAvg > 0) {
    weekOverWeekGrowthPct = Math.round(((recentAvg - priorAvg) / priorAvg) * 1000) / 10;
  }

  const dailyTrendPct = priorAvg > 0 ? Math.round((weekOverWeekGrowthPct! / 28) * 1000) / 10 : 0;
  const cappedTrend = Math.max(-1, Math.min(1, dailyTrendPct));

  let next7 = 0;
  for (let i = 1; i <= 7; i++) {
    const projected = recentAvg * (1 + (cappedTrend / 100) * i);
    next7 += Math.max(0, projected);
  }
  next7 = Math.round(next7);

  let next30 = 0;
  for (let i = 1; i <= 30; i++) {
    const projected = recentAvg * (1 + (cappedTrend / 100) * i);
    next30 += Math.max(0, projected);
  }
  next30 = Math.round(next30);

  let trend: ForecastResult['trend'] = 'STABLE';
  if (weekOverWeekGrowthPct !== null) {
    if (weekOverWeekGrowthPct > 5) trend = 'GROWING';
    else if (weekOverWeekGrowthPct < -5) trend = 'DECLINING';
  }

  let confidence: ForecastResult['confidence'] = 'LOW';
  if (spanDays >= 56 && activeDays.length >= 20) confidence = 'HIGH';
  else if (spanDays >= 28 && activeDays.length >= 8) confidence = 'MEDIUM';

  return {
    status: 'SUCCESS',
    next7Days: next7,
    next30Days: next30,
    projectedMonthly: next30,
    trend,
    confidence,
    recentAverageDaily: Math.round(recentAvg * 100) / 100,
    weekOverWeekGrowthPct,
  };
}
