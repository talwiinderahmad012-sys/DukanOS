import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser, requireBusinessAccess } from '@/lib/auth/context';
import { AppError, ErrorCodes } from '@/lib/errors';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser();
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const businessId = formData.get('businessId') as string;

    if (!file || !businessId) {
      return NextResponse.json({ error: 'Missing file or businessId' }, { status: 400 });
    }

    // Prevent path traversal via businessId.
    if (!/^[a-zA-Z0-9_-]+$/.test(businessId)) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Invalid businessId', 400);
    }

    // Enforce tenant ownership: the user must belong to this business.
    await requireBusinessAccess(businessId);

    // SVG is excluded to avoid stored-XSS via uploaded markup.
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Use JPEG, PNG, or WEBP.' }, { status: 400 });
    }
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Max 2MB.' }, { status: 400 });
    }

    const ext = file.type.split('/')[1].replace('svg+xml', 'svg');
    const fileName = `logo-${Date.now()}.${ext}`;
    const dir = path.join(process.cwd(), 'public', 'uploads', 'logos', businessId);
    await mkdir(dir, { recursive: true });
    const filePath = path.join(dir, fileName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    const url = `/uploads/logos/${businessId}/${fileName}`;
    return NextResponse.json({ url });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
