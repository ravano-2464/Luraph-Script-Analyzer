'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import LayoutShell from '@/components/LayoutShell';
import Editor from '@monaco-editor/react';
import { motion } from 'framer-motion';
import { ReactFlow, Background, Controls, Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  ShieldAlert, Code, Network, Database, Terminal, FileSpreadsheet,
  Workflow, GitGraph, FileText, Play, ServerCrash, RefreshCw,
  AlertTriangle, CheckCircle, Search, ChevronLeft, ChevronRight, ShieldCheck, ChevronDown, ChevronUp
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// Sub-components definitions
interface ASTNode {
  id: string;
  type: string;
  label: string;
  range: [number, number];
  loc: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
  children: ASTNode[];
}

interface AnalysisLog {
  id: string;
  event: string;
  timestamp: string;
}

interface CodeMetrics {
  loc: number;
  functionCount: number;
  variableCount: number;
  stringCount: number;
  branchCount: number;
  loopCount: number;
  cyclomaticComplexity: number;
  maxNestingDepth: number;
}

interface ScriptAnalysis {
  id: string;
  obfuscationScore: number;
  riskScore: number;
  metrics?: CodeMetrics;
  logs?: AnalysisLog[];
}

interface ScriptData {
  id: string;
  filename: string;
  content: string;
  fileSize: number;
  language: string;
  complexity: string;
  status: string;
  createdAt: string;
  analyses: ScriptAnalysis[];
}

interface FunctionData {
  id: string;
  analysisId: string;
  name: string;
  params: string;
  startLine: number;
  endLine: number;
  cyclomaticComplexity: number;
  riskScore: number;
}

interface StringLiteralData {
  id: string;
  analysisId: string;
  value: string;
  category: string;
  confidence?: number;
  line?: number;
  column?: number;
}

interface DependencyData {
  id: string;
  name: string;
  type: 'External' | 'Internal' | 'BrowserAPI' | 'NodeAPI' | 'Unknown';
}

interface NetworkEventData {
  id: string;
  url: string;
  type: 'fetch' | 'xhr' | 'websocket' | 'http_library';
  line?: number;
}

interface SecurityFindingData {
  id: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  category: string;
  message: string;
  line?: number;
  codeSnippet?: string;
}

interface SandboxLogData {
  timestamp: string;
  type: 'info' | 'log' | 'warn' | 'error' | 'security';
  message: string;
}

interface MonacoEditorInstance {
  revealLineInCenter: (line: number) => void;
  setSelection: (selection: unknown) => void;
  focus: () => void;
}

interface MonacoInstance {
  Selection: new (startLine: number, startCol: number, endLine: number, endCol: number) => unknown;
}

export default function AnalysisStudio() {
  const { id } = useParams() as { id: string };
  const editorRef = useRef<MonacoEditorInstance | null>(null);
  const monacoRef = useRef<MonacoInstance | null>(null);
  const tabHeaderRef = useRef<HTMLDivElement>(null);

  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabHeaderRef.current) {
      const scrollAmount = 200;
      tabHeaderRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // States
  const [script, setScript] = useState<ScriptData | null>(null);
  const [activeTab, setActiveTab] = useState<'obfuscation' | 'security' | 'strings' | 'functions' | 'controlFlow' | 'ast' | 'sandbox' | 'dependencies' | 'metrics'>('obfuscation');
  const [loading, setLoading] = useState(true);
  const [isStringFilterOpen, setIsStringFilterOpen] = useState(false);

  // Detailed analysis category lists
  const [functions, setFunctions] = useState<FunctionData[]>([]);
  const [strings, setStrings] = useState<StringLiteralData[]>([]);
  const [dependencies, setDependencies] = useState<DependencyData[]>([]);
  const [network, setNetwork] = useState<NetworkEventData[]>([]);
  const [security, setSecurity] = useState<SecurityFindingData[]>([]);
  const [metrics, setMetrics] = useState<CodeMetrics | null>(null);
  const [astTree, setAstTree] = useState<ASTNode | null>(null);
  const [flowGraph, setFlowGraph] = useState<{ nodes: Node[]; edges: Edge[] }>({ nodes: [], edges: [] });
  
  // Sandbox states
  const [sandboxLogs, setSandboxLogs] = useState<SandboxLogData[]>([]);
  const [runningSandbox, setRunningSandbox] = useState(false);
  const [sandboxSpawned, setSandboxSpawned] = useState(false);

  // Filters
  const [stringFilter, setStringFilter] = useState('ALL');
  const [stringSearch, setStringSearch] = useState('');
  const [selectedFunc, setSelectedFunc] = useState<FunctionData | null>(null);

  // Monaco Editor Mounting
  const handleEditorDidMount = (editor: unknown, monaco: unknown) => {
    editorRef.current = editor as MonacoEditorInstance;
    monacoRef.current = monaco as MonacoInstance;
  };

  const highlightLineRange = (startLine: number, endLine: number) => {
    if (editorRef.current && monacoRef.current) {
      editorRef.current.revealLineInCenter(startLine);
      editorRef.current.setSelection(new monacoRef.current.Selection(
        startLine, 1, endLine, 100
      ));
      editorRef.current.focus();
    }
  };

  useEffect(() => {
    const fetchScriptData = async () => {
      try {
        const res = await fetch(`/api/scripts/${id}`);
        const data = await res.json();
        if (data.success) {
          setScript(data.script);
        }
      } catch {
        console.error('Failed to retrieve script metadata');
      }
    };

    const fetchPanelData = async (type: string) => {
      try {
        const res = await fetch(`/api/scripts/${id}/${type}`);
        const data = await res.json();
        if (data.success) {
          if (type === 'functions') setFunctions(data.data || []);
          if (type === 'strings') setStrings(data.data || []);
          if (type === 'dependencies') setDependencies(data.data || []);
          if (type === 'network') setNetwork(data.data || []);
          if (type === 'security') setSecurity(data.data || []);
          if (type === 'metrics') setMetrics(data.data || []);
          if (type === 'ast') setAstTree(data.data);
          if (type === 'control-flow') setFlowGraph(data.data || { nodes: [], edges: [] });
        }
      } catch {
        console.error(`Failed to load ${type} data`);
      }
    };

    const initLoad = async () => {
      setLoading(true);
      await fetchScriptData();
      await Promise.all([
        fetchPanelData('obfuscation'),
        fetchPanelData('functions'),
        fetchPanelData('strings'),
        fetchPanelData('dependencies'),
        fetchPanelData('network'),
        fetchPanelData('security'),
        fetchPanelData('metrics'),
        fetchPanelData('ast'),
        fetchPanelData('control-flow')
      ]);
      setLoading(false);
    };
    initLoad();
  }, [id]);

  // Run Code Sandbox Action
  const triggerSandboxRun = async () => {
    setRunningSandbox(true);
    setSandboxSpawned(true);
    setSandboxLogs([{ timestamp: new Date().toISOString(), type: 'info', message: 'Provisioning isolated Docker VM...' }]);

    try {
      const res = await fetch(`/api/scripts/${id}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runSandbox: true })
      });
      const data = await res.json();
      if (data.success) {
        setSandboxLogs(data.sandboxLogs || []);
      } else {
        setSandboxLogs(prev => [...prev, { timestamp: new Date().toISOString(), type: 'error', message: data.error || 'Sandbox run failed.' }]);
      }
    } catch {
      setSandboxLogs(prev => [...prev, { timestamp: new Date().toISOString(), type: 'error', message: 'Failed to contact host sandbox engine.' }]);
    } finally {
      setRunningSandbox(false);
    }
  };

  if (loading) {
    return (
      <LayoutShell>
        <div className="flex flex-col items-center justify-center h-[70vh] gap-4">
          <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin" />
          <p className="text-slate-400 text-sm font-semibold">Loading Script Audits...</p>
        </div>
      </LayoutShell>
    );
  }

  if (!script) {
    return (
      <LayoutShell>
        <div className="flex flex-col items-center justify-center h-[70vh] gap-4">
          <ServerCrash className="w-12 h-12 text-rose-500" />
          <p className="text-slate-400 text-sm font-semibold">Script profile not found.</p>
        </div>
      </LayoutShell>
    );
  }

  const latestAnalysis = script.analyses[0] || {};
  const obfuscationScore = latestAnalysis.obfuscationScore || 10;
  const riskScore = latestAnalysis.riskScore || 5;

  // Filter String Literals
  const filteredStrings = strings.filter(s => {
    const matchesCat = stringFilter === 'ALL' || s.category === stringFilter;
    const matchesSearch = s.value.toLowerCase().includes(stringSearch.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // Render AST Tree Recursively
  const ASTNodeComponent = ({ node, depth = 0 }: { node: ASTNode; depth: number }) => {
    const [collapsed, setCollapsed] = useState(true);
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div className="text-xs font-mono select-none">
        <div
          onClick={() => {
            if (hasChildren) setCollapsed(!collapsed);
            highlightLineRange(node.loc.start.line, node.loc.end.line);
          }}
          className="flex items-center gap-1.5 py-1 px-2 rounded hover:bg-slate-900 cursor-pointer text-slate-300"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {hasChildren ? (
            <ChevronRight className={`w-3.5 h-3.5 text-slate-500 transition-transform ${!collapsed ? 'rotate-90' : ''}`} />
          ) : (
            <div className="w-3.5 h-3.5" />
          )}
          <span className="text-indigo-400 font-bold">{node.type}</span>
          <span className="text-slate-400 truncate max-w-[200px]">{node.label}</span>
        </div>
        {!collapsed && hasChildren && (
          <div>
            {node.children.map((child, idx) => (
              <ASTNodeComponent key={idx} node={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <LayoutShell>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 h-[calc(100vh-140px)] min-h-[500px]">
        {/* Left Side: Monaco Code Editor */}
        <div className="flex flex-col border border-slate-800 bg-[#070915] rounded-2xl overflow-hidden shadow-2xl relative">
          <div className="px-5 py-3 border-b border-slate-800/80 bg-slate-900/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Code className="w-4 h-4 text-indigo-400" />
              <span className="font-bold text-sm text-slate-200">{script.filename}</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-950 text-slate-400 border border-slate-800">
                {script.language.toUpperCase()}
              </span>
            </div>
            <Link
              href={`/reports/${script.id}`}
              className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition"
            >
              <FileText className="w-3.5 h-3.5" />
              Full Audit Report
            </Link>
          </div>

          <div className="flex-1 min-h-0 relative">
            <Editor
              height="100%"
              language={script.language === 'lua' ? 'lua' : 'javascript'}
              theme="vs-dark"
              value={script.content}
              options={{
                readOnly: true,
                minimap: { enabled: true },
                fontSize: 12,
                fontFamily: 'Consolas, monospace',
                lineNumbers: 'on',
                folding: true,
                wordWrap: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
              }}
              onMount={handleEditorDidMount}
            />
          </div>
        </div>

        {/* Right Side: Multi-Panel Tab Section */}
        <div className="flex flex-col border border-slate-800 bg-[#070915] rounded-2xl overflow-hidden shadow-2xl">
          {/* Tab Navigation header */}
          <div className="relative flex items-center border-b border-slate-800 bg-[#0a0d20]/50 shrink-0">
            <button
              type="button"
              onClick={() => scrollTabs('left')}
              className="flex items-center justify-center w-8 h-12 text-slate-500 hover:text-slate-200 hover:bg-slate-900/30 border-r border-slate-800 transition shrink-0 cursor-pointer focus:outline-none"
              title="Scroll Left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div
              ref={tabHeaderRef}
              className="flex-1 flex overflow-x-auto whitespace-nowrap scrollbar-thin scroll-smooth"
            >
              {[
                { id: 'obfuscation', label: 'Obfuscation', icon: AlertTriangle },
                { id: 'security', label: 'Security Warnings', icon: ShieldAlert },
                { id: 'strings', label: 'String Literals', icon: FileSpreadsheet },
                { id: 'functions', label: 'Functions Table', icon: Code },
                { id: 'controlFlow', label: 'Control Flow', icon: GitGraph },
                { id: 'ast', label: 'AST Explorer', icon: Workflow },
                { id: 'sandbox', label: 'Sandbox Monitor', icon: Terminal },
                { id: 'dependencies', label: 'Dependencies', icon: Database },
                { id: 'metrics', label: 'Metrics', icon: Network },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                    className={`flex items-center gap-2 px-5 h-12 text-xs font-semibold border-b-2 transition select-none cursor-pointer ${
                      isActive
                        ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                        : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => scrollTabs('right')}
              className="flex items-center justify-center w-8 h-12 text-slate-500 hover:text-slate-200 hover:bg-slate-900/30 border-l border-slate-800 transition shrink-0 cursor-pointer focus:outline-none"
              title="Scroll Right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Panel Body Content View */}
          <div className="flex-1 p-6 overflow-y-auto min-h-0 bg-slate-950/20">
            {/* OBFUSCATION PANEL */}
            {activeTab === 'obfuscation' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="p-5 rounded-xl border border-slate-800 bg-slate-950/40 flex flex-col items-center justify-center text-center">
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Obfuscation Score</span>
                    <div className="relative w-28 h-28 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="56" cy="56" r="46" stroke="#1e293b" strokeWidth="8" fill="transparent" />
                        <circle cx="56" cy="56" r="46" stroke="#6366f1" strokeWidth="8" fill="transparent"
                                strokeDasharray={2 * Math.PI * 46}
                                strokeDashoffset={2 * Math.PI * 46 * (1 - obfuscationScore / 100)} />
                      </svg>
                      <span className="absolute text-2xl font-black text-white">{obfuscationScore}%</span>
                    </div>
                    <span className="text-[10px] text-indigo-400 font-semibold tracking-wider mt-3">RATING: {obfuscationScore > 75 ? 'HIGH OBFUSCATION' : obfuscationScore > 40 ? 'MEDIUM OBFUSCATION' : 'CLEAN'}</span>
                  </div>

                  <div className="p-5 rounded-xl border border-slate-800 bg-slate-950/40 flex flex-col items-center justify-center text-center">
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Static Risk Score</span>
                    <div className="relative w-28 h-28 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="56" cy="56" r="46" stroke="#1e293b" strokeWidth="8" fill="transparent" />
                        <circle cx="56" cy="56" r="46" stroke="#ef4444" strokeWidth="8" fill="transparent"
                                strokeDasharray={2 * Math.PI * 46}
                                strokeDashoffset={2 * Math.PI * 46 * (1 - riskScore / 100)} />
                      </svg>
                      <span className="absolute text-2xl font-black text-white">{riskScore}%</span>
                    </div>
                    <span className="text-[10px] text-rose-400 font-semibold tracking-wider mt-3">RISK: {riskScore > 50 ? 'MALICIOUS FINDINGS' : 'SAFE'}</span>
                  </div>
                </div>

                <div className="p-5 rounded-xl border border-slate-800 bg-slate-950/40 space-y-4">
                  <h4 className="font-bold text-white text-sm">Detected Obfuscation Patterns</h4>
                  {latestAnalysis.obfuscationScore > 10 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {['Random identifiers (Hex patterns)', 'Excessive string encoding', 'Control-flow flattening patterns', 'Highly nested expressions'].map((pattern) => {
                        const scoreWeight = obfuscationScore > 60;
                        return (
                          <div key={pattern} className="flex items-center gap-2.5 p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300">
                            {scoreWeight ? (
                              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                            ) : (
                              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                            )}
                            <span>{pattern}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-xs text-slate-500">
                      No obfuscation patterns detected. Script matches standard developer structures.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SECURITY WARNINGS PANEL */}
            {activeTab === 'security' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <h4 className="font-bold text-white text-sm">Threat Findings ({security.length})</h4>
                </div>

                {security.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-950/40 rounded-xl border border-slate-800">
                    <ShieldCheck className="w-10 h-10 text-emerald-500 mb-3" />
                    <p className="text-white text-sm font-semibold">Clean Scan Summary</p>
                    <p className="text-slate-500 text-xs mt-1">No execution vulnerabilities or command execution patterns identified.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {security.map((sec, idx) => (
                      <div
                        key={idx}
                        onClick={() => sec.line && highlightLineRange(sec.line, sec.line)}
                        className={`p-4 rounded-xl border cursor-pointer hover:bg-slate-900/30 transition flex gap-3 ${
                          sec.severity === 'CRITICAL'
                            ? 'bg-rose-500/5 border-rose-500/20 hover:border-rose-500/40'
                            : sec.severity === 'HIGH'
                            ? 'bg-orange-500/5 border-orange-500/20 hover:border-orange-500/40'
                            : 'bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40'
                        }`}
                      >
                        <ShieldAlert className={`w-5 h-5 shrink-0 ${
                          sec.severity === 'CRITICAL' ? 'text-rose-500' : sec.severity === 'HIGH' ? 'text-orange-500' : 'text-amber-500'
                        }`} />
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-wider uppercase ${
                              sec.severity === 'CRITICAL' ? 'bg-rose-950 text-rose-400' : sec.severity === 'HIGH' ? 'bg-orange-950 text-orange-400' : 'bg-amber-950 text-amber-400'
                            }`}>
                              {sec.severity}
                            </span>
                            <span className="text-xs font-bold text-slate-300">{sec.category}</span>
                            {sec.line && <span className="text-[10px] text-slate-500 font-mono ml-auto">Line: {sec.line}</span>}
                          </div>
                          <p className="text-xs text-slate-400 leading-relaxed">{sec.message}</p>
                          {sec.codeSnippet && (
                            <pre className="p-2 bg-slate-950 border border-slate-900 rounded font-mono text-[10px] text-slate-500 truncate max-w-full">
                              {sec.codeSnippet}
                            </pre>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* STRINGS PANEL */}
            {activeTab === 'strings' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={stringSearch}
                      onChange={(e) => setStringSearch(e.target.value)}
                      placeholder="Filter strings..."
                      className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                  <div className="relative">
                    <select
                      value={stringFilter}
                      onChange={(e) => {
                        setStringFilter(e.target.value);
                        setIsStringFilterOpen(false);
                        (e.target as HTMLSelectElement).blur();
                      }}
                      onFocus={() => setIsStringFilterOpen(true)}
                      onBlur={() => setIsStringFilterOpen(false)}
                      className="pl-3 pr-8 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none appearance-none cursor-pointer"
                    >
                      <option value="ALL">All Categories</option>
                      <option value="URL">URLs</option>
                      <option value="IP">IPs</option>
                      <option value="Path">File Paths</option>
                      <option value="APIEndpoint">API Endpoints</option>
                      <option value="Encoded">Encoded strings</option>
                      <option value="ErrorMessage">Error Messages</option>
                      <option value="Normal">Normal Text</option>
                    </select>
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                      {isStringFilterOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                </div>

                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/20 max-h-[400px] overflow-y-auto">
                  {filteredStrings.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500">No matching string literals.</div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-bold">
                          <th className="py-2.5 px-4">Value</th>
                          <th className="py-2.5 px-4">Category</th>
                          <th className="py-2.5 px-4 text-right">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900 font-mono">
                        {filteredStrings.map((str, idx) => (
                          <tr
                            key={idx}
                            onClick={() => str.line && highlightLineRange(str.line, str.line)}
                            className="hover:bg-slate-900/40 cursor-pointer"
                          >
                            <td className="py-2.5 px-4 max-w-[220px] truncate text-slate-300 font-semibold" title={str.value}>
                              {str.value}
                            </td>
                            <td className="py-2.5 px-4">
                              <span className={`px-2 py-0.5 rounded-[4px] text-[10px] font-bold ${
                                str.category === 'Encoded'
                                  ? 'bg-rose-950 text-rose-400'
                                  : str.category === 'URL' || str.category === 'APIEndpoint'
                                  ? 'bg-cyan-950 text-cyan-400'
                                  : 'bg-slate-900 text-slate-400'
                              }`}>
                                {str.category}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              {str.category === 'Encoded' && str.confidence && (
                                <span className="text-[10px] text-rose-400 font-bold">Confidence: {str.confidence}%</span>
                              )}
                              {str.line && (
                                <span className="text-slate-500 text-[10px] font-mono block">Line: {str.line}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* FUNCTIONS PANEL */}
            {activeTab === 'functions' && (
              <div className="space-y-4">
                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/20 max-h-[400px] overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-bold">
                        <th className="py-2.5 px-4">Function</th>
                        <th className="py-2.5 px-4">Params</th>
                        <th className="py-2.5 px-4 text-right">Complexity</th>
                        <th className="py-2.5 px-4 text-right">Risk</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900 font-mono">
                      {functions.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-6 text-center text-xs text-slate-500">No function nodes identified.</td>
                        </tr>
                      ) : (
                        functions.map((fn, idx) => (
                          <tr
                            key={idx}
                            onClick={() => {
                              setSelectedFunc(fn);
                              highlightLineRange(fn.startLine, fn.endLine);
                            }}
                            className={`hover:bg-slate-900/40 cursor-pointer ${
                              selectedFunc?.name === fn.name ? 'bg-indigo-600/10' : ''
                            }`}
                          >
                            <td className="py-2.5 px-4 text-white font-semibold">{fn.name}</td>
                            <td className="py-2.5 px-4 text-slate-400">({fn.params || ''})</td>
                            <td className="py-2.5 px-4 text-right font-bold text-slate-300">{fn.cyclomaticComplexity}</td>
                            <td className="py-2.5 px-4 text-right font-bold">
                              <span className={fn.riskScore > 40 ? 'text-rose-400' : 'text-emerald-400'}>
                                {fn.riskScore}/100
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Specific Function Sub-Details Card */}
                {selectedFunc && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 space-y-3 text-xs leading-relaxed"
                  >
                    <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                      <h5 className="font-bold text-white">Function Details: <span className="text-indigo-400">{selectedFunc.name}</span></h5>
                      <span className="text-[10px] text-slate-500">Lines: {selectedFunc.startLine} - {selectedFunc.endLine}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-slate-500 font-bold uppercase text-[9px] tracking-wider">Params List</p>
                        <p className="font-semibold text-slate-300 font-mono mt-0.5">[{selectedFunc.params || 'None'}]</p>
                      </div>
                      <div>
                        <p className="text-slate-500 font-bold uppercase text-[9px] tracking-wider">Cyclomatic Density</p>
                        <p className="font-semibold text-slate-300 font-mono mt-0.5">{selectedFunc.cyclomaticComplexity} branches</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            {/* CONTROL FLOW GRAPH */}
            {activeTab === 'controlFlow' && (
              <div className="h-[400px] border border-slate-800 rounded-xl relative overflow-hidden bg-slate-950">
                {flowGraph.nodes.length === 0 ? (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-xs font-semibold">
                    No control flow graph mapped.
                  </div>
                ) : (
                  <ReactFlow
                    nodes={flowGraph.nodes}
                    edges={flowGraph.edges}
                    fitView
                    nodesDraggable={true}
                    nodesConnectable={false}
                  >
                    <Background color="#334155" gap={16} />
                    <Controls />
                  </ReactFlow>
                )}
              </div>
            )}

            {/* AST EXPLORER */}
            {activeTab === 'ast' && (
              <div className="border border-slate-800 rounded-xl bg-slate-950 p-4 max-h-[400px] overflow-y-auto">
                <p className="text-[10px] text-slate-500 mb-3 uppercase tracking-wider font-bold">Abstract Syntax Tree</p>
                {astTree ? (
                  <ASTNodeComponent node={astTree} depth={0} />
                ) : (
                  <p className="text-slate-600 text-xs">AST could not be compiled.</p>
                )}
              </div>
            )}

            {/* SANDBOX MONITOR */}
            {activeTab === 'sandbox' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={triggerSandboxRun}
                    disabled={runningSandbox}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition active:scale-[0.98]"
                  >
                    <Play className="w-4 h-4" />
                    {runningSandbox ? 'Running Sandbox VM...' : 'Execute Safe Sandbox'}
                  </button>
                  {sandboxSpawned && (
                    <button
                      onClick={() => { setSandboxLogs([]); setSandboxSpawned(false); }}
                      className="px-3 py-2 border border-slate-800 text-slate-400 hover:text-white rounded-lg text-xs font-semibold hover:border-slate-700"
                    >
                      Clear Console
                    </button>
                  )}
                </div>

                <div className="p-4 bg-black rounded-xl border border-slate-800 font-mono text-xs text-slate-300 h-64 overflow-y-auto space-y-2 relative">
                  {!sandboxSpawned ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 text-center px-6">
                      <Terminal className="w-8 h-8 text-slate-700 mb-2" />
                      <p className="font-bold text-xs">Isolated Sandbox Runner</p>
                      <p className="text-[10px] text-slate-600 mt-0.5">Click &apos;Execute Safe Sandbox&apos; to load code inside our Node VM boundary simulator.</p>
                    </div>
                  ) : (
                    sandboxLogs.map((log, idx) => (
                      <div
                        key={idx}
                        className={`flex gap-3 leading-relaxed ${
                          log.type === 'error'
                            ? 'text-rose-400'
                            : log.type === 'security'
                            ? 'text-amber-400 font-bold'
                            : log.type === 'warn'
                            ? 'text-yellow-300'
                            : 'text-slate-300'
                        }`}
                      >
                        <span className="text-slate-600 shrink-0">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                        <span>{log.message}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* DEPENDENCIES PANEL */}
            {activeTab === 'dependencies' && (
              <div className="space-y-6">
                <div>
                  <h4 className="font-bold text-white text-sm pb-2 border-b border-slate-900 mb-3">Module Dependencies ({dependencies.length})</h4>
                  {dependencies.length === 0 ? (
                    <p className="text-slate-600 text-xs">No package dependencies declared.</p>
                  ) : (
                    <div className="space-y-2">
                      {dependencies.map((dep, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                          <span className="font-mono text-slate-200 font-bold">{dep.name}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-950 text-indigo-400 border border-slate-800 uppercase">
                            {dep.type}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="font-bold text-white text-sm pb-2 border-b border-slate-900 mb-3">API / Network Endpoints ({network.length})</h4>
                  {network.length === 0 ? (
                    <p className="text-slate-600 text-xs">No web api requests identified.</p>
                  ) : (
                    <div className="space-y-2">
                      {network.map((net, idx) => (
                        <div
                          key={idx}
                          onClick={() => net.line && highlightLineRange(net.line, net.line)}
                          className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer text-xs"
                        >
                          <span className="font-mono text-cyan-400 font-semibold truncate max-w-[200px]">{net.url}</span>
                          <span className="text-[10px] text-slate-500 font-mono">Line: {net.line || 'Dynamic'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* METRICS PANEL */}
            {activeTab === 'metrics' && (
              <div className="space-y-6">
                {metrics ? (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { label: 'Lines of Code', val: metrics.loc },
                        { label: 'Functions Count', val: metrics.functionCount },
                        { label: 'Variables Count', val: metrics.variableCount },
                        { label: 'Cyclomatic Density', val: metrics.cyclomaticComplexity },
                      ].map((item) => (
                        <div key={item.label} className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 text-center">
                          <p className="text-slate-500 font-bold uppercase text-[9px] tracking-wider">{item.label}</p>
                          <p className="text-2xl font-extrabold text-white mt-1">{item.val}</p>
                        </div>
                      ))}
                    </div>

                    <div className="p-5 rounded-xl border border-slate-800 bg-slate-950/40">
                      <h4 className="font-bold text-white text-sm mb-4">Functional Size Metrics</h4>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={[
                            { name: 'Branches', count: metrics.branchCount },
                            { name: 'Loops', count: metrics.loopCount },
                            { name: 'Max Nesting', count: metrics.maxNestingDepth }
                          ]}>
                            <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                            <YAxis stroke="#94a3b8" fontSize={10} />
                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                            <Bar dataKey="count" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-slate-500 text-xs">Metrics aggregator is compiling datasets...</p>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </LayoutShell>
  );
}
