import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { prisma } from '@/lib/db/prisma';
import { Truck, Plus } from 'lucide-react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createSupplierAction } from '@/app/actions/supplier.actions';

export default async function SuppliersPage() {
  const { business } = await getActiveBusiness().catch(() => redirect('/login'));

  const suppliers = await prisma.supplier.findMany({
    where: { businessId: business.id },
    include: { _count: { select: { purchases: true } } },
    orderBy: { name: 'asc' }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your vendors and distributors.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Create Form */}
        <div className="xl:col-span-1">
          <form action={async (formData) => {
            'use server';
            await createSupplierAction(business.id, {
              name: formData.get('name'),
              phone: formData.get('phone'),
              email: formData.get('email'),
              address: formData.get('address'),
            });
          }} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4 sticky top-6">
            <h3 className="font-semibold text-gray-900 border-b pb-2 flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-600" /> New Supplier
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
              <input required name="name" type="text" className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input name="phone" type="text" className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input name="email" type="email" className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <textarea name="address" rows={2} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"></textarea>
            </div>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-colors">
              Save Supplier
            </button>
          </form>
        </div>

        {/* List */}
        <div className="xl:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {suppliers.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <Truck className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No suppliers yet</h3>
              <p className="text-gray-500">Add suppliers to track purchases and ledger.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b">
                    <th className="px-6 py-4 font-medium">Supplier</th>
                    <th className="px-6 py-4 font-medium">Contact</th>
                    <th className="px-6 py-4 font-medium text-center">Purchases</th>
                    <th className="px-6 py-4 font-medium text-center">Status</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {suppliers.map((supplier) => (
                    <tr key={supplier.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <Link 
                          href={`/dashboard/suppliers/${supplier.id}`}
                          className="font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                        >
                          {supplier.name}
                        </Link>
                        {supplier.address && <div className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">{supplier.address}</div>}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <div>{supplier.phone || '-'}</div>
                        <div className="text-xs text-gray-400">{supplier.email}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-center font-medium text-gray-700">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100">
                          {supplier._count.purchases} {supplier._count.purchases === 1 ? 'bill' : 'bills'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {supplier.isActive ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">Active</span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">Archived</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right text-sm">
                        <Link
                          href={`/dashboard/suppliers/${supplier.id}`}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          View History &rarr;
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
