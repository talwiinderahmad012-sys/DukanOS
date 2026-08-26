import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { prisma } from '@/lib/db/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { getExpenseCategoriesAction, createExpenseServerAction } from '@/app/actions/expenses.actions';
import { Card, CardContent } from '@/components/ui/card';
import { buttonClasses } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/input';

export default async function NewExpensePage() {
  const { membership } = await getActiveBusiness().catch(() => redirect('/onboarding'));

  const isOwnerOrManager = membership.role === 'OWNER' || membership.role === 'MANAGER';
  if (!isOwnerOrManager) {
    redirect('/dashboard/expenses');
  }

  const categoriesResult = await getExpenseCategoriesAction();
  const branches = await prisma.branch.findMany({
    where: { businessId: membership.businessId },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  const categories = categoriesResult.success && Array.isArray(categoriesResult.data) ? categoriesResult.data : [];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Breadcrumb navigation */}
      <nav aria-label="Breadcrumb">
        <ol className="flex items-center gap-1.5 text-sm text-muted">
          <li>
            <Link href="/dashboard/expenses" className="transition-colors hover:text-primary">
              Expenses
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </li>
          <li aria-current="page" className="font-medium text-gray-900">
            New Expense
          </li>
        </ol>
      </nav>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">New Expense</h1>
        <p className="mt-1 text-sm text-muted">
          Record a new operational expense for your business.
        </p>
      </div>

      <Card>
        <CardContent>
          <form action={createExpenseServerAction} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Category" htmlFor="expense-category" required>
                <Input
                  id="expense-category"
                  type="text"
                  name="category"
                  list="expense-categories"
                  placeholder="e.g. Utilities, Rent, Supplies"
                  required
                />
                <datalist id="expense-categories">
                  {categories.map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </Field>

              <Field label="Amount (Rs.)" htmlFor="expense-amount" required>
                <Input
                  id="expense-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  name="amount"
                  placeholder="0.00"
                  required
                />
              </Field>

              <Field label="Date" htmlFor="expense-date" required>
                <Input
                  id="expense-date"
                  type="date"
                  name="date"
                  defaultValue={new Date().toISOString().split('T')[0]}
                  required
                />
              </Field>

              <Field label="Branch" htmlFor="expense-branch">
                <Select id="expense-branch" name="branchId" defaultValue="">
                  <option value="">No branch</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Payment Method" htmlFor="expense-payment-method" className="sm:col-span-2">
                <Select id="expense-payment-method" name="paymentMethod">
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="MOBILE_WALLET">Mobile Wallet</option>
                  <option value="CREDIT">Credit</option>
                </Select>
              </Field>

              <Field label="Description" htmlFor="expense-description" className="sm:col-span-2">
                <Textarea
                  id="expense-description"
                  name="description"
                  rows={3}
                  placeholder="Optional notes about this expense…"
                />
              </Field>
            </div>

            <div className="flex flex-col-reverse items-stretch justify-end gap-3 border-t border-border pt-4 sm:flex-row sm:items-center">
              <Link
                href="/dashboard/expenses"
                className={buttonClasses('outline', 'md', 'justify-center')}
              >
                Cancel
              </Link>
              <button type="submit" className={buttonClasses('primary', 'md')}>
                Record Expense
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
