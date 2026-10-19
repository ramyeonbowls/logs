import React, { useRef, useEffect } from 'react';
import { LogLine } from '../types/log';

interface LogStreamViewerProps {
  lines: LogLine[];
  selectedLineNumber: number | null;
  onSelectLine: (lineNumber: number) => void;
  searchQuery: string;
  isCaseSensitive: boolean;
  isWrapText: boolean;
  fontSize: number;
  isFollowTail: boolean;
  loadError?: string | null;
}

export const LogStreamViewer: React.FC<LogStreamViewerProps> = ({
  lines,
  selectedLineNumber,
  onSelectLine,
  searchQuery,
  isCaseSensitive,
  isWrapText,
  fontSize,
  isFollowTail,
  loadError,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll when follow tail is active and new lines arrive
  useEffect(() => {
    if (isFollowTail && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [lines.length, isFollowTail]);

  // Helper to highlight matching text with search query
  const highlightSearch = (text: string) => {
    if (!searchQuery.trim()) return text;

    try {
      const flags = isCaseSensitive ? 'g' : 'gi';
      const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escapedQuery})`, flags);
      const parts = text.split(regex);

      return parts.map((part, index) =>
        regex.test(part) ? (
          <mark
            key={index}
            className="bg-amber-400 text-slate-950 font-bold px-0.5 rounded-[2px]"
          >
            {part}
          </mark>
        ) : (
          part
        )
      );
    } catch {
      return text;
    }
  };

  // Helper to colorize log levels
  const renderLevelBadge = (level: string) => {
    switch (level) {
      case 'FATAL':
        return <span className="text-white bg-rose-700 px-1 py-0.2 rounded font-bold">[FATAL]</span>;
      case 'ERROR':
        return <span className="text-rose-400 font-bold">[ERROR]</span>;
      case 'WARN':
        return <span className="text-amber-400 font-semibold">[WARN]</span>;
      case 'DEBUG':
        return <span className="text-sky-400">[DEBUG]</span>;
      case 'INFO':
      default:
        return <span className="text-emerald-400 font-semibold">[INFO]</span>;
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#070b12] overflow-hidden select-text font-mono">
      {/* Sub-header info banner with responsive labels */}
      <div className="h-7 bg-[#0b1018] border-b border-[#141d2c] px-2.5 sm:px-3 flex items-center justify-between text-[10px] sm:text-[10.5px] text-slate-400 font-mono select-none shrink-0 overflow-x-auto">
        <div className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap">
          <span className="text-slate-300 font-semibold hidden md:inline">RAW LOG STREAM (AS-IS PLAIN TEXT)</span>
          <span className="text-slate-300 font-semibold md:hidden">RAW STREAM</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400 hidden sm:inline">ANSI Output</span>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <span className="text-slate-400">Wrap: {isWrapText ? 'ON' : 'OFF'}</span>
          <span className="text-slate-600">|</span>
          <span className="text-cyan-400 font-medium">Line: {selectedLineNumber ?? lines[0]?.lineNumber ?? 1048}</span>
        </div>
        <div className="text-[10px] text-slate-500 uppercase tracking-wider hidden lg:block">
          RAW STREAM ANSI UTF-8
        </div>
      </div>

      {/* Terminal logs list container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-1.5 sm:p-2 scroll-smooth"
        style={{ fontSize: `${fontSize}px`, lineHeight: `${fontSize * 1.55}px` }}
      >
        <div className="min-w-fit">
          {lines.length === 0 && (
            <div role={loadError ? 'alert' : undefined} className="p-4 text-slate-400 text-xs">
              {loadError || 'No log lines in this file.'}
            </div>
          )}
          {lines.map((line) => {
            const isSelected = selectedLineNumber === line.lineNumber;

            return (
              <React.Fragment key={line.id}>
                {/* Primary Log Line */}
                <div
                  id={`line-${line.lineNumber}`}
                  onClick={() => onSelectLine(line.lineNumber)}
                  className={`flex items-start group hover:bg-[#121c2c] transition-colors rounded cursor-pointer py-0.5 ${
                    isSelected
                      ? 'bg-[#10243d] border border-cyan-400/80 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                      : 'border border-transparent'
                  }`}
                >
                  {/* Line Number gutter - compact on mobile */}
                  <div className="w-10 sm:w-14 shrink-0 text-right pr-2 sm:pr-4 text-slate-500 select-none group-hover:text-slate-300 font-mono text-[11px] sm:text-[12px]">
                    {line.lineNumber}
                  </div>

                  {/* Log Content */}
                  <div
                    className={`flex-1 font-mono tracking-tight ${
                      isWrapText ? 'break-words' : 'whitespace-pre'
                    }`}
                  >
                    {line.raw !== undefined ? (
                      <span className="text-slate-200">{highlightSearch(line.raw)}</span>
                    ) : (
                      <>
                        <span className="text-slate-400">{line.timestamp}</span>
                        <span className="mx-1">{renderLevelBadge(line.level)}</span>
                        <span className="text-cyan-400/90 font-medium">[{line.service}]</span>
                        {line.traceId && (
                          <span className="text-slate-400 ml-1">
                            trace_id=<span className="text-cyan-300">{highlightSearch(line.traceId)}</span>
                          </span>
                        )}
                        {line.spanId && (
                          <span className="text-slate-400 ml-1.5">
                            span_id=<span className="text-sky-300">{highlightSearch(line.spanId)}</span>
                          </span>
                        )}
                        <span className="text-slate-200 ml-1.5">{highlightSearch(line.message)}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Stack Trace rendering */}
                {line.stackTrace && line.stackTrace.length > 0 && (
                  <div className="flex flex-col">
                    {line.stackTrace.map((stackLine, stackIdx) => {
                      const stackLineNumber = line.lineNumber + 1 + stackIdx;
                      const isStackSelected = selectedLineNumber === stackLineNumber;

                      return (
                        <div
                          key={`stack-${line.id}-${stackIdx}`}
                          id={`line-${stackLineNumber}`}
                          onClick={() => onSelectLine(stackLineNumber)}
                          className={`flex items-start group hover:bg-[#121c2c] transition-colors rounded cursor-pointer py-0.5 ${
                            isStackSelected
                              ? 'bg-[#10243d] border border-cyan-400/80 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                              : 'border border-transparent'
                          }`}
                        >
                          <div className="w-10 sm:w-14 shrink-0 text-right pr-2 sm:pr-4 text-slate-600 select-none group-hover:text-slate-400 font-mono text-[11px] sm:text-[12px]">
                            {stackLineNumber}
                          </div>
                          <div
                            className={`flex-1 font-mono tracking-tight ${
                              stackIdx === 0
                                ? 'text-rose-300 font-medium'
                                : 'text-slate-400 pl-3 sm:pl-4'
                            } ${isWrapText ? 'break-words' : 'whitespace-pre'}`}
                          >
                            {highlightSearch(stackLine)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </React.Fragment>
            );
          })}
          <div ref={bottomRef} className="h-4" />
        </div>
      </div>
    </div>
  );
};
