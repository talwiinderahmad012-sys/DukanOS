'use server';

import { prisma } from '@/lib/db/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { createError, createSuccess, AppErrors } from '@/lib/utils/api-response';

const registerSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function registerUserAction(formData: Record<string, unknown>) {
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
      select: { id: true, name: true, email: true } // Don't return password
    });

    return createSuccess(user);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to register');
  }
}
