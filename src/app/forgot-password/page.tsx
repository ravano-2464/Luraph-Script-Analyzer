'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Key, ArrowRight, AlertCircle, Loader, Mail, HelpCircle, CheckCircle, ArrowLeft } from 'lucide-react';

function ForgotPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const username = searchParams.get('username') || '';
  const method = searchParams.get('method') || 'pin'; // 'pin' or 'question'

  // Loading & States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState<string | null>(null);
  
  // PIN flow states
  const [pinSent, setPinSent] = useState(false);
  const [pin, setPin] = useState('');
  const [simulatedEmail, setSimulatedEmail] = useState<{ email: string; token: string } | null>(null);

  // Question flow states
  const [securityAnswer, setSecurityAnswer] = useState('');

  // Fetch security question if method is question
  useEffect(() => {
    if (!username) {
      router.push('/find-account');
      return;
    }

    if (method === 'question') {
      const fetchQuestion = async () => {
        setLoading(true);
        try {
          const res = await fetch('/api/auth/find-account', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: username }),
          });
          const data = await res.json();
          if (data.success && data.user.securityQuestion) {
            setSecurityQuestion(data.user.securityQuestion);
          } else {
            setError('This account does not have a security question configured. Please use PIN recovery.');
          }
        } catch {
          setError('Failed to fetch security question details.');
        } finally {
          setLoading(false);
        }
      };
      fetchQuestion();
    }
  }, [username, method, router]);

  // Handle triggering PIN send
  const handleSendPin = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send recovery PIN');
      }

      setPinSent(true);
      if (data.simulation) {
        setSimulatedEmail({
          email: data.simulation.email,
          token: data.simulation.resetToken
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Submit PIN verification to proceed to reset
  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 6) {
      setError('Please enter a valid 6-digit PIN.');
      return;
    }
    // Forward to reset password page with username and token
    router.push(`/reset-password?username=${encodeURIComponent(username)}&token=${encodeURIComponent(pin)}`);
  };

  // Submit Security Question to proceed to reset
  const handleVerifyQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!securityAnswer.trim()) {
      setError('Please provide an answer to the security question.');
      return;
    }
    // Forward to reset password page with username and answer
    router.push(`/reset-password?username=${encodeURIComponent(username)}&answer=${encodeURIComponent(securityAnswer)}`);
  };

  return (
    <div className="w-full">
      {/* Simulation Email Toast Popups */}
      <AnimatePresence>
        {simulatedEmail && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 max-w-sm p-5 rounded-2xl border border-indigo-500/30 bg-slate-950 shadow-2xl z-50 space-y-3"
          >
            <div className="flex items-center gap-2.5 text-indigo-400 font-bold text-xs uppercase tracking-wider">
              <Mail className="w-4 h-4 shrink-0" />
              <span>Simulated Email client</span>
            </div>
            <div className="text-xs text-slate-300 leading-relaxed border-t border-slate-900 pt-3">
              <p><strong>To:</strong> {simulatedEmail.email}</p>
              <p className="mt-1"><strong>Subject:</strong> Password Recovery PIN</p>
              <p className="mt-3 text-slate-400">
                You requested a recovery PIN to reset your password. Use the following 6-digit verification code:
              </p>
              <div className="my-4 text-center">
                <span className="px-4 py-2 bg-indigo-600/10 border border-indigo-500/30 rounded-lg text-2xl font-mono font-bold tracking-widest text-indigo-300">
                  {simulatedEmail.token}
                </span>
              </div>
              <p className="text-[10px] text-slate-500">
                *This is a local environment simulation. In production, this would be dispatched to the email server.
              </p>
            </div>
            <button
              onClick={() => setSimulatedEmail(null)}
              className="w-full py-1.5 bg-slate-900 hover:bg-slate-850 rounded-lg text-[10px] font-bold text-slate-400 hover:text-white transition"
            >
              Dismiss Inbox Preview
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col items-center mb-8">
        <div className="p-3 bg-indigo-600/20 border border-indigo-500/30 rounded-xl mb-4 text-indigo-400">
          <Shield className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-white tracking-wide">Account Verification</h1>
        <p className="text-slate-400 text-sm mt-1 text-center">
          {method === 'pin' ? 'Verify your identity using a recovery PIN' : 'Verify your identity with your challenge question'}
        </p>
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

      {/* Loading state indicator for API question fetch */}
      {loading && !pinSent && !securityQuestion && (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <Loader className="w-8 h-8 text-indigo-500 animate-spin mb-2" />
          <p className="text-slate-500 text-xs">Querying security configurations...</p>
        </div>
      )}

      {/* 1. PIN recovery layout */}
      {method === 'pin' && (
        <div className="space-y-6">
          {!pinSent ? (
            <div className="space-y-4">
              <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-xl text-xs text-slate-400 leading-relaxed flex gap-3">
                <Mail className="w-5 h-5 text-indigo-400 shrink-0" />
                <p>We will generate a 6-digit recovery code and dispatch it to your registered recovery email address. For testing, it will also display in a popup on your screen.</p>
              </div>
              <button
                onClick={handleSendPin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-lg hover:shadow-indigo-500/20 transition active:scale-[0.98]"
              >
                {loading ? <Loader className="w-5 h-5 animate-spin" /> : 'Send Recovery PIN'}
              </button>
            </div>
          ) : (
            <form onSubmit={handleVerifyPin} className="space-y-5">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 text-emerald-400">
                <CheckCircle className="w-5 h-5 shrink-0" />
                <p className="text-xs">PIN code sent! Verify your inbox and enter the code below.</p>
              </div>

              <div>
                <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">6-Digit PIN Code</label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full pl-10 pr-4 py-3 bg-slate-950/60 border border-slate-800 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition text-center tracking-widest font-mono text-xl"
                    placeholder="000000"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg shadow-lg hover:shadow-indigo-500/20 transition active:scale-[0.98]"
              >
                Verify Code & Reset
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>
          )}
        </div>
      )}

      {/* 2. Security Question challenge layout */}
      {method === 'question' && securityQuestion && (
        <form onSubmit={handleVerifyQuestion} className="space-y-5">
          <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5" />
              Security Challenge Question
            </span>
            <p className="text-white text-sm font-semibold">{securityQuestion}</p>
          </div>

          <div>
            <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">Your Answer</label>
            <input
              type="text"
              required
              value={securityAnswer}
              onChange={(e) => setSecurityAnswer(e.target.value)}
              className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
              placeholder="Enter answer (case-insensitive)"
            />
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg shadow-lg hover:shadow-indigo-500/20 transition active:scale-[0.98]"
          >
            Verify Answer & Reset
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>
      )}

      <div className="mt-8 flex items-center justify-between border-t border-slate-800/80 pt-6 text-xs font-semibold">
        <Link href="/find-account" className="flex items-center gap-1.5 text-slate-400 hover:text-white transition">
          <ArrowLeft className="w-4 h-4" />
          Change Method
        </Link>
        <Link href="/login" className="text-indigo-400 hover:text-indigo-300 transition underline">
          Cancel & Log In
        </Link>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
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
        <Suspense fallback={
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <Loader className="w-8 h-8 text-indigo-500 animate-spin mb-2" />
            <p className="text-slate-500 text-xs">Loading page dependencies...</p>
          </div>
        }>
          <ForgotPasswordContent />
        </Suspense>
      </motion.div>
    </div>
  );
}
