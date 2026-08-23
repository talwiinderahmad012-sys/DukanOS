export type CohortRow = {
  cohort: string;
  size: number;
  totalRevenue: number;
  repeatPurchaseRate: number;
  offsets: {
    offset: number;
    label: string;
    activeCustomers: number;
    retentionPercent: number;
    revenue: number;
  }[];
};

export type CohortSummary = {
  rows: CohortRow[];
  overallRepeatPurchaseRate: number;
  averageCustomerLifetimeValue: number;
  totalCustomers: number;
};

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string): string {
  const parts = key.split('-');
  const year = Number(parts[0]);
  const month = Number(parts[1]) || 1;
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

export function buildCohortSummary(params: {
  cohortKey: string;
  size: number;
  totalRevenue: number;
  repeaters: number;
  offsets: { offset: number; activeCustomers: number; revenue: number }[];
}): CohortRow {
  return {
    cohort: monthLabel(params.cohortKey),
    size: params.size,
    totalRevenue: params.totalRevenue,
    repeatPurchaseRate: params.size > 0 ? Math.round((params.repeaters / params.size) * 1000) / 10 : 0,
    offsets: params.offsets.map((o) => ({
      offset: o.offset,
      label: o.offset === 0 ? 'Cohort' : `+${o.offset} mo`,
      activeCustomers: o.activeCustomers,
      retentionPercent: params.size > 0 ? Math.round((o.activeCustomers / params.size) * 1000) / 10 : 0,
      revenue: o.revenue,
    })),
  };
}

export function summarizeCohorts(rows: CohortRow[]): {
  overallRepeatPurchaseRate: number;
  averageCustomerLifetimeValue: number;
  totalCustomers: number;
} {
  let totalCustomers = 0;
  let totalRepeaters = 0;
  let totalRevenue = 0;
  for (const r of rows) {
    totalCustomers += r.size;
    totalRepeaters += Math.round((r.repeatPurchaseRate / 100) * r.size);
    totalRevenue += r.totalRevenue;
  }
  return {
    totalCustomers,
    overallRepeatPurchaseRate: totalCustomers > 0 ? Math.round((totalRepeaters / totalCustomers) * 1000) / 10 : 0,
    averageCustomerLifetimeValue: totalCustomers > 0 ? Math.round((totalRevenue / totalCustomers) * 100) / 100 : 0,
  };
}
