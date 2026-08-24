'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import LayoutShell from '@/components/LayoutShell';
import Editor from '@monaco-editor/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Code, Wand2, ShieldAlert, Sparkles, Terminal, FileCode2,
  Copy, Download, Play, CheckCircle2, AlertTriangle, RefreshCw,
  Search, ShieldCheck, HelpCircle, Link as LinkIcon
} from 'lucide-react';

interface DecryptedConstant {
  value: string;
  category: 'DiscordWebhook' | 'URL' | 'LuaAPI' | 'InternalKey' | 'SystemMessage' | 'Normal';
  confidence: number;
}

interface LuraphResult {
  detected: boolean;
  version: string;
  confidence: number;
  matchedSignatures: string[];
  strings: DecryptedConstant[];
  numbers: number[];
  logs: string[];
  reconstructedCode: string;
}

export default function LuraphDeobfuscator() {
  const router = useRouter();
  const [obfuscatedCode, setObfuscatedCode] = useState('');
  const [translatedCode, setTranslatedCode] = useState('');
  const [result, setResult] = useState<LuraphResult | null>(null);
  
  // Loading & State
  const [translating, setTranslating] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'strings' | 'logs' | 'numbers' | 'signatures'>('strings');
  const [copiedInput, setCopiedInput] = useState(false);
  const [copiedOutput, setCopiedOutput] = useState(false);
  const [savingAudit, setSavingAudit] = useState(false);

  // Sample scripts for testing
  const loadSampleScript = () => {
    const sample = `-- =========================================================================\n` +
      `-- Luraph Obfuscator v14 VM Payload (Discord Logger & Script Loader)\n` +
      `-- =========================================================================\n` +
      `local LphInit = (function()\n` +
      `    -- Obfuscated constant pools and virtual registers\n` +
      `    local lph_strings = {\n` +
      `        "\\103\\097\\109\\101",\n` +
      `        "\\104\\116\\116\\112\\083\\101\\114\\118\\105\\099\\101",\n` +
      `        "\\080\\111\\115\\116\\065\\115\\121\\110\\099",\n` +
      `        "\\072\\116\\116\\112\\071\\101\\116"\n` +
      `    }\n` +
      `    local lph_webhook = "\\x68\\x74\\x74\\x70\\x73\\x3a\\x2f\\x2f\\x64\\x69\\x73\\x63\\x6f\\x72\\x64\\x2e\\x63\\x6f\\x6d\\x2f\\x61\\x70\\x69\\x2f\\x77\\x65\\x62\\x68\\x6f\\x6f\\x6b\\x73\\x2f\\x31\\x32\\x33\\x34\\x35\\x36\\x37\\x38\\x39\\x2f\\x61\\x62\\x63\\x64\\x65\\x66\\x67"\n` +
      `    local lph_source = "\\x68\\x74\\x74\\x70\\x73\\x3a\\x2f\\x2f\\x72\\x61\\x77\\x2e\\x67\\x69\\x74\\x68\\x75\\x62\\x75\\x73\\x65\\x72\\x63\\x6f\\x6e\\x74\\x65\\x6e\\x74\\x2e\\x63\\x6f\\x6d\\x2f\\x44\\x65\\x76\\x65\\x6c\\x6f\\x70\\x65\\x72\\x2f\\x4c\\x75\\x61\\x53\\x63\\x72\\x69\\x70\\x74\\x73\\x2f\\x6d\\x61\\x69\\x6e\\x2f\\x6c\\x6f\\x61\\x64\\x65\\x72\\x2e\\x6c\\x75\\x61"\n` +
      `    \n` +
      `    -- Serialized VM chunk header\n` +
      `    local LPH_BYTECODE = "LPH!\\x01\\x0b\\x03\\xff\\x41\\x9a\\x88\\x12\\xcd\\xef"\n` +
      `    \n` +
      `    local LphVM = function(op, reg)\n` +
      `        local select = select\n` +
      `        local getfenv = getfenv\n` +
      `        local setfenv = setfenv\n` +
      `        local st = {}\n` +
      `        return function(...)\n` +
      `            -- Luraph VM dispatching operations...\n` +
      `        end\n` +
      `    end\n` +
      `    return LphVM\n` +
      `end)()\n`;
    setObfuscatedCode(sample);
    setError('');
  };

  const handleTranslate = async () => {
    if (!obfuscatedCode.trim()) {
      setError('Please enter some obfuscated Lua code first.');
      return;
    }

    setTranslating(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/deobfuscate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: obfuscatedCode })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Deobfuscation failed');
      }

      setResult(data.result);
      setTranslatedCode(data.result.reconstructedCode);
    } catch (err: any) {
      setError(err.message || 'An error occurred during translation pipeline execution.');
    } finally {
      setTranslating(false);
    }
  };

  const handleCopyInput = () => {
    navigator.clipboard.writeText(obfuscatedCode);
    setCopiedInput(true);
    setTimeout(() => setCopiedInput(false), 2000);
  };

  const handleCopyOutput = () => {
    navigator.clipboard.writeText(translatedCode);
    setCopiedOutput(true);
    setTimeout(() => setCopiedOutput(false), 2000);
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([translatedCode], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = "translated_luraph_script.lua";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleSaveAndAudit = async () => {
    if (!translatedCode) return;
    setSavingAudit(true);
    try {
      const response = await fetch('/api/scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: `deobfuscated_luraph_${Date.now()}.lua`,
          content: translatedCode,
          customLanguage: 'lua'
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save script');
      }

      // Redirect to full AST analysis
      router.push(`/analysis/${data.scriptId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to save script for auditing.');
      setSavingAudit(false);
    }
  };

  return (
    <LayoutShell>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <Wand2 className="w-8 h-8 text-indigo-400" />
              Luraph Translation Studio
            </h1>
            <p className="text-text-muted text-sm mt-1">
              De-virtualize constant pools, extract encrypted webhooks, and synthesize actions from Luraph-protected Lua files
            </p>
          </div>
          <button
            onClick={loadSampleScript}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 hover:text-white hover:border-slate-700 transition text-sm font-semibold self-start"
          >
            <Sparkles className="w-4 h-4 text-indigo-400" />
            Load Obfuscated Sample
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-sm">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-bold">Decompiler Exception</p>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Workspace Dual Pane */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Pane - Obfuscated Code */}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-md overflow-hidden flex flex-col h-[520px]">
            <div className="flex items-center justify-between px-5 h-12 bg-slate-950/80 border-b border-slate-800/60 shrink-0">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Code className="w-4 h-4 text-indigo-400" />
                Obfuscated Luraph Script
              </span>
              <button
                onClick={handleCopyInput}
                disabled={!obfuscatedCode}
                className="p-1.5 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-white transition disabled:opacity-40"
                title="Copy Code"
              >
                {copiedInput ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex-1 min-h-0 bg-slate-950/60">
              <Editor
                height="100%"
                language="lua"
                theme="vs-dark"
                value={obfuscatedCode}
                onChange={(v) => setObfuscatedCode(v || '')}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: 'on',
                  roundedSelection: false,
                  scrollBeyondLastLine: false,
                  readOnly: translating,
                  cursorStyle: 'line',
                  automaticLayout: true,
                }}
              />
            </div>
          </div>

          {/* Right Pane - Translated/Deobfuscated Code */}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-md overflow-hidden flex flex-col h-[520px]">
            <div className="flex items-center justify-between px-5 h-12 bg-slate-950/80 border-b border-slate-800/60 shrink-0">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <FileCode2 className="w-4 h-4 text-emerald-400" />
                Translated Actions Payload
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleCopyOutput}
                  disabled={!translatedCode}
                  className="p-1.5 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-white transition disabled:opacity-40"
                  title="Copy Code"
                >
                  {copiedOutput ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
                <button
                  onClick={handleDownload}
                  disabled={!translatedCode}
                  className="p-1.5 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-white transition disabled:opacity-40"
                  title="Download Script"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0 bg-slate-950/60 relative">
              <Editor
                height="100%"
                language="lua"
                theme="vs-dark"
                value={translatedCode}
                onChange={(v) => setTranslatedCode(v || '')}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: 'on',
                  roundedSelection: false,
                  scrollBeyondLastLine: false,
                  readOnly: true,
                  automaticLayout: true,
                }}
              />

              {/* No output message / translator action trigger overlay */}
              {!translatedCode && !translating && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/40 backdrop-blur-[2px] p-6 text-center">
                  <Wand2 className="w-12 h-12 text-slate-700 mb-3 animate-pulse" />
                  <p className="text-slate-300 font-bold text-base">Translation Studio Idle</p>
                  <p className="text-slate-500 text-xs mt-1 mb-6 max-w-xs">Load or paste your obfuscated Luraph script, then click the trigger below.</p>
                  <button
                    onClick={handleTranslate}
                    disabled={!obfuscatedCode}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl shadow-lg hover:shadow-indigo-500/20 transition active:scale-[0.98]"
                  >
                    <Play className="w-4 h-4" />
                    Translate Script
                  </button>
                </div>
              )}

              {/* Translating overlay spinner */}
              {translating && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm p-6 text-center z-10">
                  <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
                  <p className="text-white font-bold text-sm">Decoding Bytecodes & Mappings...</p>
                  <p className="text-slate-500 text-xs mt-1">Luraph constant deserializer running in sandbox thread.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Integration Buttons Row */}
        {translatedCode && (
          <div className="flex flex-col sm:flex-row items-center gap-4 justify-between p-4 rounded-2xl border border-slate-800 bg-slate-900/20 backdrop-blur-sm">
            <div className="flex items-center gap-3 text-left">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Reconstruction Ready for Audit</p>
                <p className="text-slate-400 text-xs mt-0.5">You can now save this clean script to execute full heuristic rules, logs and control flow mapping.</p>
              </div>
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
              <button
                onClick={handleTranslate}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition"
              >
                <RefreshCw className="w-4 h-4" />
                Retranslate
              </button>
              <button
                onClick={handleSaveAndAudit}
                disabled={savingAudit}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition shadow-lg hover:shadow-indigo-500/10 disabled:bg-indigo-900"
              >
                {savingAudit ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Save & Run Security Audit
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Bottom Panel - Insights Tab Grid */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-2xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-md"
          >
            {/* Tabs Selector Header */}
            <div className="flex border-b border-slate-800 mb-6 gap-2">
              {[
                { id: 'strings', label: 'Decrypted Strings Pool', icon: Terminal, count: result.strings.length },
                { id: 'signatures', label: 'VM Signature Audit', icon: ShieldAlert, count: result.matchedSignatures.length },
                { id: 'logs', label: 'Decompiler Trace Logs', icon: HelpCircle, count: result.logs.length },
                { id: 'numbers', label: 'Numerical Op-Codes', icon: Code, count: result.numbers.length },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs font-semibold uppercase tracking-wider transition ${
                      isActive
                        ? 'border-indigo-500 text-white bg-indigo-500/5'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                    {tab.count > 0 && (
                      <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-slate-800 text-[10px] text-slate-300 font-bold border border-slate-700/80">
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Tab Contents View */}
            <div className="min-h-[220px]">
              {/* Tab 1: Strings */}
              {activeTab === 'strings' && (
                <div className="space-y-4">
                  {result.strings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-slate-800 rounded-xl bg-slate-950/20">
                      <Terminal className="w-10 h-10 text-slate-700 mb-2" />
                      <p className="text-slate-400 text-sm">No constants extracted from VM pool</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                            <th className="py-2.5 px-4">Extracted Constant String</th>
                            <th className="py-2.5 px-4">Heuristic Type</th>
                            <th className="py-2.5 px-4">Extraction Confidence</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40 text-xs font-mono">
                          {result.strings.map((str, idx) => {
                            let badgeStyle = 'bg-slate-950 text-slate-400 border-slate-800';
                            if (str.category === 'DiscordWebhook') badgeStyle = 'bg-rose-950/80 text-rose-400 border-rose-500/20 font-bold';
                            else if (str.category === 'URL') badgeStyle = 'bg-cyan-950/80 text-cyan-400 border-cyan-500/20';
                            else if (str.category === 'LuaAPI') badgeStyle = 'bg-indigo-950/80 text-indigo-400 border-indigo-500/20';
                            else if (str.category === 'SystemMessage') badgeStyle = 'bg-amber-950/80 text-amber-400 border-amber-500/20';

                            return (
                              <tr key={idx} className="hover:bg-slate-950/20 transition">
                                <td className="py-3 px-4 text-white font-semibold break-all max-w-[500px]">
                                  {str.value}
                                </td>
                                <td className="py-3 px-4">
                                  <span className={`px-2 py-0.5 rounded text-[10px] uppercase border ${badgeStyle}`}>
                                    {str.category === 'DiscordWebhook' ? 'Discord Webhook' : str.category}
                                  </span>
                                </td>
                                <td className="py-3 px-4 font-bold text-slate-400">
                                  {str.confidence}%
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Signatures */}
              {activeTab === 'signatures' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Confidence metrics card */}
                  <div className="p-5 rounded-xl border border-slate-800/80 bg-slate-950/40 flex flex-col justify-between">
                    <div>
                      <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Overall Confidence</p>
                      <h4 className="text-4xl font-extrabold text-white mt-2">{result.confidence}%</h4>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-xs">
                      {result.detected ? (
                        <>
                          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span className="text-emerald-400 font-bold">Luraph Obfuscation Confirmed</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-4 h-4 text-slate-500 shrink-0" />
                          <span className="text-slate-400 font-bold">Unconfirmed Signature</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Matched signatures list */}
                  <div className="md:col-span-2 p-5 rounded-xl border border-slate-800/80 bg-slate-950/40 space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Matched VM Identifiers</h4>
                    {result.matchedSignatures.length === 0 ? (
                      <span className="text-xs text-slate-500">No obfuscation features matching Luraph structural logs.</span>
                    ) : (
                      <div className="space-y-2">
                        {result.matchedSignatures.map((sig, idx) => (
                          <div key={idx} className="flex items-center gap-2.5 text-xs text-white">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                            <span>{sig}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 3: Logs */}
              {activeTab === 'logs' && (
                <div className="p-4 bg-slate-950/60 border border-slate-850 rounded-xl font-mono text-xs text-slate-400 space-y-2 leading-relaxed h-[220px] overflow-y-auto">
                  {result.logs.map((logStr, idx) => (
                    <div key={idx} className="flex gap-2">
                      <span className="text-indigo-400">[{idx + 1}]</span>
                      <span>{logStr}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Tab 4: Numbers */}
              {activeTab === 'numbers' && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Discovered Arithmetic Keys</h4>
                  {result.numbers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-slate-800 rounded-xl bg-slate-950/20">
                      <Code className="w-10 h-10 text-slate-700 mb-2" />
                      <p className="text-slate-400 text-sm">No arithmetic constant numbers identified</p>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2.5 max-h-[220px] overflow-y-auto font-mono text-xs">
                      {result.numbers.map((num, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 bg-slate-950 text-slate-300 rounded border border-slate-800 hover:border-indigo-500/30 transition cursor-default"
                        >
                          {num}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </LayoutShell>
  );
}
