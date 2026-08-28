'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { updateExpenseServerAction } from '@/app/actions/expenses.actions';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { buttonClasses } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/input';
import { CancelExpenseButton, CATEGORY_LABEL_KEYS } from '@/components/expenses/cancel-expense-button';
import { useTranslation } from '@/lib/i18n/language-context';

export type ExpenseDetailData = {
  id: string;
  category: string;
  amount: number;
  date: string;
  description: string | null;
  paymentMethod: string;
  cancelledAt: string | null;
};

const PAYMENT_METHOD_LABEL_KEYS: Record<string, string> = {
  CASH: 'expenses.payCash',
  CARD: 'expenses.payCard',
  BANK_TRANSFER: 'expenses.payBankTransfer',
  MOBILE_WALLET: 'expenses.payMobileWallet',
  CREDIT: 'expenses.payCredit',
};

export function ExpenseDetailClient({
  expense,
  categories,
}: {
  expense: ExpenseDetailData;
  categories: string[];
}) {
  const { language, t, formatCurrency } = useTranslation();

  const formatDate = (iso: string): string =>
    new Date(iso).toLocaleDateString(language === 'UR' ? 'ur-PK' : 'en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const categoryLabel = (cat: string): string => {
    const key = CATEGORY_LABEL_KEYS[cat] ?? '';
    return key ? t(key) : cat;
  };

  const dateInputValue = (iso: string): string => iso.split('T')[0];

  const isCancelled = !!expense.cancelledAt;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <nav aria-label={t('expenses.breadcrumbAria')}>
        <ol className="flex items-center gap-1.5 text-sm text-muted">
          <li>
            <Link href="/dashboard/expenses" className="transition-colors hover:text-primary">
              {t('expenses.breadcrumbExpenses')}
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="h-4 w-4 rtl-flip text-gray-400" />
          </li>
          <li aria-current="page" className="font-medium text-gray-900">
            {t('expenses.editExpense')}
          </li>
        </ol>
      </nav>

      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            {t('expenses.editExpense')}
            <Badge tone={isCancelled ? 'neutral' : 'success'}>
              {isCancelled ? t('common.cancelled') : t('common.active')}
            </Badge>
          </span>
        }
        description={t('expenses.editHeaderMeta', {
          category: categoryLabel(expense.category),
          amount: formatCurrency(expense.amount),
          date: formatDate(expense.date),
        })}
      />

      {isCancelled && expense.cancelledAt && (
        <Alert tone="warning" title={t('expenses.cancelledAlertTitle')}>
          <p className="text-xs">
            {t('expenses.reversedOn', { date: formatDate(expense.cancelledAt) })}
          </p>
        </Alert>
      )}

      <Card className="overflow-hidden">
        <form action={updateExpenseServerAction.bind(null, expense.id)}>
          <input type="hidden" name="id" value={expense.id} />

          <fieldset disabled={isCancelled}>
            <div className="divide-y divide-border">
              <section className="space-y-4 p-5" aria-labelledby="expense-edit-section-info">
                <div>
                  <h2 id="expense-edit-section-info" className="text-sm font-bold text-gray-900">
                    {t('expenses.expenseInfoSection')}
                  </h2>
                  <p className="text-xs text-muted">{t('expenses.expenseInfoSectionDescription')}</p>
                </div>

                <Field label={t('common.category')} htmlFor="expense-category" required>
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

                <Field label={t('common.description')} htmlFor="expense-description">
                  <Textarea
                    id="expense-description"
                    name="description"
                    rows={3}
                    defaultValue={expense.description || ''}
                    placeholder={t('expenses.descriptionPlaceholder')}
                  />
                </Field>
              </section>

              <section className="space-y-4 p-5" aria-labelledby="expense-edit-section-financial">
                <div>
                  <h2 id="expense-edit-section-financial" className="text-sm font-bold text-gray-900">
                    {t('expenses.financialInfoSection')}
                  </h2>
                  <p className="text-xs text-muted">{t('expenses.financialInfoSectionDescription')}</p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label={t('expenses.amountLabel')} htmlFor="expense-amount" required>
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

                  <Field label={t('common.date')} htmlFor="expense-date" required>
                    <Input
                      id="expense-date"
                      type="date"
                      name="date"
                      defaultValue={dateInputValue(expense.date)}
                      required
                    />
                  </Field>

                  <Field label={t('expenses.paymentMethodLabel')} htmlFor="expense-payment-method" className="sm:col-span-2">
                    <Select id="expense-payment-method" name="paymentMethod" defaultValue={expense.paymentMethod}>
                      {Object.keys(PAYMENT_METHOD_LABEL_KEYS).map((value) => (
                        <option key={value} value={value}>
                          {t(PAYMENT_METHOD_LABEL_KEYS[value])}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
              </section>
            </div>
          </fieldset>

          <div className="flex flex-col-reverse gap-3 border-t border-border bg-gray-50/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {!isCancelled && (
                <CancelExpenseButton
                  expenseId={expense.id}
                  category={expense.category}
                  amount={expense.amount}
                  label={t('expenses.cancelExpense')}
                />
              )}
            </div>
            <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center">
              <Link
                href="/dashboard/expenses"
                className={buttonClasses('outline', 'md', 'justify-center')}
              >
                {t('expenses.backToExpenses')}
              </Link>
              <button
                type="submit"
                disabled={isCancelled}
                className={buttonClasses('primary', 'md', isCancelled ? 'pointer-events-none opacity-50' : undefined)}
              >
                {t('expenses.updateExpense')}
              </button>
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
}
