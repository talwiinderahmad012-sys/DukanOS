'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  User, 
  UserPlus, 
  CreditCard, 
  DollarSign, 
  Printer, 
  CheckCircle2, 
  AlertCircle, 
  Barcode, 
  Layers, 
  ArrowRight,
  X,
  Receipt,
  WifiOff,
  AlertTriangle
} from 'lucide-react';
import { createSaleAction } from '@/app/actions/sale.actions';
import { createCustomerAction } from '@/app/actions/customer.actions';
import Link from 'next/link';
import { usePWA } from '@/components/pwa/pwa-provider';
import { 
  saveCatalogToCache, 
  getCachedCatalog, 
  enqueueSyncTransaction, 
  QueuedTransaction 
} from '@/lib/offline/db';
import { notifySyncStateChange } from '@/lib/offline/sync-manager';

export type POSProduct = {
  id: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  unit: string;
  purchasePrice: number;
  sellingPrice: number;
  currentStock: number;
  category?: { id: string; name: string } | null;
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
  const [completedSale, setCompletedSale] = useState<any | null>(null);

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
      setError(`"${product.name}" is currently out of stock.`);
      return;
    }

    setError(null);
    const existingIndex = cart.findIndex((item) => item.product.id === product.id);

    if (existingIndex > -1) {
      const existing = cart[existingIndex];
      if (existing.quantity + 1 > product.currentStock) {
        setError(`Only ${product.currentStock} units available for "${product.name}".`);
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
            setError(`Only ${item.product.currentStock} units available in stock.`);
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
        setError(res.message || 'Failed to create customer.');
      }
    } catch {
      setError('Error creating customer.');
    } finally {
      setCustomerModalLoading(false);
    }
  };

  // Checkout Execution
  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (cart.length === 0) {
      setError('Cart is empty. Add products to complete sale.');
      return;
    }

    if (dueBalance > 0 && !selectedCustomerId) {
      setError('Credit / Partial payment strictly requires selecting an identified customer.');
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
        setError(res.message || 'Failed to complete sale.');
        setLoading(false);
        return;
      }

      setCompletedSale(res.data);
      handleClearCart();
      router.refresh();
    } catch (err) {
      const e = err as Error;
      setError(e.message || 'An unexpected error occurred during sale.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Mobile Tab Switcher */}
      <div className="lg:hidden grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-xl">
        <button
          type="button"
          onClick={() => setMobileTab('products')}
          className={`py-2 text-sm font-semibold rounded-lg transition-colors ${
            mobileTab === 'products'
              ? 'bg-white text-blue-600 shadow-xs'
              : 'text-gray-600'
          }`}
        >
          Catalog ({filteredProducts.length})
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('cart')}
          className={`py-2 text-sm font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
            mobileTab === 'cart'
              ? 'bg-white text-blue-600 shadow-xs'
              : 'text-gray-600'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          Cart ({cart.reduce((s, i) => s + i.quantity, 0)}) • Rs. {grandTotal.toLocaleString()}
        </button>
      </div>

      {/* Offline Status Warning Banner */}
      {networkStatus === 'OFFLINE' && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl text-xs flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>
            <strong>Offline POS Mode Active:</strong> Stock shown is from your last synchronized inventory state. Sales are queued locally and will commit automatically when connection returns.
          </span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main POS Interface Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Product Search & Catalog (7 Columns) */}
        <div
          className={`lg:col-span-7 space-y-4 ${
            mobileTab === 'cart' ? 'hidden lg:block' : 'block'
          }`}
        >
          {/* Barcode & Search Bar */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
            <div className="relative">
              <Barcode className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Scan barcode or type name / SKU (Press Enter to add)..."
                className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Category Filter Badges */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
              <button
                type="button"
                onClick={() => setSelectedCategory('ALL')}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === 'ALL'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Products
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-3 gap-3 max-h-[calc(100vh-260px)] overflow-y-auto pr-1">
            {filteredProducts.length === 0 ? (
              <div className="col-span-full py-16 text-center bg-white rounded-xl border border-gray-200">
                <Search className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-500">No active products match search</p>
              </div>
            ) : (
              filteredProducts.map((product) => {
                const isOutOfStock = product.currentStock <= 0;
                const inCartItem = cart.find((i) => i.product.id === product.id);

                return (
                  <button
                    key={product.id}
                    type="button"
                    disabled={isOutOfStock}
                    onClick={() => handleAddToCart(product)}
                    className={`p-3.5 text-left rounded-xl border transition-all flex flex-col justify-between relative group ${
                      isOutOfStock
                        ? 'bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed'
                        : 'bg-white border-gray-200 hover:border-blue-500 hover:shadow-md active:scale-[0.98]'
                    }`}
                  >
                    {inCartItem && (
                      <span className="absolute top-2 right-2 px-2 py-0.5 bg-blue-600 text-white font-bold text-xs rounded-full shadow-xs">
                        {inCartItem.quantity}
                      </span>
                    )}

                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm line-clamp-2 leading-tight">
                        {product.name}
                      </h4>
                      <p className="text-xs text-gray-400 font-mono mt-1">
                        {product.sku || (product.barcode ? `BC: ${product.barcode}` : '-')}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between">
                      <span className="font-bold text-blue-600 text-sm">
                        Rs. {product.sellingPrice.toLocaleString()}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-medium ${
                          product.currentStock <= 0
                            ? 'bg-red-100 text-red-700'
                            : product.currentStock <= 5
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-green-50 text-green-700'
                        }`}
                      >
                        {product.currentStock} {product.unit}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Interactive Cart & Checkout Panel (5 Columns) */}
        <div
          className={`lg:col-span-5 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col ${
            mobileTab === 'products' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Cart Header */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-gray-900 text-base">Current Cart</h3>
              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-full">
                {cart.reduce((s, i) => s + i.quantity, 0)}
              </span>
            </div>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={handleClearCart}
                className="text-xs text-red-600 hover:text-red-800 font-medium"
              >
                Clear Cart
              </button>
            )}
          </div>

          {/* Customer Selection Bar */}
          <div className="p-4 bg-gray-50/70 border-b border-gray-200 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-600">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-gray-500" />
                Customer Account
              </span>
              <button
                type="button"
                onClick={() => setIsCustomerModalOpen(true)}
                className="text-blue-600 hover:underline flex items-center gap-1"
              >
                <UserPlus className="w-3.5 h-3.5" /> + New Customer
              </button>
            </div>

            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Walk-in Cash Customer (No Account) --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `(${c.phone})` : ''} — Udhaar: Rs. {c.outstanding.toLocaleString()}
                </option>
              ))}
            </select>

            {selectedCustomer && selectedCustomer.outstanding > 0 && (
              <div className="text-xs text-orange-700 bg-orange-50 p-2 rounded-lg border border-orange-200 flex justify-between">
                <span>Existing Udhaar Balance:</span>
                <span className="font-bold">Rs. {selectedCustomer.outstanding.toLocaleString()}</span>
              </div>
            )}
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto max-h-[320px] divide-y divide-gray-100 p-2">
            {cart.length === 0 ? (
              <div className="py-16 text-center text-gray-400">
                <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Scan items or click catalog products</p>
              </div>
            ) : (
              cart.map((item) => {
                const lineTotal = Math.max(
                  0,
                  item.sellingPrice * item.quantity - item.discount
                );

                return (
                  <div key={item.product.id} className="p-3 space-y-2 hover:bg-gray-50/60 rounded-xl transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h5 className="font-semibold text-gray-900 text-sm truncate">
                          {item.product.name}
                        </h5>
                        <p className="text-xs text-gray-400 font-mono">
                          Rs. {item.sellingPrice.toLocaleString()} / {item.product.unit}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-gray-900 text-sm">
                          Rs. {lineTotal.toLocaleString()}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFromCart(item.product.id)}
                          className="block text-gray-400 hover:text-red-600 text-xs ml-auto mt-0.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Quantity & Discount Controls */}
                    <div className="flex items-center justify-between text-xs pt-1">
                      <div className="flex items-center gap-1 border border-gray-200 rounded-lg p-0.5 bg-white">
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(item.product.id, item.quantity - 1)}
                          className="p-1 text-gray-500 hover:bg-gray-100 rounded"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          max={item.product.currentStock}
                          value={item.quantity}
                          onChange={(e) =>
                            handleUpdateQuantity(item.product.id, parseInt(e.target.value) || 1)
                          }
                          className="w-10 text-center font-bold text-gray-900 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(item.product.id, item.quantity + 1)}
                          className="p-1 text-gray-500 hover:bg-gray-100 rounded"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-400">Disc:</span>
                          <input
                            type="number"
                            min="0"
                            value={item.discount || ''}
                            placeholder="0"
                            onChange={(e) =>
                              handleUpdateLineDiscount(
                                item.product.id,
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-14 px-1.5 py-0.5 border border-gray-200 rounded text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Totals & Checkout Form */}
          <form onSubmit={handleCheckout} className="p-4 bg-gray-50/80 border-t border-gray-200 space-y-3">
            {/* Discount & Total Row */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span className="font-semibold text-gray-900">Rs. {rawSubtotal.toLocaleString()}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-600">Overall Discount</span>
                <div className="flex items-center gap-1">
                  <span>- Rs.</span>
                  <input
                    type="number"
                    min="0"
                    value={globalDiscount || ''}
                    placeholder="0"
                    onChange={(e) => setGlobalDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-20 px-2 py-1 bg-white border border-gray-300 rounded text-right text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                  />
                </div>
              </div>

              <div className="pt-2 border-t flex justify-between text-base font-bold text-gray-900">
                <span>Grand Total</span>
                <span className="text-blue-600">Rs. {grandTotal.toLocaleString()}</span>
              </div>
            </div>

            {/* Payment Mode Selector */}
            <div className="pt-2 border-t space-y-2">
              <div className="grid grid-cols-3 gap-1.5 text-xs font-semibold">
                {['CASH', 'CARD', 'MOBILE_WALLET'].map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`py-1.5 rounded-lg border transition-colors ${
                      paymentMethod === method
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {method === 'MOBILE_WALLET' ? 'Wallet' : method}
                  </button>
                ))}
              </div>

              {/* Amount Paid Input with Quick Buttons */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-gray-700">Amount Received / Paid</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setPaidAmount(grandTotal.toString())}
                      className="px-2 py-0.5 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-xs"
                    >
                      Exact (Rs. {grandTotal})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaidAmount('0')}
                      className="px-2 py-0.5 bg-orange-100 text-orange-800 rounded hover:bg-orange-200 text-xs"
                    >
                      Full Credit (Rs. 0)
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">Rs.</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    placeholder={grandTotal.toString()}
                    className="w-full pl-8 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Due / Change Preview */}
              {dueBalance > 0 ? (
                <div className="p-2 bg-orange-50 border border-orange-200 rounded-lg flex justify-between text-xs text-orange-900 font-bold">
                  <span>Udhaar Added to Customer:</span>
                  <span>Rs. {dueBalance.toLocaleString()}</span>
                </div>
              ) : changeDue > 0 ? (
                <div className="p-2 bg-green-50 border border-green-200 rounded-lg flex justify-between text-xs text-green-900 font-bold">
                  <span>Change Return to Customer:</span>
                  <span>Rs. {changeDue.toLocaleString()}</span>
                </div>
              ) : null}
            </div>

            {/* Complete Sale Button */}
            <button
              type="submit"
              disabled={loading || cart.length === 0}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Processing Sale...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Complete Sale • Rs. {grandTotal.toLocaleString()}</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Quick Customer Creation Modal */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                Add New Customer
              </h3>
              <button
                type="button"
                onClick={() => setIsCustomerModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="e.g. Tariq Mehmood"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  placeholder="e.g. 0300-1234567"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={newCustomerAddress}
                  onChange={(e) => setNewCustomerAddress(e.target.value)}
                  placeholder="e.g. Main Bazar, Shop 4"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={customerModalLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm disabled:opacity-50"
                >
                  {customerModalLoading ? 'Saving...' : 'Save & Select'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Completed Sale Receipt Modal */}
      {completedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-6">
            <div className="text-center space-y-1 border-b pb-4">
              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Sale Completed!</h3>
              <p className="text-xs text-gray-500 font-mono">Invoice #{completedSale.invoiceNumber}</p>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Total Amount:</span>
                <span className="font-bold text-gray-900">Rs. {Number(completedSale.total).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Paid Amount:</span>
                <span className="font-semibold text-green-600">Rs. {Number(completedSale.paidAmount).toLocaleString()}</span>
              </div>
              {Number(completedSale.total) > Number(completedSale.paidAmount) && (
                <div className="flex justify-between text-orange-600 font-bold border-t pt-1">
                  <span>Added to Customer Udhaar:</span>
                  <span>Rs. {(Number(completedSale.total) - Number(completedSale.paidAmount)).toLocaleString()}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-4 border-t">
              <Link
                href={`/dashboard/sales/${completedSale.id}`}
                className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-xl text-sm text-center flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Print Receipt
              </Link>
              <button
                type="button"
                onClick={() => {
                  setCompletedSale(null);
                  searchInputRef.current?.focus();
                }}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-1.5"
              >
                Next Sale <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
