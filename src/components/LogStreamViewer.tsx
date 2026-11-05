import React, { useMemo, useRef, useState, useEffect } from 'react';
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

type DisplayRow =
  | { key: string; line: LogLine; lineNumber: number; stackText?: never }
  | { key: string; line: LogLine; lineNumber: number; stackText: string };

const OVERSCAN_ROWS = 20;

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
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(600);
  const rows = useMemo<DisplayRow[]>(() => {
    const result: DisplayRow[] = [];
    for (const line of lines) {
      result.push({ key: line.id, line, lineNumber: line.lineNumber });
      line.stackTrace?.forEach((stackText, index) => result.push({
        key: `stack-${line.id}-${index}`,
        line,
        lineNumber: line.lineNumber + index + 1,
        stackText,
      }));
    }
    return result;
  }, [lines]);

  const rowHeight = fontSize * 1.55 + 4;
  const virtualize = !isWrapText;
  const firstVisible = virtualize ? Math.max(0, Math.floor(scrollTop / rowHeight) - OVERSCAN_ROWS) : 0;
  const lastVisible = virtualize
    ? Math.min(rows.length, Math.ceil((scrollTop + viewportHeight) / rowHeight) + OVERSCAN_ROWS)
    : rows.length;
  const visibleRows = rows.slice(firstVisible, lastVisible);
  const lowerQuery = searchQuery.toLocaleLowerCase();

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const updateHeight = () => setViewportHeight(element.clientHeight);
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isFollowTail || !containerRef.current) return;
    containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, [rows.length, isFollowTail]);

  useEffect(() => {
    if (selectedLineNumber == null || !containerRef.current) return;
    const selectedIndex = rows.findIndex(row => row.lineNumber === selectedLineNumber);
    if (selectedIndex < 0) return;
    if (virtualize) {
      const top = selectedIndex * rowHeight;
      const bottom = top + rowHeight;
      const element = containerRef.current;
      if (top < element.scrollTop || bottom > element.scrollTop + element.clientHeight) {
        element.scrollTop = Math.max(0, top - element.clientHeight / 2);
      }
    } else {
      document.getElementById(`line-${selectedLineNumber}`)?.scrollIntoView({ block: 'center' });
    }
  }, [selectedLineNumber, rows, rowHeight, virtualize]);

  const highlightSearch = (text: string) => {
    if (!searchQuery.trim()) return text;
    const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escaped})`, isCaseSensitive ? 'g' : 'gi'));
    return parts.map((part, index) => {
      const matches = isCaseSensitive ? part === searchQuery : part.toLocaleLowerCase() === lowerQuery;
      return matches
        ? <mark key={index} className="bg-amber-400 text-slate-950 font-bold px-0.5 rounded-[2px]">{part}</mark>
        : part;
    });
  };

  const renderLevelBadge = (level: string) => {
    switch (level) {
      case 'FATAL': return <span className="text-white bg-rose-700 px-1 py-0.2 rounded font-bold">[FATAL]</span>;
      case 'ERROR': return <span className="text-rose-400 font-bold">[ERROR]</span>;
      case 'WARN': return <span className="text-amber-400 font-semibold">[WARN]</span>;
      case 'DEBUG': return <span className="text-sky-400">[DEBUG]</span>;
      default: return <span className="text-emerald-400 font-semibold">[INFO]</span>;
    }
  };

  const renderRow = (row: DisplayRow) => {
    const isSelected = selectedLineNumber === row.lineNumber;
    const stackText = row.stackText;
    return (
      <div
        key={row.key}
        id={`line-${row.lineNumber}`}
        onClick={() => onSelectLine(row.lineNumber)}
        className={`log-line flex items-start group hover:bg-[#121c2c] rounded cursor-pointer py-0.5 ${isSelected
          ? 'is-selected bg-[#10243d] border border-cyan-400/80 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
          : 'border border-transparent'}`}
      >
        <div className={`w-10 sm:w-14 shrink-0 text-right pr-2 sm:pr-4 ${stackText ? 'text-slate-600' : 'text-slate-500'} select-none group-hover:text-slate-300 font-mono text-[11px] sm:text-[12px]`}>
          {row.lineNumber}
        </div>
        <div className={`flex-1 font-mono tracking-tight ${stackText ? 'text-slate-400 pl-3 sm:pl-4' : ''} ${isWrapText ? 'break-words' : 'whitespace-pre'}`}>
          {stackText !== undefined ? highlightSearch(stackText) : row.line.raw !== undefined ? (
            <span className="text-slate-200">{highlightSearch(row.line.raw)}</span>
          ) : (
            <>
              <span className="text-slate-400">{row.line.timestamp}</span>
              <span className="mx-1">{renderLevelBadge(row.line.level)}</span>
              <span className="text-cyan-400/90 font-medium">[{row.line.service}]</span>
              {row.line.traceId && <span className="text-slate-400 ml-1">trace_id=<span className="text-cyan-300">{highlightSearch(row.line.traceId)}</span></span>}
              {row.line.spanId && <span className="text-slate-400 ml-1.5">span_id=<span className="text-sky-300">{highlightSearch(row.line.spanId)}</span></span>}
              <span className="text-slate-200 ml-1.5">{highlightSearch(row.line.message)}</span>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="workspace-stream flex-1 flex flex-col bg-[#070b12] overflow-hidden select-text font-mono">
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
        <div className="text-[10px] text-slate-500 uppercase tracking-wider hidden lg:block">RAW STREAM ANSI UTF-8</div>
      </div>
      <div
        ref={containerRef}
        onScroll={event => setScrollTop(event.currentTarget.scrollTop)}
        className="flex-1 overflow-auto p-1.5 sm:p-2"
        style={{ fontSize: `${fontSize}px`, lineHeight: `${fontSize * 1.55}px` }}
      >
        {lines.length === 0 ? (
          <div role={loadError ? 'alert' : undefined} className="p-4 text-slate-400 text-xs">{loadError || 'No log lines in this file.'}</div>
        ) : (
          <div className="min-w-fit">
            {virtualize && <div aria-hidden="true" style={{ height: firstVisible * rowHeight }} />}
            {visibleRows.map(renderRow)}
            {virtualize && <div aria-hidden="true" style={{ height: Math.max(0, rows.length - lastVisible) * rowHeight }} />}
          </div>
        )}
      </div>
    </div>
  );
};
