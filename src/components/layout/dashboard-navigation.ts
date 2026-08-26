import {
  LayoutDashboard, ShoppingCart, Package, Users,
  TrendingUp, Receipt, Layers, Truck, ClipboardList,
  BarChart3, Sparkles, UserCheck, Star, MessageSquare, Activity, RefreshCw,
  User, Camera, Banknote, Settings, ShieldCheck, Rocket, Bug, Store
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface DashboardNavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  translationKey?: string;
}

export function getDashboardNavigation(role: string): DashboardNavItem[] {
  const isOwner = role === 'OWNER';
  const isManager = role === 'MANAGER';
  const isOwnerOrManager = isOwner || isManager;

  return [
    { name: 'Overview', translationKey: 'nav.overview', href: '/dashboard', icon: LayoutDashboard },
    { name: 'My Workspace', translationKey: 'nav.myWorkspace', href: '/dashboard/me', icon: User },
    { name: 'POS Terminal', translationKey: 'nav.posTerminal', href: '/dashboard/pos', icon: ShoppingCart },
    { name: 'Offline Sync', translationKey: 'nav.offlineSync', href: '/dashboard/sync', icon: RefreshCw },
    { name: 'Sales Invoices', translationKey: 'nav.salesInvoices', href: '/dashboard/sales', icon: Receipt },
    { name: 'Reports', translationKey: 'nav.reports', href: '/dashboard/reports', icon: BarChart3 },
    { name: 'Growth', translationKey: 'nav.growth', href: '/dashboard/growth', icon: TrendingUp },
    ...(isOwnerOrManager ? [{ name: 'Analytics', translationKey: 'nav.analytics', href: '/dashboard/analytics', icon: BarChart3 }] : []),
    { name: 'Advisor', translationKey: 'nav.advisor', href: '/dashboard/advisor', icon: Sparkles },
    { name: 'Remote Monitor', translationKey: 'nav.remoteMonitor', href: '/dashboard/monitoring', icon: Store },
    ...(isOwnerOrManager ? [{ name: 'CCTV Cameras', translationKey: 'nav.cctvCameras', href: '/dashboard/cameras', icon: Camera }] : []),
    { name: 'Communications', translationKey: 'nav.communications', href: '/dashboard/communications', icon: MessageSquare },
    { name: 'Activity Stream', translationKey: 'nav.activityStream', href: '/dashboard/activity', icon: Activity },
    { name: 'Feedback', translationKey: 'nav.feedback', href: '/dashboard/feedback', icon: Star },
    { name: 'Customers (Udhaar)', translationKey: 'nav.customers', href: '/dashboard/customers', icon: Users },
    { name: 'Staff (Employees)', translationKey: 'nav.employees', href: '/dashboard/employees', icon: UserCheck },
    ...(isOwner ? [{ name: 'Payroll', translationKey: 'nav.payroll', href: '/dashboard/payroll', icon: Banknote }] : []),
    { name: 'Products', translationKey: 'nav.products', href: '/dashboard/products', icon: Package },
    { name: 'Categories', translationKey: 'nav.categories', href: '/dashboard/categories', icon: Layers },
    { name: 'Suppliers', translationKey: 'nav.suppliers', href: '/dashboard/suppliers', icon: Truck },
    { name: 'Inventory', translationKey: 'nav.inventory', href: '/dashboard/inventory', icon: ClipboardList },
    { name: 'Purchases', translationKey: 'nav.purchases', href: '/dashboard/purchases', icon: Receipt },
    ...(isOwnerOrManager ? [{ name: 'Expenses', translationKey: 'nav.expenses', href: '/dashboard/expenses', icon: Banknote }] : []),
    ...(isOwnerOrManager ? [{ name: 'Product Insights', translationKey: 'nav.productInsights', href: '/dashboard/product-insights', icon: Sparkles }] : []),
    ...(isOwnerOrManager ? [{ name: 'System Updates', translationKey: 'nav.systemUpdates', href: '/dashboard/updates', icon: Rocket }] : []),
    ...(isOwner ? [{ name: 'Platform Support', translationKey: 'nav.platformSupport', href: '/dashboard/product-feedback', icon: Bug }] : []),
    ...(isOwner ? [{ name: 'Platform Plans', translationKey: 'nav.platformPlans', href: '/dashboard/platform/plans', icon: ShieldCheck }] : []),
    ...(isOwnerOrManager ? [{ name: 'Settings Hub', translationKey: 'nav.settingsHub', href: '/dashboard/settings', icon: Settings }] : []),
    ...(isOwner ? [{ name: 'System Health', translationKey: 'nav.systemHealth', href: '/dashboard/system', icon: ShieldCheck }] : []),
  ];
}

