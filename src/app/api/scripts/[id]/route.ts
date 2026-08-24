import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

// GET: Retrieve a specific script and its latest analysis summary
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const script = await prisma.script.findUnique({
      where: { id, userId: user.id },
      include: {
        analyses: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            metrics: true,
            logs: {
              orderBy: { timestamp: 'asc' },
            },
          },
        },
      },
    });

    if (!script) {
      return NextResponse.json({ error: 'Script not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, script });
  } catch (error) {
    console.error('Fetch script detail error:', error);
    return NextResponse.json({ error: 'Failed to retrieve script' }, { status: 500 });
  }
}

// DELETE: Delete a specific script and cascade delete all analyses
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership before deleting
    const script = await prisma.script.findFirst({
      where: { id, userId: user.id },
    });

    if (!script) {
      return NextResponse.json({ error: 'Script not found or access denied' }, { status: 404 });
    }

    await prisma.script.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Script and analysis results deleted successfully' });
  } catch (error) {
    console.error('Delete script error:', error);
    return NextResponse.json({ error: 'Failed to delete script' }, { status: 500 });
  }
}
