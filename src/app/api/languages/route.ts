import { NextResponse } from 'next/server';
import { LANGUAGE_NAMES } from '@/lib/languages';

export async function GET() {
  const languages = Object.entries(LANGUAGE_NAMES).map(([code, name]) => ({
    code,
    name,
  }));
  return NextResponse.json(languages);
}
