'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Key, Eye, EyeOff, Loader, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { useToast } from '@/components/ToastContext';

function ResetPasswordContent() {
  const router = useRouter();
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const username = searchParams.get('username') || '';
  const token = searchParams.get('token') || null;
  const answer = searchParams.get('answer') || null;

  // Form States
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // If parameters are missing, redirect to find account
  if (!username || (!token && !answer)) {
    if (typeof window !== 'undefined') {
      router.push('/find-account');
    }
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      const payload: Record<string, string | null> = {
        username,
        newPassword
      };

      if (token) payload.resetToken = token;
      if (answer) payload.securityAnswer = answer;

      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Password reset failed');
      }

      setSuccess(true);
      showToast('Password reset successfully! You can now log in with your new credentials.', 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred during password reset';
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col items-center mb-8">
        <div className="p-3 bg-indigo-600/20 border border-indigo-500/30 rounded-xl mb-4 text-indigo-400">
          <Shield className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-white tracking-wide">Reset Password</h1>
        <p className="text-slate-400 text-sm mt-1 text-center">
          Securely define your new credentials for account <strong className="text-slate-200">@{username}</strong>
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

      <AnimatePresence mode="wait">
        {!success ? (
          /* Password Form */
          <motion.form
            key="reset-form"
            onSubmit={handleSubmit}
            className="space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div>
              <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">New Password</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 bg-slate-950/60 border border-slate-800 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  placeholder="Minimum 6 characters"
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
              <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">Confirm New Password</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 bg-slate-950/60 border border-slate-800 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  placeholder="Confirm new password"
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
              className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-lg hover:shadow-indigo-500/20 transition active:scale-[0.98] mt-6"
            >
              {loading ? (
                <Loader className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Change Password
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </motion.form>
        ) : (
          /* Password Changed Successfully */
          <motion.div
            key="success-view"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-6"
          >
            <div className="flex flex-col items-center">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full mb-4 animate-bounce">
                <CheckCircle className="w-12 h-12" />
              </div>
              <h2 className="text-xl font-bold text-white">Password Reset Successful!</h2>
              <p className="text-slate-400 text-xs mt-2 max-w-xs mx-auto">
                Your credentials have been successfully updated. You can now log in to the dashboard using your new password.
              </p>
            </div>

            <Link
              href="/login"
              className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg shadow-lg hover:shadow-indigo-500/20 transition active:scale-[0.98]"
            >
              Go to Login Page
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ResetPasswordPage() {
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
          <ResetPasswordContent />
        </Suspense>
      </motion.div>
    </div>
  );
}
