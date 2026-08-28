'use client';

import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowUpRight,
  BarChart3,
  Bell,
  ChevronRight,
  LayoutDashboard,
  Moon,
  Package,
  Plus,
  Search,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Store,
  Sun,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { cn } from '@/components/ui/cn';
import {
  LkAlert,
  LkAvatar,
  LkBadge,
  LkButton,
  LkCard,
  LkCardContent,
  LkCardDescription,
  LkCardHeader,
  LkCardTitle,
  LkInput,
  LkLabel,
  LkProgress,
  LkSelect,
  LkSkeleton,
  LkSwitch,
  LkTabs,
} from './lime-ui';

const NAV: { section: string; items: { label: string; icon: LucideIcon; active?: boolean; count?: string }[] }[] = [
  {
    section: 'Overview',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, active: true },
      { label: 'Analytics', icon: BarChart3 },
      { label: 'Orders', icon: ShoppingCart, count: '12' },
    ],
  },
  {
    section: 'Catalog',
    items: [
      { label: 'Products', icon: Package },
      { label: 'Sales', icon: ShoppingBag },
      { label: 'Customers', icon: Users },
    ],
  },
  {
    section: 'System',
    items: [{ label: 'Settings', icon: Settings }],
  },
];

const KPIS = [
  { label: 'Total revenue', value: '₨ 482,900', delta: '+12.4%', up: true, icon: Wallet },
  { label: 'Orders', value: '1,284', delta: '+8.1%', up: true, icon: ShoppingCart },
  { label: 'New customers', value: '216', delta: '-2.3%', up: false, icon: Users },
  { label: 'Avg. basket', value: '₨ 1,140', delta: '+4.7%', up: true, icon: ShoppingBag },
];

const REVENUE = [
  { m: 'Jan', cur: 44, prev: 32 },
  { m: 'Feb', cur: 52, prev: 38 },
  { m: 'Mar', cur: 47, prev: 41 },
  { m: 'Apr', cur: 61, prev: 44 },
  { m: 'May', cur: 58, prev: 47 },
  { m: 'Jun', cur: 66, prev: 50 },
  { m: 'Jul', cur: 72, prev: 52 },
  { m: 'Aug', cur: 64, prev: 55 },
  { m: 'Sep', cur: 78, prev: 58 },
  { m: 'Oct', cur: 84, prev: 60 },
  { m: 'Nov', cur: 92, prev: 66 },
  { m: 'Dec', cur: 88, prev: 70 },
];

const CATEGORY_SHARE = [
  { label: 'Grocery', value: 38, tone: 1 as const },
  { label: 'Beverages', value: 25, tone: 2 as const },
  { label: 'Fresh & Dairy', value: 17, tone: 3 as const },
  { label: 'Household', value: 12, tone: 4 as const },
  { label: 'Other', value: 8, tone: 5 as const },
];

const DONUT = `conic-gradient(var(--chart-1) 0% 38%, var(--chart-2) 38% 63%, var(--chart-3) 63% 80%, var(--chart-4) 80% 92%, var(--chart-5) 92% 100%)`;

const CHART_DOT: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: 'bg-lk-chart-1',
  2: 'bg-lk-chart-2',
  3: 'bg-lk-chart-3',
  4: 'bg-lk-chart-4',
  5: 'bg-lk-chart-5',
};

const TOKEN_SWATCH: Record<string, string> = {
  primary: 'bg-lk-primary',
  background: 'bg-lk-background',
  foreground: 'bg-lk-foreground',
  card: 'bg-lk-card',
  secondary: 'bg-lk-secondary',
  accent: 'bg-lk-accent',
  destructive: 'bg-lk-destructive',
  'chart-2': 'bg-lk-chart-2',
};

const ORDERS = [
  { id: '#3291', customer: 'Ayesha Malik', method: 'Cash', status: 'paid', amount: '₨ 4,320', time: '2 min ago' },
  { id: '#3290', customer: 'Hamza Riaz', method: 'Card', status: 'paid', amount: '₨ 1,860', time: '14 min ago' },
  { id: '#3289', customer: 'Sana Tariq', method: 'Wallet', status: 'pending', amount: '₨ 940', time: '31 min ago' },
  { id: '#3288', customer: 'Bilal Ahmed', method: 'Cash', status: 'refunded', amount: '₨ 2,410', time: '1 hr ago' },
  { id: '#3287', customer: 'Fatima Noor', method: 'Card', status: 'paid', amount: '₨ 7,125', time: '2 hr ago' },
];

