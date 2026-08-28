'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  ShoppingCart,
  User,
  UserPlus,
  Printer,
  CheckCircle2,
  ArrowRight,
  X,
  Barcode,
  Minus,
  Plus,
  Trash2,
  AlertTriangle,
  AlertCircle,
  Store,
  Wallet,
  Undo2,
  Wifi,
  WifiOff,
  Receipt,
} from 'lucide-react';
import { createSaleAction } from '@/app/actions/sale.actions';
import { createCustomerAction } from '@/app/actions/customer.actions';
import { usePWA } from '@/components/pwa/pwa-provider';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import {
  saveCatalogToCache,
  getCachedCatalog,
  enqueueSyncTransaction,
  QueuedTransaction,
} from '@/lib/offline/db';
import { notifySyncStateChange } from '@/lib/offline/sync-manager';
import { cn } from '@/components/ui/cn';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { Button, buttonClasses, IconButton } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { inputClasses, Select } from '@/components/ui/input';
import { useTranslation } from '@/lib/i18n/language-context';
import type { POSProduct, POSCustomer, CartItem } from './pos-terminal';

type CompletedSale = {
  id: string;
  invoiceNumber: string;
  total: number | string;
  paidAmount: number | string;
  isOffline?: boolean;
  [key: string]: unknown;
};

