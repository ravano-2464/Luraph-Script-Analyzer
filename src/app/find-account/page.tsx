'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Search, User, ArrowRight, AlertCircle, Loader, CheckCircle, HelpCircle, Mail } from 'lucide-react';
import { useToast } from '@/components/ToastContext';

export default function FindAccountPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [foundUser, setFoundUser] = useState<{
    username: string;
    email: string | null;
    hasSecurityQuestion: boolean;
    securityQuestion: string | null;
  } | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setFoundUser(null);

    try {
      const response = await fetch('/api/auth/find-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to locate account');
      }

      setFoundUser(data.user);
      showToast('Account located successfully!', 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred while looking up account';
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#060814] px-4 relative overflow-hidden">
      {/* Decorative background glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md p-8 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-md relative z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-indigo-600/20 border border-indigo-500/30 rounded-xl mb-4 text-indigo-400">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-wide">Find Your Account</h1>
          <p className="text-slate-400 text-sm mt-1 text-center">Enter your username or email address to locate your security account</p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-sm mb-6"
          >
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {!foundUser ? (
            /* Search Panel */
            <motion.form
              key="search-form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onSubmit={handleSearch}
              className="space-y-5"
            >
              <div>
                <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">Username or Email</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-950/60 border border-slate-800 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                    placeholder="Enter username or email"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-lg hover:shadow-indigo-500/20 transition active:scale-[0.98]"
              >
                {loading ? (
                  <Loader className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Search Account
                    <Search className="w-5 h-5" />
                  </>
                )}
              </button>
            </motion.form>
          ) : (
            /* Account Found View */
            <motion.div
              key="result-view"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 text-emerald-400">
                <CheckCircle className="w-6 h-6 shrink-0" />
                <div>
                  <h4 className="font-bold text-sm">Account Located!</h4>
                  <p className="text-xs text-emerald-500/80">Select a recovery method to reset your password.</p>
                </div>
              </div>

              <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-xl space-y-2 text-sm text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">Username:</span>
                  <span className="font-bold text-white">{foundUser.username}</span>
                </div>
                {foundUser.email && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Recovery Email:</span>
                    <span className="font-mono">{foundUser.email}</span>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {/* Flow Option 1: Security Question */}
                {foundUser.hasSecurityQuestion && (
                  <button
                    onClick={() => router.push(`/forgot-password?username=${encodeURIComponent(foundUser.username)}&method=question`)}
                    className="w-full flex items-center justify-between p-4 bg-indigo-600/10 hover:bg-indigo-600/15 border border-indigo-500/25 hover:border-indigo-500/40 text-indigo-300 rounded-xl transition text-left font-semibold text-xs group"
                  >
                    <div className="flex items-center gap-3">
                      <HelpCircle className="w-5 h-5 text-indigo-400" />
                      <div>
                        <p className="text-white text-sm font-bold">Answer Security Question</p>
                        <p className="text-slate-400 text-[10px] mt-0.5">Use your configured challenge hint question</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-indigo-400 group-hover:translate-x-0.5 transition" />
                  </button>
                )}

                {/* Flow Option 2: 6-Digit PIN Email */}
                <button
                  onClick={() => router.push(`/forgot-password?username=${encodeURIComponent(foundUser.username)}&method=pin`)}
                  className="w-full flex items-center justify-between p-4 bg-cyan-600/10 hover:bg-cyan-600/15 border border-cyan-500/25 hover:border-cyan-500/40 text-cyan-300 rounded-xl transition text-left font-semibold text-xs group"
                >
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-cyan-400" />
                    <div>
                      <p className="text-white text-sm font-bold">Send Recovery PIN</p>
                      <p className="text-slate-400 text-[10px] mt-0.5">
                        {foundUser.email ? 'Receive a 6-digit code via email' : 'Generate recovery PIN (console log debug)'}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-cyan-400 group-hover:translate-x-0.5 transition" />
                </button>
              </div>

              <button
                onClick={() => setFoundUser(null)}
                className="w-full text-center text-slate-500 hover:text-slate-300 transition text-xs font-semibold"
              >
                Not your account? Search again
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-8 text-center border-t border-slate-800/80 pt-6">
          <p className="text-slate-400 text-sm">
            Remembered password?{' '}
            <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold underline transition">
              Sign In
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
