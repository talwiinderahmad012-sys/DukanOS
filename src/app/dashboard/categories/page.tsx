import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { prisma } from '@/lib/db/prisma';
import { Layers, Plus } from 'lucide-react';
import { redirect } from 'next/navigation';
import { createCategoryAction } from '@/app/actions/category.actions';

export default async function CategoriesPage() {
  const { business } = await getActiveBusiness().catch(() => redirect('/login'));

  const categories = await prisma.category.findMany({
    where: { businessId: business.id },
    include: { _count: { select: { products: true } } },
    orderBy: { name: 'asc' }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
        <p className="text-gray-500 text-sm mt-1">Organize your products.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Create Form */}
        <div className="md:col-span-1">
          <form action={async (formData) => {
            'use server';
            await createCategoryAction(business.id, {
              name: formData.get('name'),
              description: formData.get('description')
            });
          }} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4 sticky top-6">
            <h3 className="font-semibold text-gray-900 border-b pb-2 flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-600" /> New Category
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input required name="name" type="text" className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea name="description" rows={3} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"></textarea>
            </div>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-colors">
              Save Category
            </button>
          </form>
        </div>

        {/* List */}
        <div className="md:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {categories.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <Layers className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No categories yet</h3>
              <p className="text-gray-500">Create your first category using the form.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b">
                    <th className="px-6 py-4 font-medium">Category Name</th>
                    <th className="px-6 py-4 font-medium">Description</th>
                    <th className="px-6 py-4 font-medium text-center">Products</th>
                    <th className="px-6 py-4 font-medium text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {categories.map((category) => (
                    <tr key={category.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">{category.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-xs">{category.description || '-'}</td>
                      <td className="px-6 py-4 text-sm text-center text-gray-600">{category._count.products}</td>
                      <td className="px-6 py-4 text-center">
                        {category.isActive ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">Active</span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">Archived</span>
                        )}
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
