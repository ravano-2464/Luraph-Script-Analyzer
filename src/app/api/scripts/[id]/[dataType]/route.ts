import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';
import { generateUnifiedAST, parseJavaScript, parseLua } from '@/lib/analyzer/parser-adapter';
import { generateControlFlow } from '@/lib/analyzer/control-flow';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; dataType: string }> }
) {
  try {
    const { id, dataType } = await params;
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch script and ensure user ownership
    const script = await prisma.script.findUnique({
      where: { id, userId: user.id },
      include: {
        analyses: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!script) {
      return NextResponse.json({ error: 'Script not found' }, { status: 404 });
    }

    const latestAnalysis = script.analyses[0];
    if (!latestAnalysis) {
      return NextResponse.json({ error: 'No analysis results found' }, { status: 404 });
    }

    const analysisId = latestAnalysis.id;

    // Switch case for dataType
    switch (dataType) {
      case 'functions': {
        const functions = await prisma.function.findMany({
          where: { analysisId },
        });
        return NextResponse.json({ success: true, data: functions });
      }

      case 'strings': {
        const strings = await prisma.stringLiteral.findMany({
          where: { analysisId },
        });
        return NextResponse.json({ success: true, data: strings });
      }

      case 'dependencies': {
        const dependencies = await prisma.dependency.findMany({
          where: { analysisId },
        });
        return NextResponse.json({ success: true, data: dependencies });
      }

      case 'network': {
        const network = await prisma.networkEvent.findMany({
          where: { analysisId },
        });
        return NextResponse.json({ success: true, data: network });
      }

      case 'security': {
        const security = await prisma.securityFinding.findMany({
          where: { analysisId },
        });
        return NextResponse.json({ success: true, data: security });
      }

      case 'metrics': {
        const metrics = await prisma.metric.findUnique({
          where: { analysisId },
        });
        return NextResponse.json({ success: true, data: metrics });
      }

      case 'ast': {
        const ast = generateUnifiedAST(script.content, script.language as 'js' | 'lua');
        return NextResponse.json({ success: true, data: ast });
      }

      case 'control-flow': {
        let parsedAst: unknown = null;
        try {
          if (script.language === 'js') {
            parsedAst = parseJavaScript(script.content);
          } else {
            parsedAst = parseLua(script.content);
          }
        } catch {
          console.error('Failed to parse AST for Control Flow');
        }
        const flowGraph = generateControlFlow(script.content, script.language as 'js' | 'lua', parsedAst);
        return NextResponse.json({ success: true, data: flowGraph });
      }

      case 'report': {
        // Compile full aggregate payload
        const metrics = await prisma.metric.findUnique({ where: { analysisId } });
        const functions = await prisma.function.findMany({ where: { analysisId } });
        const strings = await prisma.stringLiteral.findMany({ where: { analysisId } });
        const dependencies = await prisma.dependency.findMany({ where: { analysisId } });
        const network = await prisma.networkEvent.findMany({ where: { analysisId } });
        const security = await prisma.securityFinding.findMany({ where: { analysisId } });

        return NextResponse.json({
          success: true,
          data: {
            script: {
              id: script.id,
              filename: script.filename,
              fileSize: script.fileSize,
              language: script.language,
              hash: script.hash,
              complexity: script.complexity,
              createdAt: script.createdAt,
            },
            analysis: {
              id: latestAnalysis.id,
              obfuscationScore: latestAnalysis.obfuscationScore,
              riskScore: latestAnalysis.riskScore,
              createdAt: latestAnalysis.createdAt,
            },
            metrics,
            functions,
            strings,
            dependencies,
            network,
            security,
          },
        });
      }

      default:
        return NextResponse.json({ error: `Invalid data type: ${dataType}` }, { status: 400 });
    }
  } catch (error) {
    console.error('Error fetching dynamic analysis details:', error);
    return NextResponse.json({ error: 'Failed to retrieve analysis details' }, { status: 500 });
  }
}
