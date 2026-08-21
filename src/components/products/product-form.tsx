'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createProductAction } from '@/app/actions/product.actions';

export function ProductForm({ 
  businessId, 
  categories 
}: { 
  businessId: string;
  categories: { id: string, name: string }[] 
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [purchasePrice, setPurchasePrice] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);

  const profit = sellingPrice - purchasePrice;
  const margin = purchasePrice > 0 ? ((profit / purchasePrice) * 100).toFixed(1) : (sellingPrice > 0 ? 100 : 0);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    
    const payload = {
      name: formData.get('name') as string,
      sku: formData.get('sku') as string || null,
      barcode: formData.get('barcode') as string || null,
      categoryId: formData.get('categoryId') as string || null,
      unit: formData.get('unit') as string,
      purchasePrice: Number(formData.get('purchasePrice')),
      sellingPrice: Number(formData.get('sellingPrice')),
      minStockThreshold: Number(formData.get('minStockThreshold')),
    };

    try {
      const res = await createProductAction(businessId, payload);
      
      if (!res.success) {
        setError(res.message || 'Failed to create product');
        setLoading(false);
        return;
      }

      router.push('/dashboard/products');
      router.refresh();
    } catch (err) {
      setError('An unexpected error occurred.');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-8">
      {error && (
        <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900 border-b pb-2">Basic Info</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
            <input required name="name" type="text" className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
              <input name="sku" type="text" className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm" placeholder="e.g. ITEM-001" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Barcode</label>
              <input name="barcode" type="text" className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select name="categoryId" className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="">No Category</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <input name="unit" type="text" defaultValue="pcs" className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900 border-b pb-2">Pricing & Inventory</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Price</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">Rs.</span>
                <input 
                  required 
                  name="purchasePrice" 
                  type="number" 
                  min="0"
                  step="0.01"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(Number(e.target.value))}
                  className="w-full pl-10 pr-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" 
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">Rs.</span>
                <input 
                  required 
                  name="sellingPrice" 
                  type="number" 
                  min="0"
                  step="0.01"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(Number(e.target.value))}
                  className="w-full pl-10 pr-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" 
                />
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg flex items-center justify-between border border-gray-100">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Expected Profit</p>
              <p className={`text-lg font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                Rs. {profit.toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Margin</p>
              <p className={`text-lg font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {margin}%
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Stock Threshold</label>
            <input name="minStockThreshold" type="number" defaultValue="5" min="0" className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
            <p className="text-xs text-gray-500 mt-1">You will be alerted when stock falls below this level.</p>
          </div>
        </div>
      </div>
      
      <div className="border-t pt-6 flex justify-end gap-4">
        <button 
          type="button" 
          onClick={() => router.back()}
          className="px-6 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button 
          type="submit" 
          disabled={loading}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Product'}
        </button>
      </div>
    </form>
  );
}
