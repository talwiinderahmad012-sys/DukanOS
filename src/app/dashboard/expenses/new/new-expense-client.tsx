'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { createExpenseServerAction } from '@/app/actions/expenses.actions';
import { Card } from '@/components/ui/card';
import { buttonClasses } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/input';
import { useTranslation } from '@/lib/i18n/language-context';

export type BranchOption = { id: string; name: string };

const PAYMENT_METHOD_LABEL_KEYS: Record<string, string> = {
  CASH: 'expenses.payCash',
  CARD: 'expenses.payCard',
  BANK_TRANSFER: 'expenses.payBankTransfer',
  MOBILE_WALLET: 'expenses.payMobileWallet',
  CREDIT: 'expenses.payCredit',
};

export function NewExpenseClient({
  categories,
  branches,
  todayDate,
}: {
  categories: string[];
  branches: BranchOption[];
  todayDate: string;
}) {
  const { t } = useTranslation();

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
            {t('expenses.newExpenseButton')}
          </li>
        </ol>
      </nav>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('expenses.newExpenseButton')}</h1>
        <p className="mt-1 text-sm text-muted">{t('expenses.newExpenseDescription')}</p>
      </div>

      <Card className="overflow-hidden">
        <form action={createExpenseServerAction}>
          <div className="divide-y divide-border">
            <section className="space-y-4 p-5" aria-labelledby="expense-section-info">
              <div>
                <h2 id="expense-section-info" className="text-sm font-bold text-gray-900">
                  {t('expenses.expenseInfoSection')}
                </h2>
                <p className="text-xs text-muted">{t('expenses.expenseInfoSectionDescription')}</p>
              </div>

              <Field label={t('common.category')} htmlFor="expense-category" required>
                <Input
                  id="expense-category"
                  type="text"
                  name="category"
                  list="expense-categories"
                  placeholder={t('expenses.categoryPlaceholder')}
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
                  placeholder={t('expenses.descriptionPlaceholder')}
                />
              </Field>
            </section>

            <section className="space-y-4 p-5" aria-labelledby="expense-section-financial">
              <div>
                <h2 id="expense-section-financial" className="text-sm font-bold text-gray-900">
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
                    placeholder={t('expenses.amountPlaceholder')}
                    required
                  />
                </Field>

                <Field label={t('common.date')} htmlFor="expense-date" required>
                  <Input
                    id="expense-date"
                    type="date"
                    name="date"
                    defaultValue={todayDate}
                    required
                  />
                </Field>

                <Field label={t('expenses.paymentMethodLabel')} htmlFor="expense-payment-method">
                  <Select id="expense-payment-method" name="paymentMethod">
                    {Object.keys(PAYMENT_METHOD_LABEL_KEYS).map((value) => (
                      <option key={value} value={value}>
                        {t(PAYMENT_METHOD_LABEL_KEYS[value])}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label={t('expenses.branch')} htmlFor="expense-branch">
                  <Select id="expense-branch" name="branchId" defaultValue="">
                    <option value="">{t('expenses.noBranch')}</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            </section>
          </div>

          <div className="flex flex-col-reverse items-stretch justify-end gap-3 border-t border-border bg-gray-50/50 px-5 py-4 sm:flex-row sm:items-center">
            <Link
              href="/dashboard/expenses"
              className={buttonClasses('outline', 'md', 'justify-center')}
            >
              {t('common.cancel')}
            </Link>
            <SubmitButton t={t} />
          </div>
        </form>
      </Card>
    </div>
  );
}

import { useFormStatus } from 'react-dom';

function SubmitButton({ t }: { t: (key: string) => string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={buttonClasses('primary', 'md')}>
      {pending ? t('common.saving') : t('expenses.recordExpense')}
    </button>
  );
}
