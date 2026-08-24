import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized. Active session not found.' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('Session fetching error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve active session.' },
      { status: 500 }
    );
  }
}
