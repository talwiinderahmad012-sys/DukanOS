import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/auth/context';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser();
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const businessId = formData.get('businessId') as string;
    
    if (!file || !businessId) return NextResponse.json({ error: 'Missing file or businessId' }, { status: 400 });
    
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Use JPEG, PNG, WEBP, or SVG.' }, { status: 400 });
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
    return NextResponse.json({ error: err.message || 'Upload failed' }, { status: 500 });
  }
}
