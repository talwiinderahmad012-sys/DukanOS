'use server';

import { prisma } from '@/lib/db/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { createError, createSuccess, AppErrors, type ErrorCode } from '@/lib/utils/api-response';
import { enforceRateLimit } from '@/lib/security/rate-limit-action';
import { AppError, ErrorCodes } from '@/lib/errors';
import { recordAuthAudit } from '@/services/audit';

import { normalizeEmail } from '@/lib/auth/email';

const registerSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function registerUserAction(formData: Record<string, unknown>) {
  try {
    await enforceRateLimit('REGISTER', normalizeEmail((formData.email as string) || '') || 'unknown');
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

    const { name, password } = validatedData.data;
    const email = normalizeEmail(validatedData.data.email);

    // Case-insensitive duplicate check so uppercase/lowercase variants behave
    // identically and cannot register a second account for an existing email.
    const existingUser = await prisma.user.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' },
      },
      select: { id: true },
    });

    if (existingUser) {
      // Anti-enumeration: do not reveal that the email already exists.
      // Fake success so the frontend continues to signIn (which will fail with Invalid Credentials).
      return createSuccess({ id: 'pending-registration', name, email });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let user;
    try {
      user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
        },
        select: { id: true, name: true, email: true }
      });
    } catch (dbError) {
      // Unique-constraint race (P2002) for a case-variant duplicate: respond
      // with the same generic message as the pre-check so no existence leak.
      if ((dbError as { code?: string })?.code === 'P2002') {
        return createSuccess({ id: 'pending-registration', name, email });
      }
      throw dbError;
    }

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
