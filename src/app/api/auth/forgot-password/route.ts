import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { username } = await req.json();

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required.' },
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

    // Generate a 6-digit recovery code
    const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
    const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Save to user model
    await prisma.user.update({
      where: { username },
      data: {
        resetToken,
        resetTokenExpiry
      }
    });

    // Log the code to console for transparency
    console.log(`[SIMULATED EMAIL SENDER] To: ${user.email || 'None'} (${user.username}) | Recovery PIN: ${resetToken}`);

    return NextResponse.json({
      success: true,
      message: 'Recovery PIN generated successfully.',
      // Return details for the UI simulation
      simulation: {
        email: user.email || 'user@example.com',
        resetToken
      }
    });
  } catch (error) {
    console.error('Forgot password endpoint error:', error);
    return NextResponse.json(
      { error: 'An error occurred while generating the recovery code.' },
      { status: 500 }
    );
  }
}
