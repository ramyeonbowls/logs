import React from 'react';
import { LogFile, LogLevel } from '../types/log';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface LogStatusBarProps {
  currentFile: LogFile;
  activeLevelFilter: LogLevel | null;
  onToggleLevelFilter: (level: LogLevel) => void;
  onClearFilter: () => void;
  onScrollToTop: () => void;
  onScrollToEnd: () => void;
}

export const LogStatusBar: React.FC<LogStatusBarProps> = ({
  currentFile,
  activeLevelFilter,
  onToggleLevelFilter,
  onClearFilter,
  onScrollToTop,
  onScrollToEnd,
}) => {
  return (
    <div className="h-9 bg-[#090d15] border-b border-[#162030] px-3 flex items-center justify-between text-xs select-none shrink-0 font-mono">
      
      {/* Left File Metadata badges */}
      <div className="flex items-center gap-3 text-[11px] text-slate-400 overflow-hidden">
        <div className="flex items-center gap-1.5 text-cyan-300 font-medium">
          <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.6)]" />
          <span className="truncate max-w-[200px]">{currentFile.filename}</span>
        </div>

        <span className="text-slate-600">|</span>
        <span className="text-slate-300">{currentFile.size}</span>

        <span className="text-slate-600">|</span>
        <span className="text-slate-300">{currentFile.lineCount.toLocaleString()} lines</span>

        <span className="text-slate-600 hidden lg:inline">|</span>
        <span className="text-slate-400 hidden lg:inline">Plain text / {currentFile.encoding}</span>

        <span className="text-slate-600 hidden xl:inline">|</span>
        <span className="text-slate-400 hidden xl:inline">{currentFile.lineEnding}</span>
      </div>

      {/* Center HIGHLIGHT Filter Buttons */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
          HIGHLIGHT:
        </span>

        {/* ERROR button */}
        <button
          onClick={() => onToggleLevelFilter('ERROR')}
          className={`px-2 py-0.5 rounded text-[10.5px] font-semibold border transition-all cursor-pointer ${
            activeLevelFilter === 'ERROR'
              ? 'bg-[#3b1219] text-rose-300 border-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.3)] ring-1 ring-rose-500'
              : 'bg-[#1e1014] text-rose-400 border-rose-900/60 hover:bg-[#2c131a] hover:border-rose-700/80'
          }`}
          title="Filter / Highlight errors"
        >
          [ERROR] ({currentFile.stats.errorCount})
        </button>

        {/* WARN button */}
        <button
          onClick={() => onToggleLevelFilter('WARN')}
          className={`px-2 py-0.5 rounded text-[10.5px] font-semibold border transition-all cursor-pointer ${
            activeLevelFilter === 'WARN'
              ? 'bg-[#3d270c] text-amber-300 border-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)] ring-1 ring-amber-500'
              : 'bg-[#22170a] text-amber-400 border-amber-900/60 hover:bg-[#2f1f0e] hover:border-amber-700/80'
          }`}
          title="Filter / Highlight warnings"
        >
          [WARN] ({currentFile.stats.warnCount})
        </button>

        {/* INFO button */}
        <button
          onClick={() => onToggleLevelFilter('INFO')}
          className={`px-2 py-0.5 rounded text-[10.5px] font-semibold border transition-all cursor-pointer ${
            activeLevelFilter === 'INFO'
              ? 'bg-[#0e2f24] text-emerald-300 border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)] ring-1 ring-emerald-500'
              : 'bg-[#0a1e17] text-emerald-400 border-emerald-900/60 hover:bg-[#102920] hover:border-emerald-700/80'
          }`}
          title="Filter / Highlight info logs"
        >
          [INFO] ({currentFile.stats.infoCount.toLocaleString()})
        </button>

        {/* Clear filter button */}
        {activeLevelFilter && (
          <button
            onClick={onClearFilter}
            className="text-[11px] text-slate-400 hover:text-slate-200 underline pl-1 cursor-pointer transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Right Top / End Jump Shortcuts */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={onScrollToTop}
          className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#101724] hover:bg-[#172336] border border-[#1b273b] text-slate-300 hover:text-white text-[11px] transition-colors cursor-pointer"
          title="Scroll to beginning of file"
        >
          <ArrowUp className="w-3 h-3 text-slate-400" />
          <span>Top</span>
        </button>
        <button
          onClick={onScrollToEnd}
          className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#101724] hover:bg-[#172336] border border-[#1b273b] text-slate-300 hover:text-white text-[11px] transition-colors cursor-pointer"
          title="Scroll to latest tail line"
        >
          <ArrowDown className="w-3 h-3 text-slate-400" />
          <span>End</span>
        </button>
      </div>

    </div>
  );
};