export function POSCheckoutScreen({
  businessId,
  businessName,
  currency = 'PKR',
  initialProducts,
  initialCustomers,
}: {
  businessId: string;
  businessName: string;
  currency?: string;
  initialProducts: POSProduct[];
  initialCustomers: POSCustomer[];
}) {
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { networkStatus } = usePWA();
  const { t, tm, formatCurrency } = useTranslation();

  const fmt = (n: number) => formatCurrency(n);

  const searchInputId = useId();
  const customerId = useId();
  const globalDiscountId = useId();
  const paidAmountId = useId();
  const newCustomerNameId = useId();
  const newCustomerPhoneId = useId();
  const newCustomerAddressId = useId();

  const [products, setProducts] = useState<POSProduct[]>(initialProducts);
  const [customers, setCustomers] = useState<POSCustomer[]>(initialCustomers);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [globalDiscount, setGlobalDiscount] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH');

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState<boolean>(false);
  const [newCustomerName, setNewCustomerName] = useState<string>('');
  const [newCustomerPhone, setNewCustomerPhone] = useState<string>('');
  const [newCustomerAddress, setNewCustomerAddress] = useState<string>('');
  const [customerModalLoading, setCustomerModalLoading] = useState<boolean>(false);

  const [isCancelModalOpen, setIsCancelModalOpen] = useState<boolean>(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [completedSale, setCompletedSale] = useState<CompletedSale | null>(null);

  const [mobileTab, setMobileTab] = useState<'products' | 'order'>('products');

  useEffect(() => {
    searchInputRef.current?.focus();

    if (initialProducts.length > 0) {
      saveCatalogToCache(businessId, initialProducts);
    } else {
      getCachedCatalog(businessId).then((cached) => {
        if (cached.length > 0) {
          setProducts(cached);
        }
      });
    }
  }, [businessId, initialProducts]);

  const categories = Array.from(
    new Set(products.map((p) => p.category?.name).filter(Boolean))
  ) as string[];

  const filteredProducts = products.filter((p) => {
    const matchesCategory =
      selectedCategory === 'ALL' || p.category?.name === selectedCategory;
    if (!matchesCategory) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.barcode && p.barcode.toLowerCase().includes(q))
    );
  });

  const handleAddToCart = (product: POSProduct) => {
    if (product.currentStock <= 0) {
      setError(t('pos.productOutOfStockError', { name: product.name }));
      return;
    }

    setError(null);
    const existingIndex = cart.findIndex((item) => item.product.id === product.id);

    if (existingIndex > -1) {
      const existing = cart[existingIndex];
      if (existing.quantity + 1 > product.currentStock) {
        setError(t('pos.onlyUnitsAvailable', { qty: product.currentStock, name: product.name }));
        return;
      }

      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      setCart(updated);
    } else {
      setCart([
        ...cart,
        {
          product,
          quantity: 1,
          sellingPrice: product.sellingPrice,
          discount: 0,
        },
      ]);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const q = searchQuery.trim().toLowerCase();
      if (!q) return;

      const exactBarcode = products.find(
        (p) => p.barcode && p.barcode.toLowerCase() === q
      );
      if (exactBarcode) {
        handleAddToCart(exactBarcode);
        setSearchQuery('');
        return;
      }

      const exactSku = products.find(
        (p) => p.sku && p.sku.toLowerCase() === q
      );
      if (exactSku) {
        handleAddToCart(exactSku);
        setSearchQuery('');
        return;
      }

      if (filteredProducts.length === 1) {
        handleAddToCart(filteredProducts[0]);
        setSearchQuery('');
      }
    }
  };

  const handleUpdateQuantity = (productId: string, newQty: number) => {
    const updated = cart
      .map((item) => {
        if (item.product.id === productId) {
          if (newQty <= 0) return null;
          if (newQty > item.product.currentStock) {
            setError(t('pos.onlyUnitsInStock', { qty: item.product.currentStock }));
            return item;
          }
          return { ...item, quantity: newQty };
        }
        return item;
      })
      .filter(Boolean) as CartItem[];

    setCart(updated);
  };

  const handleUpdateLineDiscount = (productId: string, disc: number) => {
    setCart(
      cart.map((item) =>
        item.product.id === productId
          ? { ...item, discount: Math.max(0, disc) }
          : item
      )
    );
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.product.id !== productId));
  };

  const handleCancelSale = () => {
    setCart([]);
    setGlobalDiscount(0);
    setPaidAmount('');
    setSelectedCustomerId('');
    setError(null);
    setIsCancelModalOpen(false);
    setMobileTab('products');
    searchInputRef.current?.focus();
  };

  const rawSubtotal = cart.reduce(
    (sum, item) => sum + Math.max(0, item.sellingPrice * item.quantity - item.discount),
    0
  );
  const grandTotal = Math.max(0, rawSubtotal - (globalDiscount || 0));

  const parsedPaid = paidAmount === '' ? grandTotal : parseFloat(paidAmount) || 0;
  const dueBalance = Math.max(0, grandTotal - parsedPaid);
  const changeDue = Math.max(0, parsedPaid - grandTotal);

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  const isPaid = completedSale !== null && Number(completedSale.total) <= Number(completedSale.paidAmount);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName.trim()) return;

    setCustomerModalLoading(true);
    try {
      const res = await createCustomerAction(businessId, {
        name: newCustomerName.trim(),
        phone: newCustomerPhone.trim() || undefined,
        address: newCustomerAddress.trim() || undefined,
      });

      if (res.success && res.data) {
        const custData = res.data as { id: string; name: string; phone?: string | null; outstanding?: number | null };
        const created: POSCustomer = {
          id: custData.id,
          name: custData.name,
          phone: custData.phone,
          outstanding: Number(custData.outstanding || 0),
        };
        setCustomers([created, ...customers]);
        setSelectedCustomerId(created.id);
        setIsCustomerModalOpen(false);
        setNewCustomerName('');
        setNewCustomerPhone('');
        setNewCustomerAddress('');
      } else {
        setError(tm(res.message) || t('pos.createCustomerFailed'));
      }
    } catch {
      setError(t('pos.createCustomerError'));
    } finally {
      setCustomerModalLoading(false);
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (cart.length === 0) {
      setError(t('pos.cartEmptyError'));
      return;
    }

    if (dueBalance > 0 && !selectedCustomerId) {
      setError(t('pos.creditRequiresCustomer'));
      return;
    }

    setLoading(true);

    try {
      const clientTxId = crypto.randomUUID();

      const payload = {
        customerId: selectedCustomerId || null,
        items: cart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          sellingPrice: item.sellingPrice,
          discount: item.discount,
        })),
        discount: globalDiscount || 0,
        paidAmount: parsedPaid,
        paymentMethod: dueBalance > 0 && parsedPaid === 0 ? 'CREDIT' : paymentMethod,
        clientTransactionId: clientTxId,
      };

      if (networkStatus === 'OFFLINE') {
        const queuedItem: QueuedTransaction = {
          id: clientTxId,
          businessId,
          type: 'POS_SALE',
          payload,
          status: 'PENDING',
          createdAt: new Date().toISOString(),
          retryCount: 0,
          summary: {
            itemCount: cart.reduce((s, i) => s + i.quantity, 0),
            total: grandTotal,
            customerName: selectedCustomer?.name,
          },
        };

        await enqueueSyncTransaction(queuedItem);
        notifySyncStateChange();

        setCompletedSale({
          id: clientTxId,
          invoiceNumber: `OFFLINE-PENDING`,
          total: grandTotal,
          paidAmount: parsedPaid,
          isOffline: true,
        });

        handleCancelResetOnly();
        setLoading(false);
        return;
      }

      const res = await createSaleAction(businessId, payload);

      if (!res.success) {
        setError(tm(res.message) || t('pos.saleFailed'));
        setLoading(false);
        return;
      }

      setCompletedSale(res.data as CompletedSale);
      handleCancelResetOnly();
      router.refresh();
    } catch (err) {
      const e = err as Error;
      setError(tm(e.message) || t('pos.unexpectedSaleError'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancelResetOnly = () => {
    setCart([]);
    setGlobalDiscount(0);
    setPaidAmount('');
    setSelectedCustomerId('');
  };

  return (
    <div className="-m-4 flex min-h-full flex-col bg-page md:-m-8">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-border bg-surface">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-on-primary" aria-hidden="true">
              <Store className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold leading-tight text-gray-900">{t('pos.checkoutTitle')}</h1>
              <p className="truncate text-xs text-muted">{businessName}</p>
            </div>
            <Badge tone={networkStatus === 'OFFLINE' ? 'warning' : 'success'} className="hidden sm:inline-flex">
              {networkStatus === 'OFFLINE' ? (
                <>
                  <WifiOff className="h-3 w-3" aria-hidden="true" />
                  {t('pos.offline')}
                </>
              ) : (
                <>
                  <Wifi className="h-3 w-3" aria-hidden="true" />
                  {t('pos.online')}
                </>
              )}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/dashboard/sales" className={buttonClasses('outline', 'sm', 'hidden sm:inline-flex')}>
              <Receipt className="h-3.5 w-3.5 rtl-flip" aria-hidden="true" />
              {t('pos.salesLink')}
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1600px] flex-1 space-y-4 p-4 sm:p-6">
        {/* Offline banner */}
        {networkStatus === 'OFFLINE' && (
          <Alert tone="warning" title={t('pos.offlineTitle')}>
            <p className="text-xs">{t('pos.offlineDescription')}</p>
          </Alert>
        )}

        {/* Checkout / validation errors */}
        {error && (
          <div
            role="alert"
            className="flex items-center gap-3 rounded-card border border-danger/25 bg-danger-soft p-3 text-sm text-danger"
          >
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <p className="flex-1 font-medium">{error}</p>
            <IconButton aria-label={t('pos.dismissError')} size="sm" onClick={() => setError(null)} className="-my-1 shrink-0">
              <X className="h-4 w-4" />
            </IconButton>
          </div>
        )}

        {/* Mobile tab switcher */}
        <div className="grid grid-cols-2 gap-1 rounded-input border border-border bg-surface p-1 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileTab('products')}
            aria-pressed={mobileTab === 'products'}
            className={cn(
              'flex h-10 items-center justify-center rounded-md text-sm font-semibold transition-colors',
              mobileTab === 'products' ? 'bg-primary text-on-primary' : 'text-muted hover:text-gray-900'
            )}
          >
            {t('pos.itemsTab', { count: filteredProducts.length })}
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('order')}
            aria-pressed={mobileTab === 'order'}
            className={cn(
              'flex h-10 items-center justify-center gap-1.5 rounded-md text-sm font-semibold transition-colors',
              mobileTab === 'order' ? 'bg-primary text-on-primary' : 'text-muted hover:text-gray-900'
            )}
          >
            <ShoppingCart className="h-4 w-4" aria-hidden="true" />
            {t('pos.orderTab', { count: cartCount, amount: fmt(grandTotal) })}
          </button>
        </div>

        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
          {/* Left: Item list */}
          <section
            aria-label={t('pos.productCatalogAria')}
            className={cn('space-y-4 lg:col-span-7 xl:col-span-8', mobileTab === 'order' ? 'hidden lg:block' : 'block')}
          >
            <div className="space-y-3 rounded-card border border-border bg-surface p-4">
              <div className="relative">
                <Barcode
                  className="pointer-events-none absolute start-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted"
                  aria-hidden="true"
                />
                <input
                  ref={searchInputRef}
                  id={searchInputId}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder={t('pos.searchProduct')}
                  aria-label={t('pos.searchAria')}
                  className={inputClasses(false, 'h-12 rounded-xl bg-page ps-10 text-base font-medium')}
                />
                {searchQuery && (
                  <IconButton
                    aria-label={t('pos.clearSearchAria')}
                    size="sm"
                    onClick={() => setSearchQuery('')}
                    className="absolute end-2 top-1/2 -translate-y-1/2"
                  >
                    <X className="h-4 w-4" />
                  </IconButton>
                )}
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1" role="group" aria-label={t('pos.filterByCategoryAria')}>
                <button
                  type="button"
                  onClick={() => setSelectedCategory('ALL')}
                  aria-pressed={selectedCategory === 'ALL'}
                  className={cn(
                    'flex h-9 shrink-0 items-center rounded-full px-4 text-xs font-semibold transition-colors',
                    selectedCategory === 'ALL'
                      ? 'bg-primary text-on-primary'
                      : 'border border-border bg-page text-gray-700 hover:border-primary/40 hover:text-primary'
                  )}
                >
                  {t('pos.allCategories')}
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    aria-pressed={selectedCategory === cat}
                    className={cn(
                      'flex h-9 shrink-0 items-center rounded-full px-4 text-xs font-semibold transition-colors',
                      selectedCategory === cat
                        ? 'bg-primary text-on-primary'
                        : 'border border-border bg-page text-gray-700 hover:border-primary/40 hover:text-primary'
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {filteredProducts.length === 0 ? (
                <div className="col-span-full rounded-card border border-border bg-surface py-16 text-center">
                  <Search className="mx-auto mb-2 h-8 w-8 text-muted opacity-60" aria-hidden="true" />
                  <p className="text-sm font-medium text-muted">
                    {products.length === 0
                      ? t('pos.noActiveProducts')
                      : t('pos.noMatchingProducts')}
                  </p>
                </div>
              ) : (
                filteredProducts.map((product) => {
                  const isOutOfStock = product.currentStock <= 0;
                  const inCartItem = cart.find((i) => i.product.id === product.id);
                  const stockTone = isOutOfStock ? 'danger' : product.currentStock <= 5 ? 'warning' : 'success';

                  return (
                    <button
                      key={product.id}
                      type="button"
                      disabled={isOutOfStock}
                      onClick={() => handleAddToCart(product)}
                      aria-label={
                        isOutOfStock
                          ? t('pos.outOfStockAria', { name: product.name })
                          : t('pos.addToCartAria', { name: product.name, price: fmt(product.sellingPrice) })
                      }
                      className={cn(
                        'group relative flex min-h-[120px] flex-col justify-between rounded-xl border p-3.5 text-start transition-colors',
                        isOutOfStock
                          ? 'cursor-not-allowed border-border bg-page opacity-60'
                          : 'border-border bg-surface hover:border-primary focus-visible:border-primary active:scale-[0.98]'
                      )}
                    >
                      {inCartItem && (
                        <span className="absolute end-2.5 top-2.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-on-primary">
                          {inCartItem.quantity}
                        </span>
                      )}

                      <span className="min-w-0">
                        <span className="line-clamp-2 block text-sm font-semibold leading-tight text-gray-900">
                          {product.name}
                        </span>
                        <span className="mt-1 block truncate font-mono text-xs text-muted">
                          {product.sku || (product.barcode ? `BC: ${product.barcode}` : '—')}
                        </span>
                      </span>

                      <span className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-2">
                        <span className="text-sm font-bold text-primary">{fmt(product.sellingPrice)}</span>
                        <Badge tone={stockTone} className="px-2 py-0">
                          {isOutOfStock ? t('pos.outOfStock') : `${product.currentStock} ${product.unit}`}
                        </Badge>
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </section>

          {/* Right: Order summary */}
          <section
            aria-label={t('pos.orderSummary')}
            className={cn(
              'flex flex-col overflow-hidden rounded-card border border-border bg-surface lg:sticky lg:col-span-5 lg:top-20 xl:col-span-4',
              mobileTab === 'products' ? 'hidden lg:flex' : 'flex'
            )}
          >
            <div className="flex items-center justify-between border-b border-border bg-primary-soft/60 px-4 py-3">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary" aria-hidden="true" />
                <h2 className="text-base font-bold text-gray-900">
                  {t('pos.orderSummary')}
                </h2>
              </div>
              <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-on-primary">
                {t('pos.itemsCount', { count: cartCount })}
              </span>
            </div>

            {/* Customer */}
            <div className="space-y-2 border-b border-border px-4 py-3">
              <div className="flex items-center justify-between">
                <label htmlFor={customerId} className="flex items-center gap-1.5 text-xs font-semibold text-muted-strong">
                  <User className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
                  {t('pos.selectCustomer')}
                </label>
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(true)}
                  className="flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-primary hover:bg-primary-soft"
                >
                  <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                  {t('customers.addCustomer')}
                </button>
              </div>

              <Select
                id={customerId}
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="bg-page"
              >
                <option value="">-- {t('pos.walkInCustomer')} --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone ? `(${c.phone})` : ''} — {t('pos.udhaar')}: {fmt(c.outstanding)}
                  </option>
                ))}
              </Select>

              {selectedCustomer && selectedCustomer.outstanding > 0 && (
                <p className="flex justify-between rounded-input border border-warning/25 bg-warning-soft p-2 text-xs font-medium text-warning">
                  <span>{t('pos.customerBalance')}:</span>
                  <span className="font-bold">{fmt(selectedCustomer.outstanding)}</span>
                </p>
              )}
            </div>

            {/* Line items */}
            <div className="max-h-[300px] flex-1 divide-y divide-border overflow-y-auto px-2 py-1">
              {cart.length === 0 ? (
                <div className="py-14 text-center text-muted">
                  <ShoppingCart className="mx-auto mb-2 h-8 w-8 opacity-50" aria-hidden="true" />
                  <p className="text-sm">{t('pos.cartEmptySubtitle')}</p>
                </div>
              ) : (
                cart.map((item) => {
                  const lineTotal = Math.max(0, item.sellingPrice * item.quantity - item.discount);

                  return (
                    <div key={item.product.id} className="space-y-2 rounded-card p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-sm font-semibold text-gray-900">{item.product.name}</h3>
                          <p className="font-mono text-xs text-muted">
                            {fmt(item.sellingPrice)} / {item.product.unit}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-gray-900">{fmt(lineTotal)}</span>
                          <IconButton
                            aria-label={t('pos.removeFromCartAria', { name: item.product.name })}
                            size="md"
                            onClick={() => handleRemoveFromCart(item.product.id)}
                            className="text-muted hover:bg-danger-soft hover:text-danger"
                          >
                            <Trash2 className="h-4 w-4" />
                          </IconButton>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1 rounded-input border border-border bg-page p-0.5">
                          <IconButton
                            aria-label={t('pos.decreaseQtyAria', { name: item.product.name })}
                            size="md"
                            onClick={() => handleUpdateQuantity(item.product.id, item.quantity - 1)}
                            className="h-9 w-9"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </IconButton>
                          <label className="sr-only" htmlFor={`qty-${item.product.id}`}>
                            {t('pos.qty')} {item.product.name}
                          </label>
                          <input
                            id={`qty-${item.product.id}`}
                            type="number"
                            min="1"
                            max={item.product.currentStock}
                            value={item.quantity}
                            onChange={(e) =>
                              handleUpdateQuantity(item.product.id, parseInt(e.target.value) || 1)
                            }
                            className="w-12 bg-transparent text-center text-sm font-bold text-gray-900 focus:outline-none"
                          />
                          <IconButton
                            aria-label={t('pos.increaseQtyAria', { name: item.product.name })}
                            size="md"
                            onClick={() => handleUpdateQuantity(item.product.id, item.quantity + 1)}
                            className="h-9 w-9"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </IconButton>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <label htmlFor={`disc-${item.product.id}`} className="text-muted">
                            {t('pos.discount')}:
                          </label>
                          <input
                            id={`disc-${item.product.id}`}
                            type="number"
                            min="0"
                            value={item.discount || ''}
                            placeholder="0"
                            onChange={(e) =>
                              handleUpdateLineDiscount(item.product.id, parseFloat(e.target.value) || 0)
                            }
                            className="w-16 rounded-md border border-border bg-page px-1.5 py-2 text-end focus:outline-none focus:ring-2 focus:ring-focus-ring"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Totals + payment + actions */}
            <form onSubmit={handleCheckout} className="space-y-3 border-t border-border bg-page px-4 py-4" aria-label={t('pos.checkoutTitle')}>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-muted">
                  <span>{t('pos.subtotal')}</span>
                  <span className="font-semibold text-gray-900">{fmt(rawSubtotal)}</span>
                </div>

                <div className="flex items-center justify-between">
                  <label htmlFor={globalDiscountId} className="text-muted">
                    {t('pos.discount')}
                  </label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted" aria-hidden="true">- {t('common.pkr')}</span>
                    <input
                      id={globalDiscountId}
                      type="number"
                      min="0"
                      value={globalDiscount || ''}
                      placeholder="0"
                      onChange={(e) => setGlobalDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-24 rounded-md border border-border-strong bg-surface px-2 py-2 text-end text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-focus-ring"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-surface px-3 py-2.5">
                  <span className="text-base font-bold text-gray-900">{t('pos.grandTotal')}</span>
                  <span className="text-2xl font-bold tracking-tight text-primary">{fmt(grandTotal)}</span>
                </div>
              </div>

              {/* Payment method */}
              <fieldset>
                <legend className="sr-only">{t('pos.paymentMethod')}</legend>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['CASH', 'CARD', 'MOBILE_WALLET'] as const).map((method) => {
                    const methodLabel =
                      method === 'CASH'
                        ? t('pos.cash')
                        : method === 'CARD'
                        ? t('pos.card')
                        : t('pos.walletPayment');

                    return (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method)}
                        aria-pressed={paymentMethod === method}
                        className={cn(
                          'h-10 rounded-lg border text-xs font-semibold transition-colors',
                          paymentMethod === method
                            ? 'border-primary bg-primary-soft text-primary'
                            : 'border-border-strong bg-surface text-gray-700 hover:border-primary/40'
                        )}
                      >
                        {methodLabel}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              {/* Amount received */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label htmlFor={paidAmountId} className="text-xs font-semibold text-muted-strong">
                    {t('pos.cashReceived')}
                  </label>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPaidAmount(grandTotal.toString())}
                      className={buttonClasses('secondary', 'sm', 'h-9')}
                    >
                      {t('pos.exactAmountBtn', { amount: fmt(grandTotal) })}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaidAmount('0')}
                      className={buttonClasses('outline', 'sm', 'h-9 border-warning/40 bg-warning-soft text-warning hover:bg-warning-soft')}
                    >
                      {t('pos.fullCreditBtn', { amount: fmt(0) })}
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-xs text-muted" aria-hidden="true">
                    {t('common.pkr')}
                  </span>
                  <input
                    id={paidAmountId}
                    type="number"
                    min="0"
                    step="0.01"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    placeholder={grandTotal.toString()}
                    className={inputClasses(false, 'h-12 bg-surface ps-12 text-base font-bold')}
                  />
                </div>
              </div>

              {/* Due / change preview */}
              {dueBalance > 0 ? (
                <div className="flex justify-between rounded-input border border-warning/25 bg-warning-soft p-2.5 text-xs font-bold text-warning">
                  <span>{t('pos.udhaarAddedPreview')}</span>
                  <span>{fmt(dueBalance)}</span>
                </div>
              ) : changeDue > 0 ? (
                <div className="flex justify-between rounded-input border border-success/25 bg-success-soft p-2.5 text-xs font-bold text-success">
                  <span>{t('pos.changeDue')}:</span>
                  <span>{fmt(changeDue)}</span>
                </div>
              ) : null}

              {/* Action buttons */}
              <div className="space-y-2 pt-1">
                <Button type="submit" size="lg" loading={loading} disabled={cart.length === 0} className="h-12 w-full text-base font-bold">
                  {loading ? (
                    t('pos.processing')
                  ) : (
                    <>
                      <Wallet className="h-5 w-5" aria-hidden="true" />
                      <span>{t('pos.pay')} • {fmt(grandTotal)}</span>
                    </>
                  )}
                </Button>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={cart.length === 0}
                    onClick={() => setIsCancelModalOpen(true)}
                    className="h-11 text-sm font-bold"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                    {t('common.cancel')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsRefundModalOpen(true)}
                    className="h-11 border-danger/30 text-sm font-bold text-danger hover:bg-danger-soft"
                  >
                    <Undo2 className="h-4 w-4 rtl-flip" aria-hidden="true" />
                    {t('pos.refund')}
                  </Button>
                </div>
              </div>
            </form>
          </section>
        </div>
      </main>

      {/* Cancel confirmation modal */}
      <Modal
        open={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title={t('common.cancel')}
        description={t('pos.cancelConfirmDescription')}
        size="sm"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setIsCancelModalOpen(false)}>
              {t('pos.keepOrder')}
            </Button>
            <Button type="button" variant="destructive" onClick={handleCancelSale}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              {t('pos.discardOrder')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          {t('pos.cancelConfirmBody', { count: cartCount })}
        </p>
      </Modal>

      {/* Refund modal */}
      <Modal
        open={isRefundModalOpen}
        onClose={() => setIsRefundModalOpen(false)}
        title={t('pos.refund')}
        description={t('pos.refundModalDescription')}
        size="sm"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setIsRefundModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Link href="/dashboard/sales" onClick={() => setIsRefundModalOpen(false)} className={buttonClasses('primary', 'md')}>
              <Receipt className="h-4 w-4" aria-hidden="true" />
              {t('pos.openSalesInvoices')}
            </Link>
          </>
        }
      >
        <p className="text-sm text-muted">
          {t('pos.refundModalBody')}
        </p>
      </Modal>

      {/* Quick customer creation modal */}
      <Modal
        open={isCustomerModalOpen}
        onClose={() => {
          if (!customerModalLoading) setIsCustomerModalOpen(false);
        }}
        title={t('customers.addCustomer')}
        description={t('pos.newCustomerDescription')}
      >
        <form onSubmit={handleCreateCustomer} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor={newCustomerNameId} className="block text-sm font-medium text-gray-700">
              {t('customers.customerName')}
              <span className="ms-0.5 text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id={newCustomerNameId}
              required
              type="text"
              value={newCustomerName}
              onChange={(e) => setNewCustomerName(e.target.value)}
              placeholder={t('pos.namePlaceholderExample')}
              className={inputClasses()}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor={newCustomerPhoneId} className="block text-sm font-medium text-gray-700">
              {t('customers.phoneNumber')}
            </label>
            <input
              id={newCustomerPhoneId}
              type="text"
              value={newCustomerPhone}
              onChange={(e) => setNewCustomerPhone(e.target.value)}
              placeholder={t('pos.phonePlaceholderExample')}
              className={inputClasses()}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor={newCustomerAddressId} className="block text-sm font-medium text-gray-700">
              {t('common.address')}
            </label>
            <input
              id={newCustomerAddressId}
              type="text"
              value={newCustomerAddress}
              onChange={(e) => setNewCustomerAddress(e.target.value)}
              placeholder={t('pos.addressPlaceholderExample')}
              className={inputClasses()}
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              disabled={customerModalLoading}
              onClick={() => setIsCustomerModalOpen(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" loading={customerModalLoading}>
              {customerModalLoading ? t('common.saving') : t('pos.saveAndSelect')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Paid confirmation modal */}
      <Modal
        open={Boolean(completedSale)}
        onClose={() => {
          setCompletedSale(null);
          searchInputRef.current?.focus();
        }}
        title={completedSale?.isOffline ? t('pos.saleQueuedOffline') : t('pos.saleCompletedTitle')}
        description={completedSale ? `${t('pos.invoiceNumber')} ${completedSale.invoiceNumber}` : undefined}
        footer={
          completedSale && (
            <>
              {!completedSale.isOffline && (
                <Link
                  href={`/dashboard/sales/${completedSale.id}`}
                  className={buttonClasses('secondary', 'md')}
                >
                  <Printer className="h-4 w-4" aria-hidden="true" />
                  {t('pos.printReceipt')}
                </Link>
              )}
              <Button
                type="button"
                onClick={() => {
                  setCompletedSale(null);
                  searchInputRef.current?.focus();
                }}
              >
                {t('pos.nextSale')}
                <ArrowRight className="h-4 w-4 rtl-flip" aria-hidden="true" />
              </Button>
            </>
          )
        }
      >
        {completedSale && (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-2">
              <span
                className={cn(
                  'flex h-14 w-14 items-center justify-center rounded-full',
                  completedSale.isOffline ? 'bg-warning-soft text-warning' : 'bg-success-soft text-success'
                )}
                aria-hidden="true"
              >
                {completedSale.isOffline ? (
                  <AlertTriangle className="h-7 w-7" />
                ) : (
                  <CheckCircle2 className="h-7 w-7" />
                )}
              </span>
              {!completedSale.isOffline && (
                <Badge tone="success" className="px-3 py-1 text-sm font-bold uppercase tracking-wide">
                  {isPaid ? t('common.paid') : t('pos.partialPayment')}
                </Badge>
              )}
            </div>

            {completedSale.isOffline && (
              <Alert tone="warning" className="p-3 text-xs">
                {t('pos.offlineSaleNotice')}
              </Alert>
            )}

            <dl className="space-y-2 text-sm">
              <div className="flex justify-between text-muted">
                <dt>{t('common.total')}</dt>
                <dd className="font-bold text-gray-900">{fmt(Number(completedSale.total))}</dd>
              </div>
              <div className="flex justify-between text-muted">
                <dt>{t('pos.amountPaid')}</dt>
                <dd className="font-semibold text-success">{fmt(Number(completedSale.paidAmount))}</dd>
              </div>
              {Number(completedSale.total) > Number(completedSale.paidAmount) && (
                <div className="flex justify-between border-t border-border pt-2 font-bold text-warning">
                  <dt>{t('pos.addedToUdhaar')}</dt>
                  <dd>{fmt(Number(completedSale.total) - Number(completedSale.paidAmount))}</dd>
                </div>
              )}
            </dl>
          </div>
        )}
      </Modal>
    </div>
  );
}
