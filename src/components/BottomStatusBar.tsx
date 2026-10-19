import { LogFile } from '../types/log';
import { Activity, Server } from 'lucide-react';
import { BackendStatus } from '../services/api';

interface BottomStatusBarProps {
  currentFile: LogFile;
  selectedLineNumber: number | null;
  isTailing: boolean;
  onToggleTail: () => void;
  backendStatus?: BackendStatus | null;
}

export const BottomStatusBar: React.FC<BottomStatusBarProps> = ({
  currentFile,
  selectedLineNumber,
  isTailing,
  onToggleTail,
  backendStatus,
}) => {
  const currentLine = selectedLineNumber ?? 1048;
  const percentage = ((currentLine / currentFile.lineCount) * 100).toFixed(1);

  return (
    <footer className="h-7 bg-[#080c14] border-t border-[#172132] px-2.5 sm:px-3 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-400 select-none font-mono shrink-0 overflow-x-auto gap-2">
      {/* Left info items */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Streaming status */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
              isTailing ? 'bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.8)]' : 'bg-slate-500'
            }`}
          />
          <span className={isTailing ? 'text-emerald-400 font-medium' : 'text-slate-500'}>
            {isTailing ? 'Streaming' : 'Paused'}
          </span>
        </div>

        <span className="text-slate-700">|</span>

        {/* File name */}
        <span className="truncate max-w-[120px] sm:max-w-[220px] text-slate-300">
          {currentFile.filename}
        </span>

        <span className="text-slate-700 hidden sm:inline">|</span>

        {/* Size */}
        <span className="hidden sm:inline text-slate-400">
          {currentFile.size}
        </span>

        <span className="text-slate-700 hidden md:inline">|</span>

        {/* Position */}
        <span className="hidden md:inline text-slate-300">
          Pos: {currentLine.toLocaleString()} / {currentFile.lineCount.toLocaleString()} ({percentage}%)
        </span>

        <span className="text-slate-700 hidden lg:inline">|</span>

        {/* Encoding */}
        <span className="hidden lg:inline text-slate-400">
          UTF-8 (LF)
        </span>
      </div>

      {/* Right info items */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Backend Connectivity Status */}
        <div className="flex items-center gap-1.5 text-[10px]">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              backendStatus?.connected ? 'bg-emerald-400' : 'bg-rose-500'
            }`}
          />
          <span className={backendStatus?.connected ? 'text-emerald-400' : 'text-slate-500'}>
            Go/Node API {backendStatus?.connected ? `(${backendStatus.latencyMs}ms)` : 'Offline'}
          </span>
        </div>

        <span className="text-slate-700 hidden sm:inline">|</span>

        {/* Live tailing toggle button */}
        <button
          onClick={onToggleTail}
          className={`flex items-center gap-1 cursor-pointer transition-colors ${
            isTailing ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-400'
          }`}
          title="Toggle live tailing"
        >
          <Activity className="w-3 h-3" />
          <span className="hidden xs:inline">Live tailing</span>
        </button>

        <span className="text-slate-700">|</span>

        {/* Line indicator */}
        <span className="text-slate-300">
          Ln {currentLine.toLocaleString()}<span className="hidden sm:inline"> of {currentFile.lineCount.toLocaleString()}</span>
        </span>
      </div>
    </footer>
  );
};
