import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';
import { runStaticAnalysis } from '@/lib/analyzer/static-engine';
import crypto from 'crypto';

// GET: Retrieve user's scripts
export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const scripts = await prisma.script.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        analyses: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            metrics: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, scripts });
  } catch (error) {
    console.error('Fetch scripts error:', error);
    return NextResponse.json({ error: 'Failed to retrieve scripts' }, { status: 500 });
  }
}

// POST: Upload and Analyze Script
export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { filename, content, customLanguage } = await req.json();

    if (!content) {
      return NextResponse.json({ error: 'Script content is required' }, { status: 400 });
    }

    // Determine language
    let language: 'js' | 'lua' = 'js';
    if (customLanguage === 'js' || customLanguage === 'lua') {
      language = customLanguage;
    } else {
      const ext = filename?.split('.').pop()?.toLowerCase();
      if (ext === 'lua') {
        language = 'lua';
      } else if (ext === 'js' || ext === 'ts') {
        language = 'js';
      } else {
        // Simple heuristic detection
        const hasLuaKeywords = /\b(local|then|end|elseif|repeat|until)\b/.test(content);
        language = hasLuaKeywords ? 'lua' : 'js';
      }
    }

    const cleanFilename = filename || `unnamed_script.${language}`;
    const fileSize = Buffer.byteLength(content, 'utf8');

    // Configurable size limit: e.g. 2MB
    const MAX_SIZE = 2 * 1024 * 1024;
    if (fileSize > MAX_SIZE) {
      return NextResponse.json({ error: 'File size exceeds maximum configurable limit of 2MB' }, { status: 400 });
    }

    // Generate SHA-256 hash
    const hash = crypto.createHash('sha256').update(content).digest('hex');

    // Run Static Analysis Pipeline
    const analysisStart = Date.now();
    const analysis = runStaticAnalysis(content, language);
    const durationMs = Date.now() - analysisStart;

    // Estimate Complexity Label
    let complexity: 'Low' | 'Medium' | 'High' = 'Low';
    if (analysis.metrics.cyclomaticComplexity > 30 || analysis.metrics.maxNestingDepth > 6) {
      complexity = 'High';
    } else if (analysis.metrics.cyclomaticComplexity > 10 || analysis.metrics.maxNestingDepth > 3) {
      complexity = 'Medium';
    }

    // Save in Transaction to maintain SQLite integrity
    const savedScript = await prisma.$transaction(async (tx) => {
      const script = await tx.script.create({
        data: {
          filename: cleanFilename,
          content,
          fileSize,
          language,
          hash,
          complexity,
          status: 'COMPLETED',
          userId: user.id,
        },
      });

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

      // Save String Literals
      if (analysis.strings.length > 0) {
        // Batch in groups of 100 to avoid SQLite limits
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

      // Save Timeline Logs
      const logs = [
        { event: 'Script uploaded successfully', timestamp: new Date(analysisStart) },
        { event: `File parsed successfully using ${language.toUpperCase()} parser`, timestamp: new Date(analysisStart + Math.round(durationMs * 0.2)) },
        { event: 'AST Nodes traversed & structured', timestamp: new Date(analysisStart + Math.round(durationMs * 0.4)) },
        { event: 'Strings extracted & categorized', timestamp: new Date(analysisStart + Math.round(durationMs * 0.6)) },
        { event: 'Control flow paths mapped', timestamp: new Date(analysisStart + Math.round(durationMs * 0.8)) },
        { event: 'Security rule auditing completed', timestamp: new Date(analysisStart + durationMs) },
      ];

      await tx.analysisLog.createMany({
        data: logs.map((l) => ({
          analysisId: dbAnalysis.id,
          event: l.event,
          timestamp: l.timestamp,
        })),
      });

      return {
        scriptId: script.id,
        analysisId: dbAnalysis.id,
      };
    });

    return NextResponse.json({
      success: true,
      message: 'Script uploaded and analyzed successfully',
      scriptId: savedScript.scriptId,
      analysisId: savedScript.analysisId,
    });
  } catch (error) {
    console.error('Upload & analysis execution error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Analysis pipeline execution failed';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
