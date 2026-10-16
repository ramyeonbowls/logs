import React, { useState, useRef, useEffect } from 'react';
import { PulseLogo } from './PulseLogo';
import { 
  FileText, 
  LogOut, 
  ShieldCheck, 
  ChevronDown,
  PanelLeft,
  X
} from 'lucide-react';
import { LogFile } from '../types/log';

interface HeaderBarProps {
  currentFile: LogFile;
  isTailing: boolean;
  onToggleTail: () => void;
  onSignOut: () => void;
  user: { name: string; email: string; role: string };
  onToggleMobileSidebar: () => void;
  isMobileSidebarOpen: boolean;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  currentFile,
  isTailing,
  onToggleTail,
  onSignOut,
  user,
  onToggleMobileSidebar,
  isMobileSidebarOpen,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-12 bg-[#0d121c] border-b border-[#1b2434] px-2.5 sm:px-3 flex items-center justify-between text-xs select-none z-30 shrink-0">
      {/* Left zone: Mobile toggle, Brand, View Tab, and Path Breadcrumb */}
      <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
        
        {/* Mobile Sidebar Toggle Button */}
        <button
          onClick={onToggleMobileSidebar}
          className="md:hidden p-1.5 rounded-lg bg-[#121c2d] hover:bg-[#1a283e] border border-[#233550] text-cyan-400 hover:text-cyan-200 transition-colors cursor-pointer shrink-0"
          title={isMobileSidebarOpen ? 'Close File Tree' : 'Open Remote File Tree & SSH'}
          aria-label="Toggle Navigation Drawer"
        >
          {isMobileSidebarOpen ? <X className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
        </button>

        {/* Brand */}
        <div className="shrink-0">
          <PulseLogo size="sm" showText={true} showBadge={true} />
        </div>

        <div className="hidden sm:block h-4 w-px bg-slate-800 shrink-0 mx-0.5" />

        {/* View Mode Tab (desktop/tablet) */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#131d2e] border border-cyan-500/20 text-cyan-300 font-medium shrink-0">
          <FileText className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-[11.5px]">Raw File Stream</span>
        </div>

        {/* Path Breadcrumb Box (Desktop) */}
        <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded bg-[#090e17] border border-[#1b2537] text-slate-300 font-mono text-[11px] max-w-xs lg:max-w-md truncate">
          <FileText className="w-3 h-3 text-slate-500 shrink-0" />
          <span className="truncate text-slate-300" title={currentFile.path}>
            {currentFile.path}
          </span>
          <span className="hidden xl:inline px-1.5 py-0.2 rounded bg-[#131b28] text-slate-400 border border-slate-700/50 text-[10px] shrink-0">
            {currentFile.encoding}
          </span>
          <span className="px-1.5 py-0.2 rounded bg-[#131b28] text-cyan-300 border border-cyan-800/40 text-[10px] shrink-0 font-medium">
            {currentFile.size}
          </span>
        </div>

        {/* Mobile current active file indicator badge */}
        <div className="md:hidden flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#090e17] border border-[#1b2537] text-slate-300 font-mono text-[10.5px] truncate max-w-[150px] xs:max-w-[190px]">
          <FileText className="w-3 h-3 text-cyan-400 shrink-0" />
          <span className="truncate text-slate-200">{currentFile.filename}</span>
        </div>
      </div>

      {/* Right zone: Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* TAIL -F Toggle button */}
        <button
          onClick={onToggleTail}
          className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded font-mono font-semibold text-[10.5px] sm:text-[11px] border transition-all cursor-pointer ${
            isTailing
              ? 'bg-[#0f2824] text-emerald-400 border-emerald-600/50 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
              : 'bg-[#1b1c24] text-slate-400 border-slate-700 hover:text-slate-200'
          }`}
          title={isTailing ? 'Tailing active (click to pause)' : 'Tailing paused (click to resume)'}
        >
          <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${isTailing ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
          <span>TAIL -F</span>
        </button>

        {/* User Account Avatar / Menu */}
        <div className="relative ml-0.5" ref={menuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-1 p-1 rounded-full bg-[#162134] hover:bg-[#1c2c46] border border-[#263753] text-slate-200 cursor-pointer transition-colors"
            title="User Profile & Settings"
          >
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-cyan-600 to-sky-400 flex items-center justify-center text-white font-bold text-xs uppercase shadow-sm">
              {user.name.charAt(0) || 'U'}
            </div>
            <ChevronDown className="w-3 h-3 text-slate-400 pr-0.5 hidden xs:block" />
          </button>

          {/* User Dropdown */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 rounded-lg bg-[#0e1624] border border-[#223149] shadow-2xl py-2 z-50 text-slate-300">
              <div className="px-3.5 py-2 border-b border-[#1d2b40]">
                <div className="font-semibold text-white text-[13px] truncate">
                  {user.name}
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  {user.email}
                </div>
                <div className="mt-1 flex items-center gap-1 text-[10px] text-cyan-400 font-mono">
                  <ShieldCheck className="w-3 h-3" />
                  <span>{user.role}</span>
                </div>
              </div>

              <div className="pt-1 mt-1 text-[12px]">
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onSignOut();
                  }}
                  className="w-full px-3.5 py-1.5 text-left text-red-400 hover:bg-red-950/40 hover:text-red-300 flex items-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out / Switch Screen</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
