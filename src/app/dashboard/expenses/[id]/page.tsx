import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { getExpenseByIdAction, updateExpenseServerAction, getExpenseCategoriesAction } from '@/app/actions/expenses.actions';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { buttonClasses } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/input';
import { CancelExpenseButton } from '@/components/expenses/cancel-expense-button';

const fmt = (n: number) => `Rs. ${n.toLocaleString()}`;

const formatDate = (date: Date) =>
  date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

export default async function EditExpensePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { membership } = await getActiveBusiness().catch(() => notFound());

  const isOwnerOrManager = membership.role === 'OWNER' || membership.role === 'MANAGER';
  if (!isOwnerOrManager) {
    redirect('/dashboard/expenses');
  }

  const { id } = await params;

  let expense;
  try {
    expense = await getExpenseByIdAction(id);
  } catch {
    notFound();
  }

  const categoriesResult = await getExpenseCategoriesAction();
  const categories = categoriesResult.success && Array.isArray(categoriesResult.data) ? categoriesResult.data : [];

  const isCancelled = !!expense.cancelledAt;

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
            Edit Expense
          </li>
        </ol>
      </nav>

      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            Edit Expense
            <Badge tone={isCancelled ? 'neutral' : 'success'}>
              {isCancelled ? 'Cancelled' : 'Active'}
            </Badge>
          </span>
        }
        description={`${expense.category} · ${fmt(expense.amount)} · recorded ${formatDate(expense.date)}`}
      />

      {isCancelled && (
        <Alert tone="warning" title="This expense was cancelled">
          <p className="text-xs">
            It was reversed on {formatDate(expense.cancelledAt as Date)} and can no longer be edited.
          </p>
        </Alert>
      )}

      <Card>
        <CardContent>
          <form action={updateExpenseServerAction.bind(null, expense.id)} className="space-y-5">
            <input type="hidden" name="id" value={expense.id} />

            <fieldset disabled={isCancelled} className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Category" htmlFor="expense-category" required>
                  <Input
                    id="expense-category"
                    type="text"
                    name="category"
                    defaultValue={expense.category}
                    list="expense-categories"
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
                    defaultValue={expense.amount}
                    required
                  />
                </Field>

                <Field label="Date" htmlFor="expense-date" required>
                  <Input
                    id="expense-date"
                    type="date"
                    name="date"
                    defaultValue={new Date(expense.date).toISOString().split('T')[0]}
                    required
                  />
                </Field>

                <Field label="Payment Method" htmlFor="expense-payment-method">
                  <Select id="expense-payment-method" name="paymentMethod" defaultValue={expense.paymentMethod}>
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
                    defaultValue={expense.description || ''}
                    placeholder="Optional notes about this expense…"
                  />
                </Field>
              </div>
            </fieldset>

            <div className="flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                {!isCancelled && (
                  <CancelExpenseButton
                    expenseId={expense.id}
                    category={expense.category}
                    amount={expense.amount}
                    label="Cancel Expense"
                  />
                )}
              </div>
              <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/dashboard/expenses"
                  className={buttonClasses('outline', 'md', 'justify-center')}
                >
                  Back to Expenses
                </Link>
                <button
                  type="submit"
                  disabled={isCancelled}
                  className={buttonClasses('primary', 'md', isCancelled ? 'pointer-events-none opacity-50' : undefined)}
                >
                  Update Expense
                </button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
