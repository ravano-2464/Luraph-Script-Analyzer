import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, verifyPassword } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { username, resetToken, securityAnswer, newPassword } = await req.json();

    if (!username || !newPassword) {
      return NextResponse.json(
        { error: 'Username and new password are required.' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'New password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { username }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'No account found matching that username.' },
        { status: 404 }
      );
    }

    // 1. PIN verification flow
    if (resetToken !== undefined) {
      if (!user.resetToken || !user.resetTokenExpiry) {
        return NextResponse.json(
          { error: 'No active recovery session found. Please request a new PIN.' },
          { status: 400 }
        );
      }

      if (user.resetTokenExpiry < new Date()) {
        return NextResponse.json(
          { error: 'Your recovery PIN has expired. Please request a new PIN.' },
          { status: 400 }
        );
      }

      if (user.resetToken.trim() !== resetToken.trim()) {
        return NextResponse.json(
          { error: 'Invalid recovery PIN. Please try again.' },
          { status: 400 }
        );
      }
    } 
    // 2. Security Question answer flow
    else if (securityAnswer !== undefined) {
      if (!user.securityQuestion || !user.securityAnswer) {
        return NextResponse.json(
          { error: 'No security question is configured for this account.' },
          { status: 400 }
        );
      }

      // Check if security answer matches (case-insensitive & whitespace trimmed)
      const cleanAnswer = securityAnswer.toLowerCase().trim();
      const isCorrect = await verifyPassword(cleanAnswer, user.securityAnswer);

      if (!isCorrect) {
        return NextResponse.json(
          { error: 'Incorrect answer to the security question. Please try again.' },
          { status: 400 }
        );
      }
    } 
    // 3. Neither provided
    else {
      return NextResponse.json(
        { error: 'Recovery PIN or Security Answer is required to reset the password.' },
        { status: 400 }
      );
    }

    // Hash the new password and update user record
    const passwordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { username },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Your password has been successfully reset. You can now log in.'
    });
  } catch (error) {
    console.error('Reset password endpoint error:', error);
    return NextResponse.json(
      { error: 'An error occurred while resetting the password.' },
      { status: 500 }
    );
  }
}
