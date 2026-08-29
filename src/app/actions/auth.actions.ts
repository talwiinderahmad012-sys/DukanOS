'use server';

import { prisma } from '@/lib/db/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { createError, createSuccess, AppErrors, type ErrorCode } from '@/lib/utils/api-response';
import { enforceRateLimit } from '@/lib/security/rate-limit-action';
import { AppError } from '@/lib/errors';
import { recordAuthAudit } from '@/services/audit';
import { normalizeEmail } from '@/lib/auth/email';
import { MembershipRole, BusinessType } from '@/generated/prisma/client';

const registerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().optional(),
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  businessName: z.string().min(2, "Business name is required"),
  businessType: z.nativeEnum(BusinessType),
  city: z.string().min(2, "City is required"),
  country: z.string().min(2, "Country is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
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
        'Please check the highlighted fields.',
        validatedData.error.flatten().fieldErrors
      );
    }

    const { firstName, lastName, username, phone, businessName, businessType, city, country, password } = validatedData.data;
    const email = normalizeEmail(validatedData.data.email);
    const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();

    // Check for existing email
    const existingEmail = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true },
    });

    if (existingEmail) {
      return createError(AppErrors.VALIDATION_ERROR, 'An account with this email already exists.', { email: ['An account with this email already exists.'] });
    }

    // Check for existing username
    const existingUsername = await prisma.user.findFirst({
      where: { username: { equals: username, mode: 'insensitive' } },
      select: { id: true },
    });

    if (existingUsername) {
      return createError(AppErrors.VALIDATION_ERROR, 'An account with this username already exists.', { username: ['An account with this username already exists.'] });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create User
      const user = await tx.user.create({
        data: {
          name: fullName,
          username,
          email,
          phone,
          password: hashedPassword,
        },
        select: { id: true, name: true, email: true }
      });

      // 2. Create Business
      const business = await tx.business.create({
        data: {
          name: businessName,
          type: businessType,
          city,
          country,
          currency: 'PKR',
          timezone: 'Asia/Karachi',
        }
      });

      // 3. Create Default Branch
      await tx.branch.create({
        data: {
          businessId: business.id,
          name: 'Main Branch',
          code: 'MAIN',
          city,
        }
      });

      // 4. Create Owner Membership
      await tx.businessMembership.create({
        data: {
          userId: user.id,
          businessId: business.id,
          role: MembershipRole.OWNER,
        }
      });

      return { user, business };
    });

    await recordAuthAudit({
      userId: result.user.id,
      action: 'ACCOUNT_REGISTERED',
      metadata: { email: result.user.email, businessId: result.business.id },
    });

    return createSuccess({ id: result.user.id, name: result.user.name, email: result.user.email, businessId: result.business.id });
  } catch (error) {
    if ((error as { code?: string })?.code === 'P2002') {
      return createError(AppErrors.VALIDATION_ERROR, 'An account with this email or username already exists.');
    }
    if (error instanceof AppError) {
      return createError(error.code as ErrorCode, error.message);
    }
    return createError(AppErrors.INTERNAL_ERROR, 'Registration is temporarily unavailable. Please try again.');
  }
}
