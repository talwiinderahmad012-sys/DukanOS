'use server';

import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { assertOwnerOrManager } from '@/lib/auth/rbac';
import {
  createExpense,
  getExpenseById,
  listExpenses,
  updateExpense,
  cancelExpense,
  getExpenseCategories,
  type ExpenseListOptions,
  type ExpenseListResult,
} from '@/services/expenses';
import { expenseSchema } from '@/lib/validations';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createError, createSuccess, AppErrors } from '@/lib/utils/api-response';
import { PaymentMethod } from '@/generated/prisma/client';
import { AppError, ErrorCodes, type ErrorCode } from '@/lib/errors';

export async function getExpensesAction(options: ExpenseListOptions = {}): Promise<ExpenseListResult> {
  try {
    const { business } = await getActiveBusiness();
    return await listExpenses(business.id, options);
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch expenses');
  }
}

export async function getExpenseByIdAction(expenseId: string) {
  try {
    const { business } = await getActiveBusiness();
    return await getExpenseById(business.id, expenseId);
  } catch {
    throw new AppError(ErrorCodes.NOT_FOUND, 'Expense not found.', 404);
  }
}

export async function getExpenseAction(expenseId: string) {
  try {
    const { business } = await getActiveBusiness();
    const expense = await getExpenseById(business.id, expenseId);
    return createSuccess(expense);
  } catch {
    return createError(AppErrors.NOT_FOUND, 'Expense not found.');
  }
}

export async function createExpenseAction(data: {
  category: string;
  amount: number;
  date?: string;
  description?: string | null;
  paymentMethod?: PaymentMethod;
  branchId?: string | null;
}): Promise<void> {
  try {
    const { user, business, membership } = await getActiveBusiness();
    assertOwnerOrManager(membership.role, 'Only owners and managers can record expenses.');
    const validated = expenseSchema.safeParse(data);
    if (!validated.success) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Invalid expense data', 400);
    }

    await createExpense(business.id, user.id, {
      ...validated.data,
      branchId: validated.data.branchId || null,
    });

    revalidatePath('/dashboard/expenses');
    revalidatePath('/dashboard/analytics/expenses');
    revalidatePath('/dashboard/reports');
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to create expense');
  }
}

export async function updateExpenseAction(
  expenseId: string,
  data: {
    category?: string;
    amount?: number;
    date?: string;
    description?: string | null;
    paymentMethod?: PaymentMethod;
    branchId?: string | null;
  }
): Promise<void> {
  try {
    const { user, business, membership } = await getActiveBusiness();
    assertOwnerOrManager(membership.role, 'Only owners and managers can edit expenses.');

    const updateData: Record<string, unknown> = {};
    if (data.category !== undefined) updateData.category = data.category;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.date !== undefined) updateData.date = data.date;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.paymentMethod !== undefined) updateData.paymentMethod = data.paymentMethod;
    if (data.branchId !== undefined) updateData.branchId = data.branchId;

    await updateExpense(business.id, user.id, expenseId, updateData);

    revalidatePath('/dashboard/expenses');
    revalidatePath('/dashboard/analytics/expenses');
    revalidatePath('/dashboard/reports');
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to update expense');
  }
}

export async function cancelExpenseAction(expenseId: string): Promise<void> {
  try {
    const { user, business, membership } = await getActiveBusiness();
    assertOwnerOrManager(membership.role, 'Only owners and managers can cancel expenses.');

    await cancelExpense(business.id, user.id, expenseId);

    revalidatePath('/dashboard/expenses');
    revalidatePath('/dashboard/analytics/expenses');
    revalidatePath('/dashboard/reports');
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to cancel expense');
  }
}

export async function getExpenseCategoriesAction() {
  try {
    const { business } = await getActiveBusiness();
    const categories = await getExpenseCategories(business.id);
    return createSuccess(categories);
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    return createError(AppErrors.INTERNAL_ERROR, error.message || 'Failed to fetch expense categories');
  }
}

export async function createExpenseServerAction(formData: FormData): Promise<void> {
  try {
    const { user, business, membership } = await getActiveBusiness();
    assertOwnerOrManager(membership.role, 'Only owners and managers can record expenses.');
    const branchId = (formData.get('branchId') as string) || null;
    const parsed = expenseSchema.safeParse({
      category: formData.get('category') as string,
      amount: parseFloat(formData.get('amount') as string),
      date: formData.get('date') as string,
      description: formData.get('description') as string || null,
      paymentMethod: (formData.get('paymentMethod') as PaymentMethod) || PaymentMethod.CASH,
      branchId,
    });

    if (!parsed.success) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Invalid expense data', 400);
    }

    await createExpense(business.id, user.id, { ...parsed.data, branchId });

    revalidatePath('/dashboard/expenses');
    revalidatePath('/dashboard/analytics/expenses');
    revalidatePath('/dashboard/reports');

    redirect('/dashboard/expenses');
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to create expense');
  }
}

export async function updateExpenseServerAction(expenseId: string, formData: FormData): Promise<void> {
  try {
    const { user, business, membership } = await getActiveBusiness();
    assertOwnerOrManager(membership.role, 'Only owners and managers can edit expenses.');
    const rawAmount = parseFloat(formData.get('amount') as string);
    if (
      typeof rawAmount !== 'number' ||
      Number.isNaN(rawAmount) ||
      !Number.isFinite(rawAmount) ||
      rawAmount <= 0
    ) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Expense amount must be a positive number.', 400);
    }
    const data = {
      category: formData.get('category') as string,
      amount: rawAmount,
      date: formData.get('date') as string,
      description: formData.get('description') as string || null,
      paymentMethod: (formData.get('paymentMethod') as PaymentMethod) || PaymentMethod.CASH,
    };

    await updateExpense(business.id, user.id, expenseId, data);

    revalidatePath('/dashboard/expenses');
    revalidatePath('/dashboard/analytics/expenses');
    revalidatePath('/dashboard/reports');

    redirect('/dashboard/expenses');
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to update expense');
  }
}
