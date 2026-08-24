'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import LayoutShell from '@/components/LayoutShell';
import { motion } from 'framer-motion';
import {
  FileText, ShieldCheck, Printer, Download, Copy, RefreshCw,
  ServerCrash, ArrowLeft, ShieldAlert, CheckCircle, Info, ExternalLink
} from 'lucide-react';

interface ReportData {
  script: {
    id: string;
    filename: string;
    fileSize: number;
    language: string;
    hash: string;
    complexity: string;
    createdAt: string;
  };
  analysis: {
    id: string;
    obfuscationScore: number;
    riskScore: number;
    createdAt: string;
  };
  metrics: {
    loc: number;
    functionCount: number;
    variableCount: number;
    stringCount: number;
    branchCount: number;
    loopCount: number;
    cyclomaticComplexity: number;
    maxNestingDepth: number;
  };
  functions: Array<{
    name: string;
    params: string;
    cyclomaticComplexity: number;
    riskScore: number;
  }>;
  strings: Array<{
    value: string;
    category: string;
    confidence?: number;
  }>;
  dependencies: Array<{
    name: string;
    type: string;
  }>;
  network: Array<{
    url: string;
    type: string;
  }>;
  security: Array<{
    severity: string;
    category: string;
    message: string;
    line?: number;
  }>;
}

