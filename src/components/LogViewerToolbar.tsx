import React, { useState } from 'react';
import { 
  FileCode2, 
  ChevronDown, 
  Search, 
  ChevronUp, 
  Plus, 
  WrapText, 
  ArrowDownToLine, 
  Copy, 
  Download,
  Check,
  Activity
} from 'lucide-react';
import { LogFile } from '../types/log';

interface LogViewerToolbarProps {
  currentFile: LogFile;
  files: LogFile[];
  onSelectFile: (fileId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  matchIndex: number;
  matchCount: number;
  onPrevMatch: () => void;
  onNextMatch: () => void;
  isCaseSensitive: boolean;
  onToggleCaseSensitive: () => void;
  isRegex: boolean;
  onToggleRegex: () => void;
  isFollowTail: boolean;
  onToggleFollowTail: () => void;
  isWrapText: boolean;
  onToggleWrapText: () => void;
  onOpenJumpModal: () => void;
  fontSize: number;
  onChangeFontSize: (delta: number) => void;
  onCopyLogs: () => void;
  onDownloadFile: () => void;
  isCopied: boolean;
}

export const LogViewerToolbar: React.FC<LogViewerToolbarProps> = ({
  currentFile,
  files,
  onSelectFile,
  searchQuery,
  onSearchChange,
  matchIndex,
  matchCount,
  onPrevMatch,
  onNextMatch,
  isCaseSensitive,
  onToggleCaseSensitive,
  isRegex,
  onToggleRegex,
  isFollowTail,
  onToggleFollowTail,
  isWrapText,
  onToggleWrapText,
  onOpenJumpModal,
  fontSize: _fontSize,
  onChangeFontSize,
  onCopyLogs,
  onDownloadFile,
  isCopied
}) => {
  const [showFileDropdown, setShowFileDropdown] = useState(false);

  return (
    <div className="workspace-toolbar relative z-20 bg-[#0b1018] border-b border-[#182335] px-2.5 sm:px-3 py-1.5 flex flex-wrap lg:flex-nowrap items-center justify-between gap-2 text-xs select-none shrink-0">
      
      {/* Left Area: File Selector & Search Box */}
      <div className="toolbar-search-row flex items-center gap-2 flex-1 min-w-[240px]">
        {/* File dropdown selector */}
        <div className="relative shrink-0">
          <button
            onClick={() => setShowFileDropdown(!showFileDropdown)}
            className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1.5 rounded bg-[#101724] hover:bg-[#152033] border border-[#1e2c44] text-slate-200 font-mono text-[11px] sm:text-[11.5px] cursor-pointer transition-colors max-w-[140px] sm:max-w-[190px]"
          >
            <FileCode2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="font-medium truncate">{currentFile.filename}</span>
            <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
          </button>

          {showFileDropdown && (
            <div className="file-dropdown-menu absolute left-0 mt-1.5 w-60 sm:w-64 rounded-md bg-[#0e1624] border border-[#23334c] shadow-2xl py-1 z-50">
              <div className="px-3 py-1 text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                Switch Active Stream
              </div>
              {files.map((file) => (
                <button
                  key={file.id}
                  onClick={() => {
                    onSelectFile(file.id);
                    setShowFileDropdown(false);
                  }}
                  className={`w-full px-3 py-1.5 text-left font-mono text-[11px] flex items-center justify-between hover:bg-[#162338] cursor-pointer ${
                    file.id === currentFile.id ? 'text-cyan-300 bg-[#121c2e]' : 'text-slate-300'
                  }`}
                >
                  <span className="truncate">{file.filename}</span>
                  <span className="text-[10px] text-slate-500 shrink-0 ml-1">{file.size}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Center Search / Grep Filter Box */}
        <div className="flex-1 flex items-center bg-[#070b12] border border-[#1b2639] rounded px-2 py-1 gap-1 focus-within:border-cyan-500/80 transition-colors min-w-[140px]">
          <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Grep logs (jwt, error)..."
            className="w-full bg-transparent text-[11px] sm:text-[11.5px] font-mono text-slate-200 placeholder-slate-600 focus:outline-none min-w-[50px]"
          />

          {searchQuery && (
            <span className="text-[10px] font-mono text-slate-400 whitespace-nowrap shrink-0 px-1">
              {matchCount > 0 ? `${matchIndex + 1}/${matchCount}` : '0'}
            </span>
          )}

          <div className="flex items-center gap-0.5 shrink-0 pl-1 border-l border-slate-800">
            <button
              onClick={onPrevMatch}
              disabled={matchCount === 0}
              className="p-1 rounded hover:bg-[#152033] text-slate-400 hover:text-slate-200 disabled:opacity-30 cursor-pointer"
              title="Previous match"
            >
              <ChevronUp className="w-3 h-3" />
            </button>
            <button
              onClick={onNextMatch}
              disabled={matchCount === 0}
              className="p-1 rounded hover:bg-[#152033] text-slate-400 hover:text-slate-200 disabled:opacity-30 cursor-pointer"
              title="Next match"
            >
              <ChevronDown className="w-3 h-3" />
            </button>
            <button
              onClick={onToggleCaseSensitive}
              className={`px-1 py-0.5 rounded text-[10px] font-mono cursor-pointer transition-colors ${
                isCaseSensitive ? 'bg-cyan-900/60 text-cyan-300 font-bold' : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Match Case"
            >
              Aa
            </button>
            <button
              onClick={onToggleRegex}
              className={`px-1 py-0.5 rounded text-[10px] font-mono cursor-pointer transition-colors ${
                isRegex ? 'bg-cyan-900/60 text-cyan-300 font-bold' : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Match Whole Word / Regex"
            >
              \b
            </button>
          </div>
        </div>
      </div>

      {/* Right Controls Area */}
      <div className="toolbar-actions flex items-center gap-1 sm:gap-1.5 shrink-0 overflow-x-auto max-w-full pb-0.5 lg:pb-0">
        
        {/* FOLLOW TAIL button */}
        <button
          onClick={onToggleFollowTail}
          className={`flex items-center gap-1 sm:gap-1.5 px-2 py-1 rounded text-[10.5px] sm:text-[11px] font-semibold border transition-all cursor-pointer whitespace-nowrap ${
            isFollowTail
              ? 'bg-[#0e2723] text-emerald-400 border-emerald-700/60 shadow-[0_0_6px_rgba(16,185,129,0.2)]'
              : 'bg-[#121927] text-slate-400 border-[#1f2c42] hover:text-slate-200'
          }`}
          title="Auto-scroll lock to latest lines"
        >
          <span className={`w-1.5 h-1.5 rounded-full ${isFollowTail ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
          <span className="hidden sm:inline">FOLLOW TAIL</span>
          <span className="sm:hidden">TAIL</span>
        </button>

        {/* Wrap toggle */}
        <button
          onClick={onToggleWrapText}
          className={`flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded border text-[10.5px] sm:text-[11px] transition-colors cursor-pointer whitespace-nowrap ${
            isWrapText
              ? 'bg-cyan-950/60 text-cyan-300 border-cyan-700/60'
              : 'bg-[#121927] text-slate-400 border-[#1f2c42] hover:text-slate-200 hover:bg-[#182338]'
          }`}
          title="Toggle line wrapping"
        >
          <WrapText className="w-3 h-3" />
          <span className="hidden xs:inline">Wrap</span>
        </button>

        {/* Jump button */}
        <button
          onClick={onOpenJumpModal}
          className="flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded bg-[#121927] hover:bg-[#182338] border border-[#1f2c42] text-slate-300 text-[10.5px] sm:text-[11px] transition-colors cursor-pointer whitespace-nowrap"
          title="Jump to line number"
        >
          <ArrowDownToLine className="w-3 h-3 text-slate-400" />
          <span className="hidden xs:inline">Jump</span>
        </button>

        {/* A- / A+ Font size */}
        <div className="flex items-center bg-[#121927] border border-[#1f2c42] rounded overflow-hidden">
          <button
            onClick={() => onChangeFontSize(-1)}
            className="px-1.5 py-1 text-[10px] font-mono font-medium text-slate-400 hover:text-white hover:bg-[#1b273d] cursor-pointer"
            title="Decrease font size"
          >
            A-
          </button>
          <div className="w-px h-3 bg-[#1f2c42]" />
          <button
            onClick={() => onChangeFontSize(1)}
            className="px-1.5 py-1 text-[10px] font-mono font-medium text-slate-400 hover:text-white hover:bg-[#1b273d] cursor-pointer"
            title="Increase font size"
          >
            A+
          </button>
        </div>

        {/* Copy button */}
        <button
          onClick={onCopyLogs}
          className="p-1.5 rounded bg-[#121927] hover:bg-[#182338] border border-[#1f2c42] text-slate-400 hover:text-white transition-colors cursor-pointer"
          title="Copy visible log stream"
        >
          {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>

        {/* Download file button */}
        <button
          onClick={onDownloadFile}
          className="p-1.5 rounded bg-[#121927] hover:bg-[#182338] border border-[#1f2c42] text-slate-400 hover:text-white transition-colors cursor-pointer"
          title="Download raw .log file"
        >
          <Download className="w-3.5 h-3.5" />
        </button>
      </div>

    </div>
  );
};
