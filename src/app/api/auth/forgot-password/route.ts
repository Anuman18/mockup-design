import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    // To prevent email enumeration, return success even if user doesn't exist
    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'If the email exists, a password reset link has been generated.'
      });
    }

    // Clean up old reset tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id }
    }).catch(() => {});

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiration

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt
      }
    });

    // Log the token/url for testing purposes in local development
    const resetUrl = `${request.headers.get('origin') || 'http://localhost:3000'}/reset-password?token=${token}`;
    console.log(`\n🔑 PASSWORD RESET URL GENERATED:\n${resetUrl}\n`);

    return NextResponse.json({
      success: true,
      message: 'Password reset link generated successfully. Check server console for link.',
      // For ease of testing, return token so client can redirect directly
      token
    });

  } catch (err: any) {
    console.error('Forgot password error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