export default function ReportPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/scripts/${id}/report`);
      const data = await res.json();
      if (data.success) {
        setReport(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJson = () => {
    if (!report) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `luraph_report_${report.script.filename}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleCopyMarkdown = () => {
    if (!report) return;
    const md = `# Luraph Script Analyzer Audit Report
- **Filename**: ${report.script.filename}
- **Language**: ${report.script.language.toUpperCase()}
- **File Size**: ${report.script.fileSize} bytes
- **SHA-256 Checksum**: ${report.script.hash}
- **Scan Completed**: ${new Date(report.analysis.createdAt).toLocaleString()}

## Overall Ratings
- **Obfuscation Density**: ${report.analysis.obfuscationScore}/100
- **Static Security Risk**: ${report.analysis.riskScore}/100

## Code Metrics
- **Lines of Code**: ${report.metrics?.loc || 0}
- **Total Functions**: ${report.metrics?.functionCount || 0}
- **Dynamic Branches**: ${report.metrics?.branchCount || 0}

## Security Findings
${report.security.length === 0 ? '_No threats found._' : report.security.map(s => `- **[${s.severity}]** ${s.category}: ${s.message} (Line ${s.line || 'N/A'})`).join('\n')}
`;

    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <LayoutShell>
        <div className="flex flex-col items-center justify-center h-[70vh] gap-4">
          <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin" />
          <p className="text-slate-400 text-sm font-semibold">Compiling Audit Report...</p>
        </div>
      </LayoutShell>
    );
  }

  if (!report) {
    return (
      <LayoutShell>
        <div className="flex flex-col items-center justify-center h-[70vh] gap-4">
          <ServerCrash className="w-12 h-12 text-rose-500" />
          <p className="text-slate-400 text-sm font-semibold">Report database records not found.</p>
        </div>
      </LayoutShell>
    );
  }

  const criticals = report.security.filter(s => s.severity === 'CRITICAL');
  const highs = report.security.filter(s => s.severity === 'HIGH');
  const mediums = report.security.filter(s => s.severity === 'MEDIUM');

  return (
    <LayoutShell>
      <div className="max-w-5xl mx-auto space-y-8 pb-12 print:p-0 print:bg-white print:text-black">
        {/* Controls Bar - Hidden on print */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6 print:hidden">
          <div className="flex items-center gap-3">
            <Link
              href={`/analysis/${report.script.id}`}
              className="p-2 border border-slate-800 text-slate-400 hover:text-white rounded-lg transition"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">Compiled Audit Report</h1>
              <p className="text-text-muted text-xs mt-0.5">Audit checksum hash: {report.script.hash.substring(0, 16)}...</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / Save PDF
            </button>
            <button
              onClick={handleDownloadJson}
              className="flex items-center gap-2 px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition"
            >
              <Download className="w-3.5 h-3.5" />
              Download JSON
            </button>
            <button
              onClick={handleCopyMarkdown}
              className="flex items-center gap-2 px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition"
            >
              <Copy className="w-3.5 h-3.5" />
              {copied ? 'Copied MD!' : 'Copy Markdown'}
            </button>
          </div>
        </div>

        {/* Report Content Panel */}
        <div className="p-8 rounded-3xl border border-slate-800/80 bg-slate-900/10 print:border-0 print:bg-transparent print:p-0">
          {/* Print Header */}
          <div className="hidden print:flex items-center justify-between border-b-2 border-slate-200 pb-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-black">Luraph Script Analyzer Audit</h2>
              <p className="text-xs text-slate-500 mt-1">Generated: {new Date(report.analysis.createdAt).toLocaleString()}</p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded">
              VERIFIED COMPLIANT
            </span>
          </div>

          {/* File Meta Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-slate-800/60 print:border-slate-300">
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider print:text-slate-600">File Information</h3>
              <table className="w-full text-xs text-left">
                <tbody>
                  <tr className="border-b border-slate-900/40 print:border-slate-100">
                    <td className="py-2 text-slate-500 font-bold">Filename</td>
                    <td className="py-2 text-white font-semibold print:text-black">{report.script.filename}</td>
                  </tr>
                  <tr className="border-b border-slate-900/40 print:border-slate-100">
                    <td className="py-2 text-slate-500 font-bold">Format</td>
                    <td className="py-2 text-white font-semibold print:text-black uppercase">{report.script.language}</td>
                  </tr>
                  <tr className="border-b border-slate-900/40 print:border-slate-100">
                    <td className="py-2 text-slate-500 font-bold">File Size</td>
                    <td className="py-2 text-white font-semibold print:text-black">{report.script.fileSize} bytes</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider print:text-slate-600">Audit Status</h3>
              <table className="w-full text-xs text-left">
                <tbody>
                  <tr className="border-b border-slate-900/40 print:border-slate-100">
                    <td className="py-2 text-slate-500 font-bold">SHA-256 Hash</td>
                    <td className="py-2 text-white font-semibold print:text-black font-mono break-all text-[10px]">{report.script.hash}</td>
                  </tr>
                  <tr className="border-b border-slate-900/40 print:border-slate-100">
                    <td className="py-2 text-slate-500 font-bold">Scan Completed</td>
                    <td className="py-2 text-white font-semibold print:text-black">{new Date(report.analysis.createdAt).toLocaleString()}</td>
                  </tr>
                  <tr className="border-b border-slate-900/40 print:border-slate-100">
                    <td className="py-2 text-slate-500 font-bold">Structural Grade</td>
                    <td className="py-2 text-white font-semibold print:text-black">{report.script.complexity} Complexity</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Dials overview */}
          <div className="py-8 border-b border-slate-800/60 print:border-slate-300 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800 print:bg-slate-50 print:border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Obfuscation Score</p>
                <p className="text-2xl font-black text-white mt-1 print:text-black">{report.analysis.obfuscationScore}%</p>
              </div>
              <span className={`px-2.5 py-1 rounded-lg text-xs font-black ${
                report.analysis.obfuscationScore > 75
                  ? 'bg-rose-950/60 text-rose-400 print:bg-rose-100'
                  : 'bg-emerald-950/60 text-emerald-400 print:bg-emerald-100'
              }`}>
                {report.analysis.obfuscationScore > 75 ? 'OBFUSCATED' : 'CLEAN'}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800 print:bg-slate-50 print:border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Security Threat Risk</p>
                <p className="text-2xl font-black text-white mt-1 print:text-black">{report.analysis.riskScore}%</p>
              </div>
              <span className={`px-2.5 py-1 rounded-lg text-xs font-black ${
                report.analysis.riskScore > 50
                  ? 'bg-rose-950/60 text-rose-400 print:bg-rose-100'
                  : 'bg-emerald-950/60 text-emerald-400 print:bg-emerald-100'
              }`}>
                {report.analysis.riskScore > 50 ? 'THREATS DETECTED' : 'SAFE'}
              </span>
            </div>
          </div>

          {/* Security Findings Detail Section */}
          <div className="py-8 border-b border-slate-800/60 print:border-slate-300 space-y-4">
            <h3 className="text-base font-bold text-white print:text-black">Threat Summary & Vulnerability Findings</h3>
            {report.security.length === 0 ? (
              <div className="flex items-center gap-3 p-4 rounded-xl border border-emerald-800/30 bg-emerald-500/5 text-emerald-300 text-xs">
                <CheckCircle className="w-5 h-5 shrink-0" />
                <p>No critical execution paths or runtime escape signatures matched. This script contains standard sandbox configurations.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {report.security.map((sec, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-slate-800 bg-slate-950/30 print:bg-slate-50 print:border-slate-200 text-xs">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                        sec.severity === 'CRITICAL' ? 'bg-rose-950 text-rose-400' : 'bg-amber-950 text-amber-400'
                      }`}>
                        {sec.severity}
                      </span>
                      <span className="font-bold text-slate-200 print:text-black">{sec.category}</span>
                      {sec.line && <span className="text-[10px] text-slate-500 font-mono ml-auto">Line: {sec.line}</span>}
                    </div>
                    <p className="text-slate-400 print:text-slate-700 leading-relaxed">{sec.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Code Metrics Details */}
          <div className="py-8 border-b border-slate-800/60 print:border-slate-300 space-y-4">
            <h3 className="text-base font-bold text-white print:text-black">Static Code Metrics</h3>
            {report.metrics ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                {[
                  { label: 'Lines of Code (LOC)', val: report.metrics.loc },
                  { label: 'Total Functions', val: report.metrics.functionCount },
                  { label: 'Conditional Branches', val: report.metrics.branchCount },
                  { label: 'Max Nesting Depth', val: report.metrics.maxNestingDepth },
                ].map((item) => (
                  <div key={item.label} className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 print:bg-slate-50 print:border-slate-200">
                    <p className="text-slate-500 font-bold uppercase text-[9px] tracking-wider">{item.label}</p>
                    <p className="text-xl font-extrabold text-white mt-1 print:text-black">{item.val}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-xs">No metrics aggregates populated.</p>
            )}
          </div>

          {/* Functions Table */}
          <div className="py-8 border-b border-slate-800/60 print:border-slate-300 space-y-4 page-break">
            <h3 className="text-base font-bold text-white print:text-black">Functional Map</h3>
            <div className="border border-slate-800 rounded-xl overflow-hidden print:border-slate-200 text-xs">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/50 print:bg-slate-50 print:border-slate-200 text-slate-400 print:text-slate-600 font-bold">
                    <th className="py-2.5 px-4">Function Label</th>
                    <th className="py-2.5 px-4">Parameters</th>
                    <th className="py-2.5 px-4 text-right">Branch Complexity</th>
                    <th className="py-2.5 px-4 text-right">Risk Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 print:divide-slate-100 font-mono">
                  {report.functions.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-slate-500">No functions scanned.</td>
                    </tr>
                  ) : (
                    report.functions.slice(0, 10).map((fn, idx) => (
                      <tr key={idx} className="text-slate-300 print:text-black">
                        <td className="py-2.5 px-4 font-semibold">{fn.name}</td>
                        <td className="py-2.5 px-4 text-slate-500">({fn.params || 'none'})</td>
                        <td className="py-2.5 px-4 text-right">{fn.cyclomaticComplexity}</td>
                        <td className="py-2.5 px-4 text-right font-bold">{fn.riskScore}/100</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Strings Extraction */}
          <div className="py-8 space-y-4 page-break">
            <h3 className="text-base font-bold text-white print:text-black">Extracted Encoded & Dynamic Network Indicators</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Encoded Strings list */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider print:text-slate-600">Encoded Literals</h4>
                <div className="border border-slate-800 rounded-xl bg-slate-950/20 print:border-slate-200 overflow-hidden max-h-48 overflow-y-auto">
                  {report.strings.filter(s => s.category === 'Encoded').length === 0 ? (
                    <p className="p-4 text-slate-600 text-xs italic">No encoded strings matched.</p>
                  ) : (
                    <div className="p-2 space-y-1 font-mono text-[10px] divide-y divide-slate-900 print:divide-slate-100 text-slate-300 print:text-black">
                      {report.strings.filter(s => s.category === 'Encoded').slice(0, 15).map((s, idx) => (
                        <div key={idx} className="py-1.5 px-2 truncate" title={s.value}>
                          {s.value}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Dynamic Networks / APIs */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider print:text-slate-600">Network Events</h4>
                <div className="border border-slate-800 rounded-xl bg-slate-950/20 print:border-slate-200 overflow-hidden max-h-48 overflow-y-auto">
                  {report.network.length === 0 ? (
                    <p className="p-4 text-slate-600 text-xs italic">No network connection strings extracted.</p>
                  ) : (
                    <div className="p-2 space-y-1 font-mono text-[10px] divide-y divide-slate-900 print:divide-slate-100 text-slate-300 print:text-black">
                      {report.network.slice(0, 15).map((n, idx) => (
                        <div key={idx} className="py-1.5 px-2 flex justify-between">
                          <span className="truncate max-w-[160px] text-cyan-400 font-semibold">{n.url}</span>
                          <span className="text-slate-500 uppercase">{n.type}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Disclaimer / Recommendations block */}
          <div className="mt-8 p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 print:bg-slate-100 print:border-slate-300 text-xs leading-relaxed text-slate-400 print:text-slate-700">
            <h4 className="font-bold text-indigo-300 print:text-black mb-1.5 flex items-center gap-2">
              <Info className="w-4 h-4 text-indigo-400" />
              Recommendations and Disclaimers
            </h4>
            <p>
              This report represents a pure static logic flow evaluation and safe VM sandbox simulation. The analyzer evaluates AST nodes and signature patterns, and does not perform licensing bypasses, decryption key cracking, or modification of obfuscation boundaries. Users must ensure appropriate authorization prior to executing audits on proprietary scripts.
            </p>
          </div>
        </div>
      </div>
    </LayoutShell>
  );
}
