import { NextResponse } from 'next/server';

/**
 * @deprecated Use /api/generate-visualization instead.
 * This route is kept for backward compatibility and simply redirects.
 */
export async function POST() {
  return NextResponse.json({
    error: 'This endpoint is deprecated. Please use /api/generate-visualization instead.',
  }, { status: 410 });
}
