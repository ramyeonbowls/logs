import React, { useState } from 'react';
import { PulseLogo } from './PulseLogo';
import { User, Key, Eye, EyeOff, ArrowRight, CornerDownLeft, Terminal, ShieldAlert } from 'lucide-react';

interface LoginScreenProps {
  onSignIn: (user: { name: string; email: string; role: string }) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onSignIn }) => {
  const [username, setUsername] = useState('julian.putra99@gmail.com');
  const [password, setPassword] = useState('••••••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotNotice, setShowForgotNotice] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onSignIn({
        name: username.includes('@') ? username.split('@')[0] : username,
        email: username.includes('@') ? username : `${username}@logpulse.internal`,
        role: 'Site Reliability Engineer (L5)'
      });
    }, 450);
  };

  const handleQuickFill = (email: string) => {
    setUsername(email);
    setPassword('production-sre-key-2025');
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center bg-[#070b12] p-4 select-none overflow-hidden font-sans">
      {/* Background ambient lighting vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#111c2e]/60 via-[#070b12] to-[#04060a] pointer-events-none" />

      {/* Subtle background tech grid lines */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(#38bdf8 1px, transparent 1px), linear-gradient(to right, #38bdf8 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}
      />

      {/* Authentication Card */}
      <div className="relative w-full max-w-[430px] rounded-xl bg-[#0e1622]/95 border border-slate-800/80 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.85)] p-7 md:p-8 backdrop-blur-xl z-10">
        
        {/* Subtle top edge cyan rim glow */}
        <div className="absolute top-0 left-12 right-12 h-[1.5px] bg-gradient-to-r from-transparent via-[#38bdf8]/70 to-transparent" />

        {/* Top Header: Waveform Logo & Identity Badge */}
        <div className="flex flex-col items-center text-center">
          <PulseLogo size="lg" />

          {/* Identity V4.28 badge */}
          <div className="mt-3.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#101928] border border-[#1e2e45] text-[10px] font-mono tracking-widest text-slate-300 uppercase shadow-inner">
            <Terminal className="w-3 h-3 text-cyan-400" />
            <span>IDENTITY V4.28</span>
          </div>

          {/* Heading */}
          <h1 className="mt-3 text-[22px] font-bold text-white tracking-tight">
            LogPulse Observability
          </h1>

          {/* Subtitle */}
          <p className="mt-1.5 text-[12.5px] text-slate-400 max-w-[340px] leading-relaxed">
            Sign in to monitor production systems, audit trails, and microservices in real-time.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {/* Username or Email */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <label htmlFor="login-username" className="text-slate-300 font-medium text-[12.5px]">
                Username or Email
              </label>
              <span className="text-slate-500 text-[11px]">required</span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <User className="w-4 h-4" />
              </div>
              <input
                id="login-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="username or email"
                required
                className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-[#080d16] border border-[#1b2638] text-white text-[13px] placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <label htmlFor="login-password" className="text-slate-300 font-medium text-[12.5px]">
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowForgotNotice(true)}
                className="text-cyan-400 hover:text-cyan-300 text-[11.5px] transition-colors focus:outline-none"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Key className="w-4 h-4" />
              </div>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full pl-10 pr-10 py-2.5 rounded-lg bg-[#080d16] border border-[#1b2638] text-white text-[13px] placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Keep signed in */}
          <div className="flex items-center justify-between pt-0.5">
            <label className="flex items-center gap-2 cursor-pointer select-none text-slate-400 hover:text-slate-300 text-[12.5px]">
              <input
                type="checkbox"
                checked={keepSignedIn}
                onChange={(e) => setKeepSignedIn(e.target.checked)}
                className="w-4 h-4 rounded bg-[#080d16] border border-[#1e2d42] text-cyan-500 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-[#20a4f3]"
              />
              <span>Keep signed in</span>
            </label>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#20a4f3] hover:bg-[#1b93dc] text-white font-medium text-[13.5px] shadow-[0_4px_16px_rgba(32,164,243,0.3)] transition-all active:scale-[0.99] disabled:opacity-70 cursor-pointer"
            >
              <span>{isLoading ? 'Authenticating...' : 'Sign In to Workspace'}</span>
              <ArrowRight className="w-4 h-4 ml-0.5" />
              <kbd className="ml-1 px-1.5 py-0.5 bg-[#177ab7]/80 rounded text-[10px] font-mono leading-none border border-cyan-300/30">
                ↵
              </kbd>
            </button>
          </div>
        </form>

        {/* Demo Fast Account Selector */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-col gap-2">
          <span className="text-[11px] text-slate-500 uppercase tracking-wider text-center">
            Instant Demo Sign-In
          </span>
          <div className="grid grid-cols-2 gap-2 text-[11.5px]">
            <button
              type="button"
              onClick={() => handleQuickFill('julian.putra99@gmail.com')}
              className="px-2.5 py-1.5 rounded-md bg-[#121c2c] hover:bg-[#18263c] border border-slate-800 text-slate-300 text-left truncate transition-colors"
            >
              <div className="font-medium text-slate-200">Julian (Lead SRE)</div>
              <div className="text-[10px] text-slate-500 truncate">julian.putra99@...</div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('ops-oncall@logpulse.internal')}
              className="px-2.5 py-1.5 rounded-md bg-[#121c2c] hover:bg-[#18263c] border border-slate-800 text-slate-300 text-left truncate transition-colors"
            >
              <div className="font-medium text-slate-200">On-Call Tier 1</div>
              <div className="text-[10px] text-slate-500 truncate">ops-oncall@...</div>
            </button>
          </div>
        </div>

      </div>

      {/* Forgot Password Modal Dialog */}
      {showForgotNotice && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e1624] border border-slate-700 max-w-sm w-full p-5 rounded-xl shadow-2xl">
            <div className="flex items-center gap-2 text-cyan-400 mb-2">
              <ShieldAlert className="w-5 h-5" />
              <h3 className="font-semibold text-white text-sm">Corporate SSO / Key Reset</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Password reset requests are managed via your company OIDC / Okta directory. An audit request has been sent for <span className="text-cyan-300">{username || 'your account'}</span>.
            </p>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowForgotNotice(false)}
                className="px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer copyright */}
      <footer className="mt-8 text-center text-slate-600 text-xs font-mono">
        LogPulse Enterprise Observability · Encrypted Session v4.28
      </footer>
    </div>
  );
};
