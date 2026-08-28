'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
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
} from 'lucide-react';
import { createSaleAction } from '@/app/actions/sale.actions';
import { createCustomerAction } from '@/app/actions/customer.actions';
import Link from 'next/link';
import { usePWA } from '@/components/pwa/pwa-provider';
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

export type POSProduct = {
  id: string;
  name: string;
  nameEn?: string | null;
  nameUr?: string | null;
  sku?: string | null;
  barcode?: string | null;
  unit: string;
  purchasePrice: number;
  sellingPrice: number;
  currentStock: number;
  category?: { id: string; name: string; nameEn?: string | null; nameUr?: string | null } | null;
};

export type POSCustomer = {
  id: string;
  name: string;
  phone?: string | null;
  outstanding: number;
};

export type CartItem = {
  product: POSProduct;
  quantity: number;
  sellingPrice: number;
  discount: number;
};

type CompletedSale = {
  id: string;
  invoiceNumber: string;
  total: number | string;
  paidAmount: number | string;
  isOffline?: boolean;
  [key: string]: unknown;
};

export function POSTerminal({
  businessId,
  currency = 'PKR',
  initialProducts,
  initialCustomers,
}: {
  businessId: string;
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

  // Data state
  const [products, setProducts] = useState<POSProduct[]>(initialProducts);
  const [customers, setCustomers] = useState<POSCustomer[]>(initialCustomers);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [globalDiscount, setGlobalDiscount] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // UI Modals
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState<boolean>(false);
  const [newCustomerName, setNewCustomerName] = useState<string>('');
  const [newCustomerPhone, setNewCustomerPhone] = useState<string>('');
  const [newCustomerAddress, setNewCustomerAddress] = useState<string>('');
  const [customerModalLoading, setCustomerModalLoading] = useState<boolean>(false);

  // Checkout State
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [completedSale, setCompletedSale] = useState<CompletedSale | null>(null);

  // Idempotency key for the current checkout attempt. Generated once per
  // attempt and REUSED across retries so a double-submit or network retry
  // replays against the same clientTransactionId instead of creating a
  // duplicate sale (server-side replay + unique index resolve it safely).
  const pendingClientTxIdRef = useRef<string | null>(null);

  // Mobile View Tab ('products' | 'cart' | 'checkout')
  const [mobileTab, setMobileTab] = useState<'products' | 'cart' | 'checkout'>('products');

  // Focus search bar on mount and cache catalog in IndexedDB
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

  // Categories list
  const categories = Array.from(
    new Set(products.map((p) => p.category?.name).filter(Boolean))
  ) as string[];

  // Filter products by search and category
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

  // Add Product to Cart
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

  // Barcode / Fast Keydown Enter Handler
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const q = searchQuery.trim().toLowerCase();
      if (!q) return;

      // Check exact barcode match first
      const exactBarcode = products.find(
        (p) => p.barcode && p.barcode.toLowerCase() === q
      );
      if (exactBarcode) {
        handleAddToCart(exactBarcode);
        setSearchQuery('');
        return;
      }

      // Check exact SKU match
      const exactSku = products.find(
        (p) => p.sku && p.sku.toLowerCase() === q
      );
      if (exactSku) {
        handleAddToCart(exactSku);
        setSearchQuery('');
        return;
      }

      // If only 1 product matches filter, auto add
      if (filteredProducts.length === 1) {
        handleAddToCart(filteredProducts[0]);
        setSearchQuery('');
      }
    }
  };

  // Cart Adjustments
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

  const handleUpdateLinePrice = (productId: string, price: number) => {
    setCart(
      cart.map((item) =>
        item.product.id === productId
          ? { ...item, sellingPrice: Math.max(0, price) }
          : item
      )
    );
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

  const handleClearCart = () => {
    setCart([]);
    setGlobalDiscount(0);
    setPaidAmount('');
    setSelectedCustomerId('');
    setError(null);
  };

  // Calculations
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

  // Quick Customer Creation
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

  // Checkout Execution
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
      if (!pendingClientTxIdRef.current) {
        pendingClientTxIdRef.current = crypto.randomUUID();
      }
      const clientTxId = pendingClientTxIdRef.current;

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

      // 1. Offline Mode: Enqueue to IndexedDB Sync Queue
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

        // Transaction safely queued for sync — release the idempotency key so
        // the next checkout starts a fresh one (the queue replays with its own
        // stored id via sync-manager).
        pendingClientTxIdRef.current = null;

        // Display offline receipt
        setCompletedSale({
          id: clientTxId,
          invoiceNumber: `OFFLINE-PENDING`,
          saleDate: new Date(),
          subtotal: rawSubtotal,
          discount: globalDiscount,
          total: grandTotal,
          paidAmount: parsedPaid,
          paymentMethod: dueBalance > 0 && parsedPaid === 0 ? 'CREDIT' : paymentMethod,
          status: 'OFFLINE_PENDING',
          isOffline: true,
          items: cart.map((item) => ({
            id: `temp-${item.product.id}`,
            productId: item.product.id,
            product: item.product,
            quantity: item.quantity,
            sellingPrice: item.sellingPrice,
            discount: item.discount,
            lineTotal: item.sellingPrice * item.quantity - item.discount,
          })),
          customer: selectedCustomer,
        });

        handleClearCart();
        setLoading(false);
        return;
      }

      // 2. Online Mode: Direct Server Action Execution
      const res = await createSaleAction(businessId, payload);

      if (!res.success) {
        setError(tm(res.message) || t('pos.saleFailed'));
        setLoading(false);
        return;
      }

      setCompletedSale(res.data as CompletedSale);
      // Sale committed — release the idempotency key for the next attempt.
      pendingClientTxIdRef.current = null;
      handleClearCart();
      router.refresh();
    } catch (err) {
      const e = err as Error;
      setError(tm(e.message) || t('pos.unexpectedSaleError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Offline Status Warning Banner */}
      {networkStatus === 'OFFLINE' && (
        <Alert tone="warning" title={t('pos.offlineTitle')}>
          <p className="text-xs">{t('pos.offlineDescription')}</p>
        </Alert>
      )}

      {/* Checkout / validation errors */}
      {error && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-card border border-red-200 bg-danger-soft p-3 text-sm text-red-900"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-danger" aria-hidden="true" />
          <p className="flex-1">{error}</p>
          <IconButton aria-label={t('pos.dismissError')} size="sm" onClick={() => setError(null)} className="-my-1 shrink-0">
            <X className="h-4 w-4" />
          </IconButton>
        </div>
      )}

      {/* Mobile Tab Switcher */}
      <div className="grid grid-cols-2 gap-1 rounded-input border border-border bg-gray-100 p-1 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileTab('products')}
          aria-pressed={mobileTab === 'products'}
          className={cn(
            'flex h-10 items-center justify-center rounded-md text-sm font-semibold transition-colors',
            mobileTab === 'products' ? 'bg-white text-primary shadow-card' : 'text-gray-600 hover:text-gray-900'
          )}
        >
          {t('pos.catalogTab', { count: filteredProducts.length })}
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('cart')}
          aria-pressed={mobileTab === 'cart'}
          className={cn(
            'flex h-10 items-center justify-center gap-1.5 rounded-md text-sm font-semibold transition-colors',
            mobileTab === 'cart' ? 'bg-white text-primary shadow-card' : 'text-gray-600 hover:text-gray-900'
          )}
        >
          <ShoppingCart className="h-4 w-4" aria-hidden="true" />
          {t('pos.cartTab', { count: cartCount, amount: fmt(grandTotal) })}
        </button>
      </div>

      {/* Main POS Interface Grid */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* Left Column: Product Search & Catalog */}
        <section
          aria-label={t('pos.productCatalogAria')}
          className={cn('space-y-4 lg:col-span-7', mobileTab === 'cart' ? 'hidden lg:block' : 'block')}
        >
          {/* Barcode & Search Bar */}
          <div className="space-y-3 rounded-card border border-border bg-surface p-4 shadow-card">
            <div className="relative">
              <Barcode
                className="pointer-events-none absolute start-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
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
                className={inputClasses(false, 'bg-gray-50 ps-10 font-medium focus:bg-white')}
              />
              {searchQuery && (
                <IconButton
                  aria-label={t('pos.clearSearchAria')}
                  size="sm"
                  onClick={() => setSearchQuery('')}
                  className="absolute end-1.5 top-1/2 -translate-y-1/2"
                >
                  <X className="h-4 w-4" />
                </IconButton>
              )}
            </div>

            {/* Category Filter Badges */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1" role="group" aria-label={t('pos.filterByCategoryAria')}>
              <button
                type="button"
                onClick={() => setSelectedCategory('ALL')}
                aria-pressed={selectedCategory === 'ALL'}
                className={cn(
                  'flex h-9 shrink-0 items-center rounded-lg px-3 text-xs font-medium transition-colors',
                  selectedCategory === 'ALL'
                    ? 'bg-primary text-on-primary'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
                    'flex h-9 shrink-0 items-center rounded-lg px-3 text-xs font-medium transition-colors',
                    selectedCategory === cat
                      ? 'bg-primary text-on-primary'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Cards Grid */}
          <div className="grid grid-cols-2 gap-3 pe-1 sm:grid-cols-3 lg:max-h-[calc(100vh-260px)] lg:overflow-y-auto">
            {filteredProducts.length === 0 ? (
              <div className="col-span-full rounded-card border border-border bg-surface py-16 text-center shadow-card">
                <Search className="mx-auto mb-2 h-8 w-8 text-gray-300" aria-hidden="true" />
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
                      'group relative flex min-h-[112px] flex-col justify-between rounded-card border p-3.5 text-start transition-all',
                      isOutOfStock
                        ? 'cursor-not-allowed border-border bg-gray-50 opacity-60'
                        : 'border-border bg-surface shadow-card hover:border-primary hover:shadow-elevated active:scale-[0.98]'
                    )}
                  >
                    {inCartItem && (
                      <span className="absolute end-2 top-2 rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-on-primary shadow-card">
                        {inCartItem.quantity} {t('pos.inCart')}
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

                    <span className="mt-3 flex items-center justify-between gap-2 border-t border-gray-100 pt-2">
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

        {/* Right Column: Cart & Checkout */}
        <section
          aria-label={t('pos.cartAndCheckoutAria')}
          className={cn(
            'flex flex-col rounded-card border border-border bg-surface shadow-card lg:col-span-5',
            mobileTab === 'products' ? 'hidden lg:flex' : 'flex'
          )}
        >
          {/* Cart Header */}
          <div className="flex items-center justify-between border-b border-border p-4">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2 className="text-base font-bold text-gray-900">{t('pos.itemsInCart')}</h2>
              <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-bold text-primary">{cartCount}</span>
            </div>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={handleClearCart}
                className="min-h-10 rounded-lg px-2 text-xs font-semibold text-danger hover:bg-danger-soft"
              >
                {t('pos.clearCart')}
              </button>
            )}
          </div>

          {/* Customer Selection Bar */}
          <div className="space-y-2 border-b border-border bg-page p-4">
            <div className="flex items-center justify-between">
              <label htmlFor={customerId} className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                <User className="h-3.5 w-3.5 text-gray-500" aria-hidden="true" />
                {t('pos.selectCustomer')}
              </label>
              <button
                type="button"
                onClick={() => setIsCustomerModalOpen(true)}
                className="flex min-h-10 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-primary hover:bg-primary-soft"
              >
                <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                {t('customers.addCustomer')}
              </button>
            </div>

            <Select
              id={customerId}
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
            >
              <option value="">-- {t('pos.walkInCustomer')} --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `(${c.phone})` : ''} — {t('pos.udhaar')}: {fmt(c.outstanding)}
                </option>
              ))}
            </Select>

            {selectedCustomer && selectedCustomer.outstanding > 0 && (
              <p className="flex justify-between rounded-input border border-warning/25 bg-warning-soft p-2 text-xs font-medium text-amber-900">
                <span>{t('pos.customerBalance')}:</span>
                <span className="font-bold">{fmt(selectedCustomer.outstanding)}</span>
              </p>
            )}
          </div>

          {/* Cart Items List */}
          <div className="max-h-[320px] flex-1 divide-y divide-gray-100 overflow-y-auto p-2">
            {cart.length === 0 ? (
              <div className="py-16 text-center text-muted">
                <ShoppingCart className="mx-auto mb-2 h-8 w-8 opacity-50" aria-hidden="true" />
                <p className="text-sm">{t('pos.cartEmptySubtitle')}</p>
              </div>
            ) : (
              cart.map((item) => {
                const lineTotal = Math.max(0, item.sellingPrice * item.quantity - item.discount);

                return (
                  <div key={item.product.id} className="space-y-2 rounded-card p-3 transition-colors hover:bg-gray-50/60">
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
                          size="lg"
                          onClick={() => handleRemoveFromCart(item.product.id)}
                          className="text-gray-400 hover:bg-danger-soft hover:text-danger"
                        >
                          <Trash2 className="h-4 w-4" />
                        </IconButton>
                      </div>
                    </div>

                    {/* Quantity & Discount Controls */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                      <div className="flex items-center gap-1 rounded-input border border-border bg-white p-0.5">
                        <IconButton
                          aria-label={t('pos.decreaseQtyAria', { name: item.product.name })}
                          size="lg"
                          onClick={() => handleUpdateQuantity(item.product.id, item.quantity - 1)}
                          className="h-10 w-10 lg:h-8 lg:w-8"
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
                          className="w-12 text-center text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <IconButton
                          aria-label={t('pos.increaseQtyAria', { name: item.product.name })}
                          size="lg"
                          onClick={() => handleUpdateQuantity(item.product.id, item.quantity + 1)}
                          className="h-10 w-10 lg:h-8 lg:w-8"
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
                          className="w-16 rounded-md border border-border px-1.5 py-2 text-end focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Totals & Checkout Form */}
          <form onSubmit={handleCheckout} className="space-y-3 border-t border-border bg-page p-4" aria-label={t('pos.checkoutTitle')}>
            {/* Discount & Total */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>{t('pos.subtotal')}</span>
                <span className="font-semibold text-gray-900">{fmt(rawSubtotal)}</span>
              </div>

              <div className="flex items-center justify-between">
                <label htmlFor={globalDiscountId} className="text-gray-600">
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
                    className="w-24 rounded-md border border-border-strong bg-white px-2 py-2 text-end text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-border pt-3">
                <span className="text-base font-bold text-gray-900">{t('pos.grandTotal')}</span>
                <span className="text-2xl font-bold text-primary">{fmt(grandTotal)}</span>
              </div>
            </div>

            {/* Payment Mode Selector */}
            <div className="space-y-2 border-t border-border pt-3">
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
                            ? 'border-primary bg-primary text-on-primary shadow-card'
                            : 'border-border-strong bg-white text-gray-700 hover:bg-gray-100'
                        )}
                      >
                        {methodLabel}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              {/* Amount Paid Input with Quick Buttons */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label htmlFor={paidAmountId} className="text-xs font-semibold text-gray-700">
                    {t('pos.cashReceived')}
                  </label>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPaidAmount(grandTotal.toString())}
                      className={buttonClasses('secondary', 'sm', 'h-9 bg-gray-200 hover:bg-gray-300')}
                    >
                      {t('pos.exactAmountBtn', { amount: fmt(grandTotal) })}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaidAmount('0')}
                      className={buttonClasses('outline', 'sm', 'h-9 border-warning/40 bg-warning-soft text-amber-900 hover:bg-amber-100')}
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
                    className={inputClasses(false, 'ps-12 font-bold')}
                  />
                </div>
              </div>

              {/* Due / Change Preview */}
              {dueBalance > 0 ? (
                <div className="flex justify-between rounded-input border border-warning/25 bg-warning-soft p-2.5 text-xs font-bold text-amber-900">
                  <span>{t('pos.udhaarAddedPreview')}</span>
                  <span>{fmt(dueBalance)}</span>
                </div>
              ) : changeDue > 0 ? (
                <div className="flex justify-between rounded-input border border-success/25 bg-success-soft p-2.5 text-xs font-bold text-emerald-900">
                  <span>{t('pos.changeDue')}:</span>
                  <span>{fmt(changeDue)}</span>
                </div>
              ) : null}
            </div>

            {/* Complete Sale Button */}
            <Button type="submit" size="lg" loading={loading} disabled={cart.length === 0} className="w-full text-base font-bold">
              {loading ? (
                t('pos.completingSale')
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                  <span>{t('pos.completeSale')} • {fmt(grandTotal)}</span>
                </>
              )}
            </Button>
          </form>
        </section>
      </div>

      {/* Quick Customer Creation Modal */}
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

      {/* Completed Sale Receipt Modal */}
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
            <div className="flex justify-center">
              <span
                className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-full',
                  completedSale.isOffline ? 'bg-warning-soft text-warning' : 'bg-success-soft text-success'
                )}
                aria-hidden="true"
              >
                {completedSale.isOffline ? (
                  <AlertTriangle className="h-6 w-6" />
                ) : (
                  <CheckCircle2 className="h-6 w-6" />
                )}
              </span>
            </div>

            {completedSale.isOffline && (
              <Alert tone="warning" className="p-3 text-xs">
                {t('pos.offlineSaleNotice')}
              </Alert>
            )}

            <dl className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <dt>{t('common.total')}</dt>
                <dd className="font-bold text-gray-900">{fmt(Number(completedSale.total))}</dd>
              </div>
              <div className="flex justify-between text-gray-600">
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
