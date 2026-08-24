import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });

    // Overwrite the cookie with an expired max-age to delete it
    response.headers.append(
      'Set-Cookie',
      'token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0'
    );

    return response;
  } catch {
    return NextResponse.json(
      { error: 'An error occurred during logout.' },
      { status: 500 }
    );
  }
}
