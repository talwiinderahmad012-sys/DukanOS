'use server';

import { prisma } from '@/lib/db/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { createError, createSuccess, AppErrors, type ErrorCode } from '@/lib/utils/api-response';
import { enforceRateLimit } from '@/lib/security/rate-limit-action';
import { AppError, ErrorCodes } from '@/lib/errors';
import { recordAuthAudit } from '@/services/audit';

const registerSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function registerUserAction(formData: Record<string, unknown>) {
  try {
    await enforceRateLimit('REGISTER', (formData.email as string) || 'unknown');
  } catch {
    return createError(AppErrors.RATE_LIMITED, 'Too many registration attempts. Please try again later.');
  }

  try {
    const validatedData = registerSchema.safeParse(formData);

    if (!validatedData.success) {
      return createError(
        AppErrors.VALIDATION_ERROR,
        'Invalid registration data',
        validatedData.error.flatten().fieldErrors
      );
    }

    const { name, email, password } = validatedData.data;

    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return createError(AppErrors.DUPLICATE_RECORD, 'Email already in use.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
      select: { id: true, name: true, email: true }
    });

    await recordAuthAudit({
      userId: user.id,
      action: 'ACCOUNT_REGISTERED',
      metadata: { email: user.email },
    })

    return createSuccess(user);
  } catch (error) {
    if (error instanceof AppError) {
      return createError(error.code as ErrorCode, error.message);
    }
    return createError(AppErrors.INTERNAL_ERROR, 'An unexpected error occurred.');
  }
}