export const NAV_SECTION_INFO: Record<string, { label: string; translationKey: string }> = {
  '/dashboard': { label: 'Overview', translationKey: 'nav.sectionOverview' },
  '/dashboard/me': { label: 'Overview', translationKey: 'nav.sectionOverview' },
  '/dashboard/pos': { label: 'Sales', translationKey: 'nav.sectionSales' },
  '/dashboard/sync': { label: 'Sales', translationKey: 'nav.sectionSales' },
  '/dashboard/sales': { label: 'Sales', translationKey: 'nav.sectionSales' },
  '/dashboard/reports': { label: 'Insights', translationKey: 'nav.sectionInsights' },
  '/dashboard/growth': { label: 'Insights', translationKey: 'nav.sectionInsights' },
  '/dashboard/analytics': { label: 'Insights', translationKey: 'nav.sectionInsights' },
  '/dashboard/advisor': { label: 'Insights', translationKey: 'nav.sectionInsights' },
  '/dashboard/monitoring': { label: 'Insights', translationKey: 'nav.sectionInsights' },
  '/dashboard/cameras': { label: 'Insights', translationKey: 'nav.sectionInsights' },
  '/dashboard/communications': { label: 'Communication', translationKey: 'nav.sectionCommunication' },
  '/dashboard/activity': { label: 'Communication', translationKey: 'nav.sectionCommunication' },
  '/dashboard/feedback': { label: 'Communication', translationKey: 'nav.sectionCommunication' },
  '/dashboard/customers': { label: 'People', translationKey: 'nav.sectionPeople' },
  '/dashboard/employees': { label: 'People', translationKey: 'nav.sectionPeople' },
  '/dashboard/payroll': { label: 'People', translationKey: 'nav.sectionPeople' },
  '/dashboard/products': { label: 'Inventory', translationKey: 'nav.sectionInventory' },
  '/dashboard/categories': { label: 'Inventory', translationKey: 'nav.sectionInventory' },
  '/dashboard/suppliers': { label: 'Inventory', translationKey: 'nav.sectionInventory' },
  '/dashboard/inventory': { label: 'Inventory', translationKey: 'nav.sectionInventory' },
  '/dashboard/purchases': { label: 'Inventory', translationKey: 'nav.sectionInventory' },
  '/dashboard/expenses': { label: 'Finance', translationKey: 'nav.sectionFinance' },
  '/dashboard/product-insights': { label: 'Finance', translationKey: 'nav.sectionFinance' },
  '/dashboard/updates': { label: 'Platform', translationKey: 'nav.sectionPlatform' },
  '/dashboard/product-feedback': { label: 'Platform', translationKey: 'nav.sectionPlatform' },
  '/dashboard/platform/plans': { label: 'Platform', translationKey: 'nav.sectionPlatform' },
  '/dashboard/settings': { label: 'Settings', translationKey: 'nav.sectionSettings' },
  '/dashboard/system': { label: 'Settings', translationKey: 'nav.sectionSettings' },
};

export interface DashboardNavSection {
  label: string;
  translationKey?: string;
  items: DashboardNavItem[];
}

export function getDashboardNavigationSections(role: string): DashboardNavSection[] {
  const sections: DashboardNavSection[] = [];
  for (const item of getDashboardNavigation(role)) {
    const info = NAV_SECTION_INFO[item.href] ?? { label: 'General', translationKey: 'common.actions' };
    const last = sections[sections.length - 1];
    if (last && last.label === info.label) {
      last.items.push(item);
    } else {
      sections.push({ label: info.label, translationKey: info.translationKey, items: [item] });
    }
  }
  return sections;
}
