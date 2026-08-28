import type { Language } from './types';

import enCommon from './locales/en/common.json';
import enNav from './locales/en/nav.json';
import enPos from './locales/en/pos.json';
import enCustomers from './locales/en/customers.json';
import enInventory from './locales/en/inventory.json';
import enPurchases from './locales/en/purchases.json';
import enExpenses from './locales/en/expenses.json';
import enEmployees from './locales/en/employees.json';
import enReports from './locales/en/reports.json';
import enSettings from './locales/en/settings.json';
import enDashboard from './locales/en/dashboard.json';
import enSales from './locales/en/sales.json';
import enProducts from './locales/en/products.json';
import enCategories from './locales/en/categories.json';
import enSuppliers from './locales/en/suppliers.json';
import enPayroll from './locales/en/payroll.json';
import enAnalytics from './locales/en/analytics.json';
import enOverview from './locales/en/overview.json';
import enGrowth from './locales/en/growth.json';
import enProductInsights from './locales/en/productInsights.json';
import enAdvisor from './locales/en/advisor.json';
import enFeedback from './locales/en/feedback.json';
import enCctv from './locales/en/cctv.json';
import enCommunications from './locales/en/communications.json';
import enNotifications from './locales/en/notifications.json';
import enSync from './locales/en/sync.json';
import enActivity from './locales/en/activity.json';
import enMonitoring from './locales/en/monitoring.json';
import enSystem from './locales/en/system.json';
import enUpdates from './locales/en/updates.json';
import enMe from './locales/en/me.json';
import enAuth from './locales/en/auth.json';
import enOnboarding from './locales/en/onboarding.json';
import enPlatform from './locales/en/platform.json';
import enUi from './locales/en/ui.json';
import enCharts from './locales/en/charts.json';
import enStaticPages from './locales/en/staticPages.json';
import enBusiness from './locales/en/business.json';
import enSettingsAdmin from './locales/en/settingsAdmin.json';

import urCommon from './locales/ur/common.json';
import urNav from './locales/ur/nav.json';
import urPos from './locales/ur/pos.json';
import urCustomers from './locales/ur/customers.json';
import urInventory from './locales/ur/inventory.json';
import urPurchases from './locales/ur/purchases.json';
import urExpenses from './locales/ur/expenses.json';
import urEmployees from './locales/ur/employees.json';
import urReports from './locales/ur/reports.json';
import urSettings from './locales/ur/settings.json';
import urDashboard from './locales/ur/dashboard.json';
import urSales from './locales/ur/sales.json';
import urProducts from './locales/ur/products.json';
import urCategories from './locales/ur/categories.json';
import urSuppliers from './locales/ur/suppliers.json';
import urPayroll from './locales/ur/payroll.json';
import urAnalytics from './locales/ur/analytics.json';
import urOverview from './locales/ur/overview.json';
import urGrowth from './locales/ur/growth.json';
import urProductInsights from './locales/ur/productInsights.json';
import urAdvisor from './locales/ur/advisor.json';
import urFeedback from './locales/ur/feedback.json';
import urCctv from './locales/ur/cctv.json';
import urCommunications from './locales/ur/communications.json';
import urNotifications from './locales/ur/notifications.json';
import urSync from './locales/ur/sync.json';
import urActivity from './locales/ur/activity.json';
import urMonitoring from './locales/ur/monitoring.json';
import urSystem from './locales/ur/system.json';
import urUpdates from './locales/ur/updates.json';
import urMe from './locales/ur/me.json';
import urAuth from './locales/ur/auth.json';
import urOnboarding from './locales/ur/onboarding.json';
import urPlatform from './locales/ur/platform.json';
import urUi from './locales/ur/ui.json';
import urCharts from './locales/ur/charts.json';
import urStaticPages from './locales/ur/staticPages.json';
import urBusiness from './locales/ur/business.json';
import urSettingsAdmin from './locales/ur/settingsAdmin.json';

export type { Language };

const EN = {
  common: enCommon,
  nav: enNav,
  pos: enPos,
  customers: enCustomers,
  inventory: enInventory,
  purchases: enPurchases,
  expenses: enExpenses,
  employees: enEmployees,
  reports: enReports,
  settings: enSettings,
  dashboard: enDashboard,
  sales: enSales,
  products: enProducts,
  categories: enCategories,
  suppliers: enSuppliers,
  payroll: enPayroll,
  analytics: enAnalytics,
  overview: enOverview,
  growth: enGrowth,
  productInsights: enProductInsights,
  advisor: enAdvisor,
  feedback: enFeedback,
  cctv: enCctv,
  communications: enCommunications,
  notifications: enNotifications,
  sync: enSync,
  activity: enActivity,
  monitoring: enMonitoring,
  system: enSystem,
  updates: enUpdates,
  me: enMe,
  auth: enAuth,
  onboarding: enOnboarding,
  platform: enPlatform,
  ui: enUi,
  charts: enCharts,
  staticPages: enStaticPages,
  business: enBusiness,
  settingsAdmin: enSettingsAdmin,
};

const UR = {
  common: urCommon,
  nav: urNav,
  pos: urPos,
  customers: urCustomers,
  inventory: urInventory,
  purchases: urPurchases,
  expenses: urExpenses,
  employees: urEmployees,
  reports: urReports,
  settings: urSettings,
  dashboard: urDashboard,
  sales: urSales,
  products: urProducts,
  categories: urCategories,
  suppliers: urSuppliers,
  payroll: urPayroll,
  analytics: urAnalytics,
  overview: urOverview,
  growth: urGrowth,
  productInsights: urProductInsights,
  advisor: urAdvisor,
  feedback: urFeedback,
  cctv: urCctv,
  communications: urCommunications,
  notifications: urNotifications,
  sync: urSync,
  activity: urActivity,
  monitoring: urMonitoring,
  system: urSystem,
  updates: urUpdates,
  me: urMe,
  auth: urAuth,
  onboarding: urOnboarding,
  platform: urPlatform,
  ui: urUi,
  charts: urCharts,
  staticPages: urStaticPages,
  business: urBusiness,
  settingsAdmin: urSettingsAdmin,
};

export type TranslationDict = typeof EN;
export type TranslationModule = keyof TranslationDict;

type NestedRecord = { [key: string]: string | NestedRecord };

function collectPaths(node: NestedRecord, prefix: string, out: Set<string>): void {
  for (const [key, value] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      out.add(path);
    } else if (value && typeof value === 'object') {
      collectPaths(value, path, out);
    }
  }
}

function assertParity(): void {
  const enPaths = new Set<string>();
  const urPaths = new Set<string>();
  collectPaths(EN as unknown as NestedRecord, '', enPaths);
  collectPaths(UR as unknown as NestedRecord, '', urPaths);
  const missingInUr = [...enPaths].filter((p) => !urPaths.has(p));
  const missingInEn = [...urPaths].filter((p) => !enPaths.has(p));
  if (missingInUr.length > 0 || missingInEn.length > 0) {
    // Surface parity issues loudly during development so every key has both
    // an English and an Urdu value. Failing in production would be worse than
    // silently falling back, so only throw outside production builds.
    const message =
      `[i18n] translation key mismatch — missing in UR: [${missingInUr.join(', ')}] ` +
      `missing in EN: [${missingInEn.join(', ')}]`;
    if (process.env.NODE_ENV !== 'production') {
      console.error(message);
    }
  }
}

assertParity();

export const translations = { EN, UR } as const;
