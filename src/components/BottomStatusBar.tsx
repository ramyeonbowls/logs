import React from 'react';
import { LogFile } from '../types/log';
import { Activity } from 'lucide-react';

interface BottomStatusBarProps {
  currentFile: LogFile;
  selectedLineNumber: number | null;
  isTailing: boolean;
  onToggleTail: () => void;
}

export const BottomStatusBar: React.FC<BottomStatusBarProps> = ({
  currentFile,
  selectedLineNumber,
  isTailing,
  onToggleTail,
}) => {
  const currentLine = selectedLineNumber ?? 1048;
  const percentage = ((currentLine / currentFile.lineCount) * 100).toFixed(1);

  return (
    <footer className="h-7 bg-[#080c14] border-t border-[#172132] px-3 flex items-center justify-between text-[11px] text-slate-400 select-none font-mono shrink-0">
      {/* Left info items */}
      <div className="flex items-center gap-3 overflow-hidden">
        {/* Streaming status */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={`w-2 h-2 rounded-full ${
              isTailing ? 'bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.8)]' : 'bg-slate-500'
            }`}
          />
          <span className={isTailing ? 'text-emerald-400 font-medium' : 'text-slate-500'}>
            {isTailing ? 'Streaming (tailing file)' : 'Paused'}
          </span>
        </div>

        <span className="text-slate-700">|</span>

        {/* File name */}
        <span className="truncate max-w-[220px] text-slate-300">
          File: {currentFile.filename}
        </span>

        <span className="text-slate-700 hidden sm:inline">|</span>

        {/* Size */}
        <span className="hidden sm:inline text-slate-400">
          Size: {currentFile.size}
        </span>

        <span className="text-slate-700 hidden md:inline">|</span>

        {/* Position */}
        <span className="hidden md:inline text-slate-300">
          Position: {currentLine.toLocaleString()} / {currentFile.lineCount.toLocaleString()} ({percentage}%)
        </span>

        <span className="text-slate-700 hidden lg:inline">|</span>

        {/* Encoding */}
        <span className="hidden lg:inline text-slate-400">
          Encoding: {currentFile.encoding} (CRLF/LF: LF)
        </span>
      </div>

      {/* Right info items */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Live tailing toggle button */}
        <button
          onClick={onToggleTail}
          className={`flex items-center gap-1 cursor-pointer transition-colors ${
            isTailing ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-400'
          }`}
          title="Toggle live tailing"
        >
          <Activity className="w-3 h-3" />
          <span>Live tailing</span>
        </button>

        <span className="text-slate-700">|</span>

        {/* Line indicator */}
        <span className="text-slate-300">
          Line {currentLine.toLocaleString()} of {currentFile.lineCount.toLocaleString()}
        </span>

        <span className="text-slate-700 hidden sm:inline">|</span>

        {/* UTF-8 LF */}
        <span className="text-slate-400 hidden sm:inline">
          UTF-8 (LF)
        </span>
      </div>
    </footer>
  );
};
