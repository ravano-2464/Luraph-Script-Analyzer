import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { identifier } = await req.json();

    if (!identifier) {
      return NextResponse.json(
        { error: 'Username or Email is required.' },
        { status: 400 }
      );
    }

    // Find user by username or email
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: identifier } },
          { email: { equals: identifier } }
        ]
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'No account found matching that username or email.' },
        { status: 404 }
      );
    }

    // Mask email for privacy if present (e.g. u***@domain.com)
    let maskedEmail = null;
    if (user.email) {
      const [local, domain] = user.email.split('@');
      if (local && domain) {
        const maskedLocal = local.length > 2 
          ? local[0] + '*'.repeat(local.length - 2) + local[local.length - 1]
          : local[0] + '*';
        maskedEmail = `${maskedLocal}@${domain}`;
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        username: user.username,
        email: maskedEmail,
        hasSecurityQuestion: !!user.securityQuestion,
        securityQuestion: user.securityQuestion || null
      }
    });
  } catch (error) {
    console.error('Find account error:', error);
    return NextResponse.json(
      { error: 'An error occurred while finding the account.' },
      { status: 500 }
    );
  }
}
