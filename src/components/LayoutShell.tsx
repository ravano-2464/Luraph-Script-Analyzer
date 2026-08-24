'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Shield, LayoutDashboard, UploadCloud, LogOut, User, Menu, X, Wand2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [username, setUsername] = useState('Developer');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const cachedUser = localStorage.getItem('user');
    if (cachedUser) {
      try {
        const u = JSON.parse(cachedUser);
        if (u.username) {
          Promise.resolve().then(() => {
            setUsername(u.username);
          });
        }
      } catch {}
    }
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      router.push('/login');
      router.refresh();
    } catch (e) {
      console.error('Logout failed:', e);
    }
  };

  const navLinks = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Upload Script', href: '/upload', icon: UploadCloud },
    { name: 'Luraph Deobfuscator', href: '/deobfuscate', icon: Wand2 },
  ];

  return (
    <div className="flex h-screen bg-[#060814] text-slate-100 overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-[#0a0d20] border-r border-slate-800/80 shrink-0">
        <div className="flex items-center gap-3 px-6 h-16 border-b border-slate-800/80">
          <div className="p-1.5 bg-indigo-500/20 rounded-lg text-indigo-400 border border-indigo-500/20">
            <Shield className="w-5 h-5" />
          </div>
          <span className="font-bold text-white tracking-wide text-sm">Luraph Analyzer</span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition ${
                  isActive
                    ? 'bg-indigo-600/15 text-indigo-300 border-l-2 border-indigo-500'
                    : 'text-slate-400 hover:bg-slate-900/50 hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {link.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800/80 bg-slate-950/20">
          <div className="flex items-center gap-3 px-2 py-3 rounded-lg bg-slate-950/40 border border-slate-800/40 mb-3">
            <div className="w-8 h-8 rounded-full bg-indigo-600/30 flex items-center justify-center text-indigo-300 font-bold border border-indigo-500/20">
              <User className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">{username}</p>
              <p className="text-[10px] text-indigo-400 font-bold tracking-wider uppercase">Auditor</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-rose-500/30 hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 text-sm font-semibold transition active:scale-[0.98]"
          >
            <LogOut className="w-4 h-4" />
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Panel Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-6 h-16 bg-[#0a0d20]/50 backdrop-blur border-b border-slate-800/80 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-900 rounded-lg transition"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-base font-bold text-white hidden md:block">
              {pathname === '/' ? 'Dashboard' : pathname === '/upload' ? 'Upload Center' : pathname === '/deobfuscate' ? 'Deobfuscator' : 'Analysis Studio'}
            </h2>
            <div className="flex items-center gap-2 md:hidden">
              <Shield className="w-4 h-4 text-indigo-400" />
              <span className="font-bold text-sm text-white">Luraph Analyzer</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-slate-950 border border-slate-800/80 rounded-lg text-xs text-slate-500 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Sandbox Agent: ONLINE
            </div>
          </div>
        </header>

        {/* Content View */}
        <main className="flex-1 overflow-y-auto relative p-6 md:p-8">
          {children}
        </main>
      </div>

      {/* Mobile Drawer Navigation */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black z-30 md:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="fixed inset-y-0 left-0 w-64 bg-[#0a0d20] border-r border-slate-800 z-40 md:hidden flex flex-col"
            >
              <div className="flex items-center justify-between px-6 h-16 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-indigo-400" />
                  <span className="font-bold text-white">Luraph Analyzer</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-1 px-4 py-6 space-y-1">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition ${
                        isActive
                          ? 'bg-indigo-600/15 text-indigo-300 border-l-2 border-indigo-500'
                          : 'text-slate-400 hover:bg-slate-900/50 hover:text-slate-200'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {link.name}
                    </Link>
                  );
                })}
              </nav>

              <div className="p-4 border-t border-slate-800">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-rose-500/30 hover:bg-rose-500/10 text-rose-400 text-sm font-semibold transition"
                >
                  <LogOut className="w-4 h-4" />
                  Log Out
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
