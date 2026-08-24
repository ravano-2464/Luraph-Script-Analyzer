import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { deobfuscateLuraph } from '@/lib/deobfuscator/luraph';

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content } = await req.json();

    if (!content) {
      return NextResponse.json({ error: 'Obfuscated Lua content is required' }, { status: 400 });
    }

    // Configurable size limit: e.g. 2MB
    const fileSize = Buffer.byteLength(content, 'utf8');
    const MAX_SIZE = 2 * 1024 * 1024;
    if (fileSize > MAX_SIZE) {
      return NextResponse.json({ error: 'File size exceeds maximum configurable limit of 2MB' }, { status: 400 });
    }

    const result = deobfuscateLuraph(content);

    return NextResponse.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Luraph deobfuscation API execution error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Deobfuscation pipeline failed';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
