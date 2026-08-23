import { requireAuthenticatedUser } from '@/lib/auth/context';
import { prisma } from '@/lib/db/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Users, 
  TrendingUp,
  Receipt,
  Bell,
  Settings,
  LogOut,
  Store,
  Layers,
  Truck,
  ClipboardList,
  BarChart3,
  Sparkles,
  UserCheck,
  User,
  Star,
  MessageSquare,
  Activity,
  RefreshCw,
  Camera,
  Banknote,
  ShieldCheck,
  Rocket,
  Bug
} from 'lucide-react';
import { signOut } from '@/lib/auth/auth';
import { MobileNav } from '@/components/layout/mobile-nav';
import { NetworkStatusBadge } from '@/components/pwa/pwa-provider';
import { NotificationBell } from '@/components/notifications/notification-bell';
import LiveAnalyticsRefresher from '@/components/analytics/live-analytics-refresher';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuthenticatedUser().catch(() => redirect('/login'));

  // Fetch user's business memberships
  const memberships = await prisma.businessMembership.findMany({
    where: { userId: user.id },
    include: { business: true }
  });

  // If user has no businesses, redirect to onboarding
  if (memberships.length === 0) {
    redirect('/onboarding');
  }

  // Determine active business (defaults to first for now)
  const activeMembership = memberships[0];
  const activeBusiness = activeMembership.business;

  const isOwner = activeMembership.role === 'OWNER';
  const isManager = activeMembership.role === 'MANAGER';
  const isOwnerOrManager = isOwner || isManager;

  const navigation = [
    { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { name: 'My Workspace', href: '/dashboard/me', icon: User },
    { name: 'POS Terminal', href: '/dashboard/pos', icon: ShoppingCart },
    { name: 'Offline Sync', href: '/dashboard/sync', icon: RefreshCw },
    { name: 'Sales Invoices', href: '/dashboard/sales', icon: Receipt },
    { name: 'Reports', href: '/dashboard/reports', icon: BarChart3 },
    { name: 'Growth', href: '/dashboard/growth', icon: TrendingUp },
    { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
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
    ...(isOwnerOrManager ? [{ name: 'Product Insights', href: '/dashboard/product-insights', icon: Sparkles }] : []),
    ...(isOwnerOrManager ? [{ name: 'System Updates', href: '/dashboard/updates', icon: Rocket }] : []),
    ...(isOwner ? [{ name: 'Platform Support', href: '/dashboard/product-feedback', icon: Bug }] : []),
    ...(isOwnerOrManager ? [{ name: 'Settings Hub', href: '/dashboard/settings', icon: Settings }] : []),
    ...(isOwner ? [{ name: 'System Health', href: '/dashboard/system', icon: ShieldCheck }] : []),
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      
      {/* Mobile Header & Nav */}
      <MobileNav 
        businessName={activeBusiness.name} 
        role={activeMembership.role} 
      />

      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r min-h-screen">
        <div className="p-6 flex items-center gap-3 border-b">
          <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
            <Store className="h-4 w-4 text-white" />
          </div>
          <div className="overflow-hidden">
            <h2 className="font-bold text-gray-900 text-sm truncate">{activeBusiness.name}</h2>
            <p className="text-xs text-gray-400 font-medium capitalize">{activeMembership.role.toLowerCase()}</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 text-gray-600 rounded-lg hover:bg-gray-50 hover:text-blue-600 transition-colors"
            >
              <item.icon className="h-5 w-5" />
              <span className="font-medium text-sm">{item.name}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t">
          <form action={async () => {
            'use server';
            await signOut();
          }}>
            <button className="flex items-center gap-3 px-3 py-2 w-full text-gray-600 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors">
              <LogOut className="h-5 w-5" />
              <span className="font-medium text-sm">Sign out</span>
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-screen max-w-full overflow-hidden">
        {/* Top Header */}
        <header className="hidden md:flex bg-white border-b h-16 items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-3">
            <NetworkStatusBadge />
          </div>

          <div className="flex items-center gap-4">
            <NotificationBell businessId={activeBusiness.id} />
            <Link
              href="/dashboard/settings/notifications"
              className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-50 transition-colors"
              title="Notification Settings"
            >
              <Settings className="h-5 w-5" />
            </Link>
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
              {user.name?.charAt(0) || 'U'}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-4 md:p-8 overflow-y-auto">
          {children}
          <LiveAnalyticsRefresher />
        </div>
      </main>
    </div>
  );
}
