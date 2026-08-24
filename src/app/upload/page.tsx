'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import LayoutShell from '@/components/LayoutShell';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, Terminal, FileCode2, Info, ArrowRight,
  Loader, CheckCircle2, AlertCircle, FileType
} from 'lucide-react';

export default function UploadPage() {
  const router = useRouter();
  const [filename, setFilename] = useState('');
  const [content, setContent] = useState('');
  const [customLanguage, setCustomLanguage] = useState('auto');
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [step, setStep] = useState(0); // Progress tracker steps
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stepsList = [
    'Validating file structure...',
    'Hashing content & calculating checksums...',
    'Generating Abstract Syntax Tree...',
    'Traversing AST & running security heuristics...',
    'Writing analysis models to DB database...',
    'Completed successfully!'
  ];

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'js' && ext !== 'lua' && ext !== 'txt') {
      setError('Only .js and .lua script files are supported.');
      return;
    }

    setFilename(file.name);
    setError('');

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setContent(event.target.result as string);
      }
    };
    reader.readAsText(file);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content) {
      setError('Please paste script contents or drop a file first.');
      return;
    }

    setError('');
    setUploading(true);
    setStep(0);

    // Simulate progress updates for a smoother visual response
    const interval = setInterval(() => {
      setStep((prev) => {
        if (prev < stepsList.length - 2) {
          return prev + 1;
        }
        return prev;
      });
    }, 700);

    try {
      const response = await fetch('/api/scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: filename || `pasted_script_${Date.now()}`,
          content,
          customLanguage,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Pipeline execution failed');
      }

      clearInterval(interval);
      setStep(stepsList.length - 1); // Finished step

      // Delay briefly for visual satisfaction before navigating
      setTimeout(() => {
        router.push(`/analysis/${data.scriptId}`);
      }, 600);

    } catch (err: any) {
      clearInterval(interval);
      setError(err.message || 'An error occurred during static analysis execution.');
      setUploading(false);
    }
  };

  return (
    <LayoutShell>
      <div className="max-w-4xl mx-auto space-y-8 pb-12">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Upload Script Center</h1>
          <p className="text-text-muted text-sm mt-1">Upload scripts to calculate code quality ratings, trace AST nodes, and compile security audits.</p>
        </div>

        {error && (
          <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-bold">Execution Failed</p>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {!uploading ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Drag Drop Area */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={triggerFileInput}
              className={`p-10 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition ${
                dragActive
                  ? 'border-indigo-500 bg-indigo-500/5'
                  : 'border-slate-800 hover:border-slate-700 bg-slate-900/10'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                accept=".js,.lua"
                className="hidden"
              />
              <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl mb-4">
                <Upload className="w-8 h-8" />
              </div>
              <p className="text-white font-bold text-base">Drag & drop your script here</p>
              <p className="text-slate-400 text-xs mt-1.5 mb-6">Supports JS/Lua script formats up to 2MB size</p>
              <button
                type="button"
                className="px-5 py-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-300 font-semibold transition"
              >
                Browse Local Files
              </button>
              {filename && (
                <div className="mt-6 flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-300 text-xs font-semibold">
                  <FileCode2 className="w-4 h-4" />
                  Loaded: {filename}
                </div>
              )}
            </div>

            {/* Language Selector */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="md:col-span-2">
                <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">Manual Target Language</label>
                <div className="flex items-center gap-2">
                  {[
                    { id: 'auto', label: 'Heuristic Auto-Detect', icon: FileType },
                    { id: 'js', label: 'JavaScript (Babel)', icon: Terminal },
                    { id: 'lua', label: 'Lua Parser (Luaparse)', icon: FileCode2 },
                  ].map((lang) => {
                    const Icon = lang.icon;
                    return (
                      <button
                        key={lang.id}
                        type="button"
                        onClick={() => setCustomLanguage(lang.id)}
                        className={`flex-1 flex items-center justify-center gap-2.5 py-2.5 rounded-lg border text-xs font-semibold transition ${
                          customLanguage === lang.id
                            ? 'bg-indigo-600/15 border-indigo-500 text-indigo-300'
                            : 'bg-slate-950/40 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {lang.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="p-4 bg-slate-900/30 border border-slate-800/80 rounded-xl flex gap-3 text-slate-400 text-xs leading-relaxed self-end">
                <Info className="w-5 h-5 text-indigo-400 shrink-0" />
                <p>Audits comply with sandbox rules. Unsafe calls are logged statically. Code is never run on host server.</p>
              </div>
            </div>

            {/* Direct Paste Area */}
            <div className="space-y-2">
              <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider">Or Paste Script Content Directly</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="function decrypt(str) { ... } // or local str = '...' "
                className="w-full h-80 px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 font-mono text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
              />
            </div>

            <button
              type="submit"
              disabled={!content}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg hover:shadow-indigo-500/20 transition active:scale-[0.98]"
            >
              Analyze Script Content
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>
        ) : (
          /* Uploading and Executing Pipeline View */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-8 border border-slate-800 bg-[#0c0f1d] rounded-2xl flex flex-col items-center justify-center text-center space-y-8 min-h-[400px]"
          >
            <div className="relative">
              <Loader className="w-16 h-16 text-indigo-500 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center text-indigo-400 font-bold text-xs">
                {Math.round((step / (stepsList.length - 1)) * 100)}%
              </div>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Analyzing Obfuscation Patterns</h3>
              <p className="text-slate-400 text-xs mt-1.5 max-w-sm">Static code engine is walking the AST nodes looking for code vulnerabilities and control loops.</p>
            </div>

            <div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-xl p-4 text-left font-mono text-xs space-y-3">
              {stepsList.map((sText, idx) => {
                const isDone = idx < step;
                const isCurrent = idx === step;
                return (
                  <div
                    key={sText}
                    className={`flex items-center gap-3 transition-opacity duration-300 ${
                      isDone ? 'text-emerald-400' : isCurrent ? 'text-indigo-400' : 'text-slate-600'
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                    ) : isCurrent ? (
                      <Loader className="w-4 h-4 animate-spin shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-slate-800 shrink-0" />
                    )}
                    <span>{sText}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>
    </LayoutShell>
  );
}
