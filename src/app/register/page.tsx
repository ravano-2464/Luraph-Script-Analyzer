'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Key, User, ArrowRight, AlertCircle, Loader, Eye, EyeOff, Mail, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '@/components/ToastContext';

export default function RegisterPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [isQuestionSelectOpen, setIsQuestionSelectOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, email, securityQuestion, securityAnswer }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('token', data.token);

      showToast(`Account "${data.user.username}" created successfully!`, 'success');
      router.push('/');
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred during registration';
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#060814] px-4 relative overflow-hidden">
      {/* Decorative background glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md p-8 rounded-2xl glass-panel relative z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-cyan-600/20 border border-cyan-500/30 rounded-xl mb-4 text-cyan-400">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-wide">Create Account</h1>
          <p className="text-slate-400 text-sm mt-1">Get started with Luraph Script Analyzer</p>
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">Username</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                placeholder="Choose username"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">Email Address (Optional)</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">Security Question (Optional)</label>
            <div className="relative">
              <HelpCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <select
                value={securityQuestion}
                onChange={(e) => {
                  setSecurityQuestion(e.target.value);
                  setIsQuestionSelectOpen(false);
                  (e.target as HTMLSelectElement).blur();
                }}
                onFocus={() => setIsQuestionSelectOpen(true)}
                onBlur={() => setIsQuestionSelectOpen(false)}
                className="w-full pl-10 pr-10 py-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-slate-300 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition appearance-none cursor-pointer"
              >
                <option value="" className="bg-slate-950 text-slate-500">No Security Question</option>
                <option value="What is the name of your first pet?" className="bg-slate-950">What is the name of your first pet?</option>
                <option value="What was the name of your first school?" className="bg-slate-950">What was the name of your first school?</option>
                <option value="In what city were you born?" className="bg-slate-950">In what city were you born?</option>
                <option value="What is your favorite book/movie?" className="bg-slate-950">What is your favorite book/movie?</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                {isQuestionSelectOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </div>
          </div>

          <AnimatePresence>
            {securityQuestion && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">Security Answer</label>
                <input
                  type="text"
                  required={!!securityQuestion}
                  value={securityAnswer}
                  onChange={(e) => setSecurityAnswer(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                  placeholder="Enter your security answer"
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div>
            <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">Password</label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                placeholder="Choose password (min 6 characters)"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">Confirm Password</label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                placeholder="Confirm password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition focus:outline-none"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-cyan-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-lg hover:shadow-cyan-500/20 transition active:scale-[0.98] mt-4"
          >
            {loading ? (
              <Loader className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Register Account
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-slate-800/80 pt-6">
          <p className="text-slate-400 text-sm">
            Already have an account?{' '}
            <Link href="/login" className="text-cyan-400 hover:text-cyan-300 font-semibold underline transition">
              Sign In
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
