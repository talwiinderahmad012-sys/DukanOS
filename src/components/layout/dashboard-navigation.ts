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
}

export function getDashboardNavigation(role: string): DashboardNavItem[] {
  const isOwner = role === 'OWNER';
  const isManager = role === 'MANAGER';
  const isOwnerOrManager = isOwner || isManager;

  return [
    { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { name: 'My Workspace', href: '/dashboard/me', icon: User },
    { name: 'POS Terminal', href: '/dashboard/pos', icon: ShoppingCart },
    { name: 'Offline Sync', href: '/dashboard/sync', icon: RefreshCw },
    { name: 'Sales Invoices', href: '/dashboard/sales', icon: Receipt },
    { name: 'Reports', href: '/dashboard/reports', icon: BarChart3 },
    { name: 'Growth', href: '/dashboard/growth', icon: TrendingUp },
    ...(isOwnerOrManager ? [{ name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 }] : []),
    { name: 'Advisor', href: '/dashboard/advisor', icon: Sparkles },
    { name: 'Remote Monitor', href: '/dashboard/monitoring', icon: Store },
    ...(isOwnerOrManager ? [{ name: 'CCTV Cameras', href: '/dashboard/cameras', icon: Camera }] : []),
    { name: 'Communications', href: '/dashboard/communications', icon: MessageSquare },
    { name: 'Activity Stream', href: '/dashboard/activity', icon: Activity },
    { name: 'Feedback', href: '/dashboard/feedback', icon: Star },
    { name: 'Customers (Udhaar)', href: '/dashboard/customers', icon: Users },
    { name: 'Staff (Employees)', href: '/dashboard/employees', icon: UserCheck },
    ...(isOwner ? [{ name: 'Payroll', href: '/dashboard/payroll', icon: Banknote }] : []),
    { name: 'Products', href: '/dashboard/products', icon: Package },
    { name: 'Categories', href: '/dashboard/categories', icon: Layers },
    { name: 'Suppliers', href: '/dashboard/suppliers', icon: Truck },
    { name: 'Inventory', href: '/dashboard/inventory', icon: ClipboardList },
    { name: 'Purchases', href: '/dashboard/purchases', icon: Receipt },
    ...(isOwnerOrManager ? [{ name: 'Expenses', href: '/dashboard/expenses', icon: Banknote }] : []),
    ...(isOwnerOrManager ? [{ name: 'Product Insights', href: '/dashboard/product-insights', icon: Sparkles }] : []),
    ...(isOwnerOrManager ? [{ name: 'System Updates', href: '/dashboard/updates', icon: Rocket }] : []),
    ...(isOwner ? [{ name: 'Platform Support', href: '/dashboard/product-feedback', icon: Bug }] : []),
    ...(isOwner ? [{ name: 'Platform Plans', href: '/dashboard/platform/plans', icon: ShieldCheck }] : []),
    ...(isOwnerOrManager ? [{ name: 'Settings Hub', href: '/dashboard/settings', icon: Settings }] : []),
    ...(isOwner ? [{ name: 'System Health', href: '/dashboard/system', icon: ShieldCheck }] : []),
  ];
}

const NAV_SECTION_LABELS: Record<string, string> = {
  '/dashboard': 'Overview',
  '/dashboard/me': 'Overview',
  '/dashboard/pos': 'Sales',
  '/dashboard/sync': 'Sales',
  '/dashboard/sales': 'Sales',
  '/dashboard/reports': 'Insights',
  '/dashboard/growth': 'Insights',
  '/dashboard/analytics': 'Insights',
  '/dashboard/advisor': 'Insights',
  '/dashboard/monitoring': 'Insights',
  '/dashboard/cameras': 'Insights',
  '/dashboard/communications': 'Communication',
  '/dashboard/activity': 'Communication',
  '/dashboard/feedback': 'Communication',
  '/dashboard/customers': 'People',
  '/dashboard/employees': 'People',
  '/dashboard/payroll': 'People',
  '/dashboard/products': 'Inventory',
  '/dashboard/categories': 'Inventory',
  '/dashboard/suppliers': 'Inventory',
  '/dashboard/inventory': 'Inventory',
  '/dashboard/purchases': 'Inventory',
  '/dashboard/expenses': 'Finance',
  '/dashboard/product-insights': 'Finance',
  '/dashboard/updates': 'Platform',
  '/dashboard/product-feedback': 'Platform',
  '/dashboard/platform/plans': 'Platform',
  '/dashboard/settings': 'Settings',
  '/dashboard/system': 'Settings',
};

export interface DashboardNavSection {
  label: string;
  items: DashboardNavItem[];
}

export function getDashboardNavigationSections(role: string): DashboardNavSection[] {
  const sections: DashboardNavSection[] = [];
  for (const item of getDashboardNavigation(role)) {
    const label = NAV_SECTION_LABELS[item.href] ?? 'General';
    const last = sections[sections.length - 1];
    if (last && last.label === label) {
      last.items.push(item);
    } else {
      sections.push({ label, items: [item] });
    }
  }
  return sections;
}
