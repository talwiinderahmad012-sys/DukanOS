'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { adjustStockAction } from '@/app/actions/inventory.actions';

export function InventoryAdjustmentForm({ businessId, productId, currentStock }: { businessId: string, productId: string, currentStock: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [adjustmentType, setAdjustmentType] = useState('add');
  const [quantity, setQuantity] = useState(0);

  const newStock = adjustmentType === 'add' ? currentStock + quantity : currentStock - quantity;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (newStock < 0) {
      setError('Stock cannot go below zero.');
      setLoading(false);
      return;
    }

    const formData = new FormData(e.currentTarget);
    const payload = {
      productId,
      newStock,
      reason: formData.get('reason') as string,
    };

    try {
      const res = await adjustStockAction(businessId, payload);
      if (!res.success) {
        setError(res.message || 'Failed to adjust stock');
        setLoading(false);
        return;
      }
      
      setQuantity(0);
      e.currentTarget.reset();
      router.refresh();
      setLoading(false);
    } catch (err) {
      setError('Unexpected error occurred');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
      <h3 className="font-semibold text-gray-900 border-b pb-2">Adjust Stock</h3>
      
      {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
          <select 
            value={adjustmentType} 
            onChange={(e) => setAdjustmentType(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="add">Add Stock (+)</option>
            <option value="subtract">Reduce Stock (-)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
          <input 
            type="number" 
            min="1" 
            required 
            value={quantity || ''}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" 
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
        <select name="reason" required className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500">
          <option value="Opening Stock">Opening Stock</option>
          <option value="Correction">Correction</option>
          <option value="Damage">Damage</option>
          <option value="Loss">Loss</option>
          <option value="Other">Other</option>
        </select>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg flex items-center justify-between">
        <span className="text-sm text-gray-600">Resulting Stock:</span>
        <span className={`font-bold text-lg ${newStock < 0 ? 'text-red-600' : 'text-gray-900'}`}>{newStock}</span>
      </div>

      <button 
        type="submit" 
        disabled={loading || quantity <= 0 || newStock < 0}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
      >
        {loading ? 'Adjusting...' : 'Confirm Adjustment'}
      </button>
    </form>
  );
}