const PRODUCTS = [
  { name: 'Basmati Rice 5kg', sold: 342, share: 86, tone: 1 as const },
  { name: 'Cooking Oil 1L', sold: 287, share: 72, tone: 2 as const },
  { name: 'Sugar 1kg', sold: 254, share: 64, tone: 3 as const },
  { name: 'Tea Pack 950g', sold: 203, share: 51, tone: 4 as const },
  { name: 'Dish Soap 750ml', sold: 171, share: 43, tone: 5 as const },
];

const TOKENS = [
  { name: 'primary', light: '#aff33e', dark: '#aff33e' },
  { name: 'background', light: '#fbfcf8', dark: '#020617' },
  { name: 'foreground', light: '#0f172a', dark: '#f8fafc' },
  { name: 'card', light: '#ffffff', dark: '#0f172a' },
  { name: 'secondary', light: '#334155', dark: '#1e293b' },
  { name: 'accent', light: '#f0fdf4', dark: '#14532d' },
  { name: 'destructive', light: '#ef4444', dark: '#991b1b' },
  { name: 'chart-2', light: '#334155', dark: '#b5f848' },
];

function StatusBadge({ status }: { status: string }) {
  if (status === 'paid') return <LkBadge variant="accent">Paid</LkBadge>;
  if (status === 'pending') return <LkBadge variant="muted">Pending</LkBadge>;
  return <LkBadge variant="destructive">Refunded</LkBadge>;
}

