import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, signToken } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { username, password, email, securityQuestion, securityAnswer } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required.' },
        { status: 400 }
      );
    }

    if (username.length < 3) {
      return NextResponse.json(
        { error: 'Username must be at least 3 characters long.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    if ((securityQuestion && !securityAnswer) || (!securityQuestion && securityAnswer)) {
      return NextResponse.json(
        { error: 'Both security question and answer must be provided if setting one up.' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Username is already taken.' },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const hashedSecurityAnswer = securityAnswer 
      ? await hashPassword(securityAnswer.toLowerCase().trim())
      : null;

    const user = await prisma.user.create({
      data: {
        username,
        passwordHash,
        email: email || null,
        securityQuestion: securityQuestion || null,
        securityAnswer: hashedSecurityAnswer,
        role: 'USER', // Default role
      },
    });

    const sessionUser = {
      id: user.id,
      username: user.username,
      role: user.role,
    };

    const token = signToken(sessionUser);

    const response = NextResponse.json({
      success: true,
      user: sessionUser,
      token,
    });

    response.headers.append(
      'Set-Cookie',
      `token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${7 * 24 * 60 * 60}`
    );

    return response;
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during registration.' },
      { status: 500 }
    );
  }
}
