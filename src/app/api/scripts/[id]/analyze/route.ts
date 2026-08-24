import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';
import { runStaticAnalysis } from '@/lib/analyzer/static-engine';
import { runJavaScriptSandbox, runLuaSandboxSimulation } from '@/lib/sandbox/runner';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { runSandbox } = await req.json();

    const script = await prisma.script.findUnique({
      where: { id, userId: user.id },
    });

    if (!script) {
      return NextResponse.json({ error: 'Script not found' }, { status: 404 });
    }

    // Update status to analyzing
    await prisma.script.update({
      where: { id },
      data: { status: 'ANALYZING' },
    });

    // 1. Run Static Analysis
    const analysisStart = Date.now();
    const analysis = runStaticAnalysis(script.content, script.language as 'js' | 'lua');
    const durationMs = Date.now() - analysisStart;

    // 2. Run Sandbox if requested
    let sandboxLogs: unknown[] = [];
    if (runSandbox) {
      if (script.language === 'js') {
        sandboxLogs = runJavaScriptSandbox(script.content);
      } else {
        sandboxLogs = runLuaSandboxSimulation(script.content);
      }
    }

    // 3. Estimate complexity
    let complexity: 'Low' | 'Medium' | 'High' = 'Low';
    if (analysis.metrics.cyclomaticComplexity > 30 || analysis.metrics.maxNestingDepth > 6) {
      complexity = 'High';
    } else if (analysis.metrics.cyclomaticComplexity > 10 || analysis.metrics.maxNestingDepth > 3) {
      complexity = 'Medium';
    }

    // 4. Save analysis results (in transaction)
    const savedResult = await prisma.$transaction(async (tx) => {
      // Create new Analysis record
      const dbAnalysis = await tx.analysis.create({
        data: {
          scriptId: script.id,
          obfuscationScore: analysis.obfuscationScore,
          riskScore: analysis.riskScore,
        },
      });

      // Save Metrics
      await tx.metric.create({
        data: {
          analysisId: dbAnalysis.id,
          loc: analysis.metrics.loc,
          functionCount: analysis.metrics.functionCount,
          variableCount: analysis.metrics.variableCount,
          stringCount: analysis.metrics.stringCount,
          branchCount: analysis.metrics.branchCount,
          loopCount: analysis.metrics.loopCount,
          cyclomaticComplexity: analysis.metrics.cyclomaticComplexity,
          maxNestingDepth: analysis.metrics.maxNestingDepth,
        },
      });

      // Save Functions
      if (analysis.functions.length > 0) {
        await tx.function.createMany({
          data: analysis.functions.map((f) => ({
            analysisId: dbAnalysis.id,
            name: f.name,
            params: f.params.join(','),
            startLine: f.startLine,
            endLine: f.endLine,
            cyclomaticComplexity: f.cyclomaticComplexity,
            riskScore: f.riskScore,
          })),
        });
      }

      // Save Strings
      if (analysis.strings.length > 0) {
        const stringBatches = [];
        for (let i = 0; i < analysis.strings.length; i += 100) {
          stringBatches.push(analysis.strings.slice(i, i + 100));
        }
        for (const batch of stringBatches) {
          await tx.stringLiteral.createMany({
            data: batch.map((s) => ({
              analysisId: dbAnalysis.id,
              value: s.value,
              category: s.category,
              confidence: s.confidence,
              line: s.line,
              column: s.column,
            })),
          });
        }
      }

      // Save Dependencies
      if (analysis.dependencies.length > 0) {
        await tx.dependency.createMany({
          data: analysis.dependencies.map((d) => ({
            analysisId: dbAnalysis.id,
            name: d.name,
            type: d.type,
          })),
        });
      }

      // Save Network Events
      if (analysis.networkEvents.length > 0) {
        await tx.networkEvent.createMany({
          data: analysis.networkEvents.map((n) => ({
            analysisId: dbAnalysis.id,
            url: n.url,
            type: n.type,
            line: n.line,
          })),
        });
      }

      // Save Security Findings
      if (analysis.securityFindings.length > 0) {
        await tx.securityFinding.createMany({
          data: analysis.securityFindings.map((sf) => ({
            analysisId: dbAnalysis.id,
            severity: sf.severity,
            category: sf.category,
            message: sf.message,
            line: sf.line,
            codeSnippet: sf.codeSnippet,
          })),
        });
      }

      // Save timeline logs
      const baseLogs = [
        { event: 'Analysis re-triggered', timestamp: new Date(analysisStart) },
        { event: 'Static AST compilation complete', timestamp: new Date(analysisStart + Math.round(durationMs * 0.3)) },
        { event: 'Security policies audited', timestamp: new Date(analysisStart + durationMs) },
      ];

      if (runSandbox) {
        baseLogs.push({
          event: `Sandbox runtime simulation complete (${sandboxLogs.length} events logged)`,
          timestamp: new Date(),
        });
      }

      await tx.analysisLog.createMany({
        data: baseLogs.map((l) => ({
          analysisId: dbAnalysis.id,
          event: l.event,
          timestamp: l.timestamp,
        })),
      });

      // Update script status
      await tx.script.update({
        where: { id: script.id },
        data: {
          status: 'COMPLETED',
          complexity,
        },
      });

      return dbAnalysis.id;
    });

    return NextResponse.json({
      success: true,
      message: 'Re-analysis and sandboxing execute complete',
      analysisId: savedResult,
      sandboxLogs,
    });
  } catch (error) {
    console.error('Re-analyze API error:', error);
    // Attempt to restore script state on failure
    try {
      const { id } = await params;
      await prisma.script.update({
        where: { id },
        data: { status: 'FAILED' },
      });
    } catch {}

    const errorMessage = error instanceof Error ? error.message : 'Execution re-analysis and sandbox run failed';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
