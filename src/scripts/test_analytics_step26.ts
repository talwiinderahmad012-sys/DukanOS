import { PrismaClient } from '@/generated/prisma/client';
import { getAnalyticsKPIs, getSalesTrend, getTopProducts, getLowStockSummary, getTopCustomers, getUdhaarAnalytics, getInventoryValuation } from '@/services/analytics';
import { calculateBusinessHealth } from '@/services/analytics/health-score';
import { generateBusinessInsights } from '@/services/analytics/insights';

const prisma = new PrismaClient({} as any);

async function run() {
  const business = await prisma.business.findFirst();
  if (!business) return console.log('No business found');

  const period = { start: new Date(2000, 1, 1), end: new Date(), label: 'Test' };
  
  console.log('Testing getAnalyticsKPIs');
  const kpi = await getAnalyticsKPIs(business.id, period, period);
  console.log('KPI keys:', Object.keys(kpi));
  
  console.log('Testing getSalesTrend');
  const trend = await getSalesTrend(business.id, 30, 'Asia/Karachi');
  console.log('Trend length:', trend.length);
  
  console.log('Testing getTopProducts');
  const top = await getTopProducts(business.id, period.start, period.end, 10, 'revenue');
  console.log('Top products length:', top.length);
  
  console.log('Testing calculateBusinessHealth');
  const health = await calculateBusinessHealth(business.id, 'Asia/Karachi');
  console.log('Health:', health.overallScore, health.status);
  
  console.log('Testing generateBusinessInsights');
  const insights = await generateBusinessInsights(business.id, 'Asia/Karachi');
  console.log('Insights length:', insights.length);
  
  console.log('Done test_analytics_step26');
  process.exit(0);
}

run();