function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-lk-sidebar-border bg-lk-sidebar lg:flex">
      <div className="flex items-center gap-3 px-5 py-5">
        <span className="grid h-10 w-10 place-items-center rounded-lk-md bg-lk-sidebar-primary text-lk-sidebar-primary-foreground lk-shadow">
          <Store className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-bold tracking-lk text-lk-sidebar-foreground">DukanOS</p>
          <p className="text-xs text-lk-muted-foreground">Karachi Mart</p>
        </div>
      </div>
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {NAV.map((group) => (
          <div key={group.section}>
            <p className="px-2 pb-2 text-[11px] font-bold uppercase tracking-lk text-lk-muted-foreground">
              {group.section}
            </p>
            <ul className="space-y-1">
              {group.items.map((item) => (
                <li key={item.label}>
                  <a
                    href="#"
                    aria-current={item.active ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-3 rounded-lk-md px-3 py-2 text-sm font-semibold tracking-lk transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lk-sidebar-ring',
                      item.active
                        ? 'bg-lk-sidebar-primary text-lk-sidebar-primary-foreground lk-shadow'
                        : 'text-lk-sidebar-foreground/75 hover:bg-lk-sidebar-accent hover:text-lk-sidebar-accent-foreground',
                    )}
                  >
                    <item.icon className="h-4 w-4" aria-hidden="true" />
                    <span className="flex-1">{item.label}</span>
                    {item.count ? (
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-bold',
                          item.active
                            ? 'bg-lk-sidebar-primary-foreground/15 text-lk-sidebar-primary-foreground'
                            : 'bg-lk-sidebar-accent text-lk-sidebar-accent-foreground',
                        )}
                      >
                        {item.count}
                      </span>
                    ) : null}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="space-y-3 p-3">
        <div className="rounded-lk border border-lk-sidebar-border bg-lk-sidebar-accent p-4">
          <p className="text-sm font-bold tracking-lk text-lk-sidebar-accent-foreground">DukanOS Pro</p>
          <p className="mt-1 text-xs text-lk-muted-foreground">Unlock branch analytics and offline sync.</p>
          <LkButton size="sm" className="mt-3 w-full">
            Upgrade
          </LkButton>
        </div>
        <div className="flex items-center gap-3 px-2 py-1">
          <LkAvatar initials="AK" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold tracking-lk text-lk-sidebar-foreground">Ali Khan</p>
            <p className="text-xs text-lk-muted-foreground">Owner</p>
          </div>
          <ChevronRight className="h-4 w-4 text-lk-muted-foreground" aria-hidden="true" />
        </div>
      </div>
    </aside>
  );
}

function Topbar({ dark, onToggle }: { dark: boolean; onToggle: () => void }) {
  return (
    <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-lk-border bg-lk-background/90 px-6 py-3 backdrop-blur">
      <div className="relative w-full max-w-xs">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-lk-muted-foreground"
          aria-hidden="true"
        />
        <LkInput placeholder="Search products, orders…" className="pl-9" aria-label="Search" />
      </div>
      <div className="ml-auto flex items-center gap-2">
        <LkButton variant="ghost" size="icon" aria-label="Notifications" className="relative">
          <Bell className="h-4 w-4" aria-hidden="true" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-lk-chart-3" />
        </LkButton>
        <LkButton variant="outline" size="icon" onClick={onToggle} aria-label="Toggle dark mode">
          {dark ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
        </LkButton>
        <LkButton size="sm" className="hidden sm:inline-flex">
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          New sale
        </LkButton>
        <LkAvatar initials="AK" className="ml-1" />
      </div>
    </header>
  );
}

function KpiCard({ kpi }: { kpi: (typeof KPIS)[number] }) {
  const Icon = kpi.icon;
  const Delta = kpi.up ? TrendingUp : TrendingDown;
  return (
    <LkCard className="p-5">
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-lk text-lk-muted-foreground">{kpi.label}</p>
        <span className="grid h-9 w-9 place-items-center rounded-lk-md bg-lk-accent text-lk-accent-foreground">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 font-lk-mono text-2xl font-bold tracking-lk text-lk-card-foreground">{kpi.value}</p>
      <p
        className={cn(
          'mt-2 inline-flex items-center gap-1 text-xs font-semibold',
          kpi.up ? 'text-lk-accent-foreground' : 'text-lk-destructive',
        )}
      >
        <Delta className="h-3.5 w-3.5" aria-hidden="true" />
        {kpi.delta} vs last month
      </p>
    </LkCard>
  );
}

function RevenueChart() {
  return (
    <LkCard>
      <LkCardHeader>
        <div>
          <LkCardTitle>Revenue</LkCardTitle>
          <LkCardDescription>Monthly performance vs previous year</LkCardDescription>
        </div>
        <div className="flex items-center gap-4 text-xs text-lk-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-lk-chart-1" /> 2026
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-lk-chart-2" /> 2025
          </span>
        </div>
      </LkCardHeader>
      <LkCardContent>
        <div className="flex h-48 items-end gap-2">
          {REVENUE.map((d) => (
            <div key={d.m} className="group flex flex-1 flex-col items-center gap-2">
              <div className="flex h-40 w-full items-end justify-center gap-1">
                <div
                  className="w-1/3 rounded-t-[3px] bg-lk-chart-2/60 transition-colors group-hover:bg-lk-chart-2"
                  style={{ height: `${d.prev}%` }}
                  title={`${d.m} 2025`}
                />
                <div
                  className="w-1/3 rounded-t-[3px] bg-lk-chart-1 transition-opacity group-hover:opacity-80"
                  style={{ height: `${d.cur}%` }}
                  title={`${d.m} 2026`}
                />
              </div>
              <span className="text-[10px] font-semibold uppercase text-lk-muted-foreground">{d.m}</span>
            </div>
          ))}
        </div>
      </LkCardContent>
    </LkCard>
  );
}

function CategoryDonut() {
  return (
    <LkCard>
      <LkCardHeader>
        <div>
          <LkCardTitle>Sales by category</LkCardTitle>
          <LkCardDescription>Share of revenue this month</LkCardDescription>
        </div>
      </LkCardHeader>
      <LkCardContent className="flex items-center gap-6">
        <div className="relative grid h-36 w-36 shrink-0 place-items-center rounded-full" style={{ background: DONUT }}>
          <div className="grid h-24 w-24 place-items-center rounded-full bg-lk-card text-center">
            <div>
              <p className="font-lk-mono text-lg font-bold text-lk-card-foreground">₨ 482k</p>
              <p className="text-[10px] uppercase tracking-lk text-lk-muted-foreground">Total</p>
            </div>
          </div>
        </div>
        <ul className="flex-1 space-y-2.5">
          {CATEGORY_SHARE.map((c) => (
            <li key={c.label} className="flex items-center gap-2 text-sm">
              <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', CHART_DOT[c.tone])} />
              <span className="flex-1 text-lk-card-foreground">{c.label}</span>
              <span className="font-lk-mono text-xs font-semibold text-lk-muted-foreground">{c.value}%</span>
            </li>
          ))}
        </ul>
      </LkCardContent>
    </LkCard>
  );
}

function OrdersTable() {
  return (
    <LkCard>
      <LkCardHeader>
        <div>
          <LkCardTitle>Recent orders</LkCardTitle>
          <LkCardDescription>Latest transactions across all counters</LkCardDescription>
        </div>
        <LkButton variant="outline" size="sm">
          View all
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </LkButton>
      </LkCardHeader>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-lk-border text-left text-[11px] uppercase tracking-lk text-lk-muted-foreground">
              <th className="px-5 py-3 font-semibold">Order</th>
              <th className="px-5 py-3 font-semibold">Customer</th>
              <th className="px-5 py-3 font-semibold">Method</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {ORDERS.map((o) => (
              <tr key={o.id} className="border-b border-lk-border last:border-0 hover:bg-lk-muted/50">
                <td className="px-5 py-3 font-lk-mono text-xs font-semibold text-lk-card-foreground">{o.id}</td>
                <td className="px-5 py-3">
                  <p className="font-semibold text-lk-card-foreground">{o.customer}</p>
                  <p className="text-xs text-lk-muted-foreground">{o.time}</p>
                </td>
                <td className="px-5 py-3 text-lk-muted-foreground">{o.method}</td>
                <td className="px-5 py-3">
                  <StatusBadge status={o.status} />
                </td>
                <td className="px-5 py-3 text-right font-lk-mono font-semibold text-lk-card-foreground">{o.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </LkCard>
  );
}

function TopProducts() {
  return (
    <LkCard>
      <LkCardHeader>
        <div>
          <LkCardTitle>Top products</LkCardTitle>
          <LkCardDescription>Units sold this month</LkCardDescription>
        </div>
      </LkCardHeader>
      <ul className="space-y-4 p-5">
        {PRODUCTS.map((p) => (
          <li key={p.name}>
            <div className="mb-1.5 flex items-baseline justify-between text-sm">
              <span className="font-semibold text-lk-card-foreground">{p.name}</span>
              <span className="font-lk-mono text-xs text-lk-muted-foreground">{p.sold}</span>
            </div>
            <LkProgress value={p.share} tone={p.tone} />
          </li>
        ))}
      </ul>
    </LkCard>
  );
}

function ComponentGallery() {
  const [notify, setNotify] = useState(true);
  const [lowStock, setLowStock] = useState(false);
  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-bold tracking-lk text-lk-foreground">Component library</h2>
        <p className="text-sm text-lk-muted-foreground">
          Every primitive below consumes the lime token set — switch the theme above to see light/dark parity.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <LkCard>
          <LkCardHeader>
            <LkCardTitle>Buttons</LkCardTitle>
            <LkCardDescription>Primary, secondary, outline, ghost, destructive</LkCardDescription>
          </LkCardHeader>
          <LkCardContent className="flex flex-wrap items-center gap-3">
            <LkButton>Primary</LkButton>
            <LkButton variant="secondary">Secondary</LkButton>
            <LkButton variant="outline">Outline</LkButton>
            <LkButton variant="ghost">Ghost</LkButton>
            <LkButton variant="destructive">Delete</LkButton>
            <LkButton loading>Saving</LkButton>
            <LkButton size="sm">Small</LkButton>
            <LkButton size="lg">Large</LkButton>
          </LkCardContent>
        </LkCard>
        <LkCard>
          <LkCardHeader>
            <LkCardTitle>Badges & alerts</LkCardTitle>
            <LkCardDescription>Status indicators built on semantic tokens</LkCardDescription>
          </LkCardHeader>
          <LkCardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <LkBadge>Primary</LkBadge>
              <LkBadge variant="secondary">Secondary</LkBadge>
              <LkBadge variant="accent">Paid</LkBadge>
              <LkBadge variant="muted">Pending</LkBadge>
              <LkBadge variant="outline">Outline</LkBadge>
              <LkBadge variant="destructive">Refunded</LkBadge>
            </div>
            <div className="space-y-3">
              <LkAlert variant="accent" title="Sync complete">
                All counters synced 2 minutes ago.
              </LkAlert>
              <LkAlert variant="destructive" title="Payment declined">
                Card ending 4242 was rejected.
              </LkAlert>
            </div>
          </LkCardContent>
        </LkCard>
        <LkCard>
          <LkCardHeader>
            <LkCardTitle>Form controls</LkCardTitle>
            <LkCardDescription>Inputs, selects, switches, progress</LkCardDescription>
          </LkCardHeader>
          <LkCardContent className="space-y-4">
            <div>
              <LkLabel htmlFor="lk-demo-name">Product name</LkLabel>
              <LkInput id="lk-demo-name" placeholder="Basmati Rice 5kg" />
            </div>
            <div>
              <LkLabel htmlFor="lk-demo-cat">Category</LkLabel>
              <LkSelect id="lk-demo-cat" defaultValue="grocery">
                <option value="grocery">Grocery</option>
                <option value="beverages">Beverages</option>
                <option value="household">Household</option>
              </LkSelect>
            </div>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-lk-card-foreground">Push notifications</span>
                <LkSwitch checked={notify} onCheckedChange={setNotify} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-lk-card-foreground">Low-stock alerts</span>
                <LkSwitch checked={lowStock} onCheckedChange={setLowStock} />
              </div>
            </div>
            <div>
              <div className="mb-1.5 flex justify-between text-xs text-lk-muted-foreground">
                <span>Monthly target</span>
                <span className="font-lk-mono">72%</span>
              </div>
              <LkProgress value={72} />
            </div>
          </LkCardContent>
        </LkCard>
        <LkCard>
          <LkCardHeader>
            <LkCardTitle>Tabs & loading</LkCardTitle>
            <LkCardDescription>Segmented control plus skeleton states</LkCardDescription>
          </LkCardHeader>
          <LkCardContent className="space-y-4">
            <LkTabs
              items={[
                {
                  id: 'today',
                  label: 'Today',
                  content: <p className="text-sm text-lk-muted-foreground">₨ 38,220 collected across 41 orders so far today.</p>,
                },
                {
                  id: 'week',
                  label: 'Week',
                  content: <p className="text-sm text-lk-muted-foreground">₨ 261,540 this week — 9% ahead of target.</p>,
                },
              ]}
            />
            <div className="space-y-2">
              <LkSkeleton className="h-4 w-3/4" />
              <LkSkeleton className="h-4 w-1/2" />
              <LkSkeleton className="h-9 w-full" />
            </div>
          </LkCardContent>
        </LkCard>
        <LkCard className="lg:col-span-2">
          <LkCardHeader>
            <LkCardTitle>Token reference</LkCardTitle>
            <LkCardDescription>Exact palette values — lime is the primary in both modes; black text keeps 14.5:1 contrast on it</LkCardDescription>
          </LkCardHeader>
          <LkCardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-lk-border text-left text-[11px] uppercase tracking-lk text-lk-muted-foreground">
                  <th className="py-2 pr-4 font-semibold">Token</th>
                  <th className="py-2 pr-4 font-semibold">Light</th>
                  <th className="py-2 pr-4 font-semibold">Dark</th>
                  <th className="py-2 font-semibold">Swatch (active mode)</th>
                </tr>
              </thead>
              <tbody>
                {TOKENS.map((t) => (
                  <tr key={t.name} className="border-b border-lk-border last:border-0">
                    <td className="py-2.5 pr-4 font-lk-mono text-xs font-semibold text-lk-card-foreground">--{t.name}</td>
                    <td className="py-2.5 pr-4 font-lk-mono text-xs text-lk-muted-foreground">{t.light}</td>
                    <td className="py-2.5 pr-4 font-lk-mono text-xs text-lk-muted-foreground">{t.dark}</td>
                    <td className="py-2.5">
                      <span
                        className={cn(
                          'inline-block h-5 w-16 rounded-lk-sm border border-lk-border align-middle',
                          TOKEN_SWATCH[t.name],
                        )}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </LkCardContent>
        </LkCard>
      </div>
    </section>
  );
}

export function LimeDashboard() {
  const [dark, setDark] = useState(false);
  return (
    <div
      className={cn(
        'lime-theme min-h-screen bg-lk-background font-lk-sans tracking-lk text-lk-foreground',
        dark && 'dark',
      )}
    >
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar dark={dark} onToggle={() => setDark((d) => !d)} />
          <main className="flex-1 space-y-6 px-6 py-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold tracking-lk text-lk-foreground">Dashboard</h1>
                <p className="text-sm text-lk-muted-foreground">Store performance for August 2026</p>
              </div>
              <div className="flex gap-2">
                <LkButton variant="outline" size="sm">
                  Export
                </LkButton>
                <LkButton size="sm">
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  New sale
                </LkButton>
              </div>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
              {KPIS.map((k) => (
                <KpiCard key={k.label} kpi={k} />
              ))}
            </div>
            <div className="grid gap-6 xl:grid-cols-3">
              <div className="xl:col-span-2">
                <RevenueChart />
              </div>
              <CategoryDonut />
            </div>
            <div className="grid gap-6 xl:grid-cols-3">
              <div className="xl:col-span-2">
                <OrdersTable />
              </div>
              <TopProducts />
            </div>
            <ComponentGallery />
          </main>
          <footer className="border-t border-lk-border px-6 py-4 text-xs text-lk-muted-foreground">
            DukanOS Lime design system — tokens follow the light (:root) and dark (.dark) palettes exactly.
          </footer>
        </div>
      </div>
    </div>
  );
}
