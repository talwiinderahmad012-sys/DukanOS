'use client';

import { useState } from 'react';
import { 
  Menu, X, Store, LogOut,
  LayoutDashboard, ShoppingCart, Package, Users, 
  TrendingUp, Receipt, Layers, Truck, ClipboardList,
  BarChart3, Sparkles, UserCheck, Star, MessageSquare, Activity, RefreshCw,
  User, Camera, Banknote, Settings, ShieldCheck, Rocket, Bug
} from 'lucide-react';
import Link from 'next/link';
import { NetworkStatusBadge } from '@/components/pwa/pwa-provider';

export function MobileNav({ 
  businessName, 
  role, 
}: { 
  businessName: string;
  role: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const isOwner = role === 'OWNER';
  const isManager = role === 'MANAGER';
  const isOwnerOrManager = isOwner || isManager;

  const navigation = [
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
    ...(isOwnerOrManager ? [{ name: 'Product Insights', href: '/dashboard/product-insights', icon: Sparkles }] : []),
    ...(isOwnerOrManager ? [{ name: 'System Updates', href: '/dashboard/updates', icon: Rocket }] : []),
    ...(isOwner ? [{ name: 'Platform Support', href: '/dashboard/product-feedback', icon: Bug }] : []),
    ...(isOwnerOrManager ? [{ name: 'Settings Hub', href: '/dashboard/settings', icon: Settings }] : []),
    ...(isOwner ? [{ name: 'System Health', href: '/dashboard/system', icon: ShieldCheck }] : []),
  ];

  return (
    <>
      <div className="md:hidden flex items-center justify-between bg-white border-b p-4 relative z-50">
        <div className="flex items-center gap-2">
          <Store className="h-6 w-6 text-blue-600" />
          <span className="font-bold text-gray-900 truncate max-w-[200px]">{businessName}</span>
        </div>
        <button onClick={() => setIsOpen(!isOpen)} className="text-gray-500 p-1">
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {isOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-gray-900/50" onClick={() => setIsOpen(false)} />
      )}

      <div className={`md:hidden fixed inset-y-0 left-0 z-50 w-64 bg-white border-r transform transition-transform duration-200 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b">
          <h2 className="font-bold text-gray-900 truncate">{businessName}</h2>
          <p className="text-xs text-gray-500">{role}</p>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3 py-3 text-gray-600 rounded-lg hover:bg-gray-50 hover:text-blue-600 transition-colors"
            >
              <item.icon className="h-5 w-5" />
              <span className="font-medium text-sm">{item.name}</span>
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}
