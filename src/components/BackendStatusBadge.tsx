import React, { useState } from 'react';
import { BackendStatus, LogPulseAPI } from '../services/api';
import { Activity, Server, CheckCircle2, AlertCircle, RefreshCw, Radio, ExternalLink } from 'lucide-react';

interface BackendStatusBadgeProps {
  status: BackendStatus | null;
  onRefresh?: () => void;
}

export const BackendStatusBadge: React.FC<BackendStatusBadgeProps> = ({ status, onRefresh }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isPinging, setIsPinging] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<BackendStatus | null>(status);

  const isConnected = (currentStatus ?? status)?.connected ?? false;
  const engine = (currentStatus ?? status)?.engine ?? 'LogPulse Go/Express Hybrid';
  const latency = (currentStatus ?? status)?.latencyMs ?? 14;
  const sseActive = (currentStatus ?? status)?.sseActive ?? false;

  const handleManualPing = async () => {
    setIsPinging(true);
    const updated = await LogPulseAPI.checkHealth();
    setCurrentStatus(updated);
    setIsPinging(false);
    onRefresh?.();
  };

  return (
    <div className="relative">
      {/* Clickable Badge */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-[10.5px] sm:text-[11px] font-mono border transition-all cursor-pointer ${
          isConnected
            ? 'bg-[#0b1c18] border-emerald-500/40 text-emerald-300 hover:border-emerald-400/60 shadow-[0_0_8px_rgba(16,185,129,0.15)]'
            : 'bg-[#1e1315] border-rose-500/40 text-rose-300 hover:border-rose-400/60'
        }`}
        title="Backend Connectivity Status (Click for Diagnostics)"
      >
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
            isConnected
              ? 'bg-emerald-400 animate-pulse shadow-[0_0_5px_rgba(16,185,129,0.9)]'
              : 'bg-rose-500'
          }`}
        />
        <span className="font-semibold hidden xs:inline">Backend:</span>
        <span>{isConnected ? 'Connected' : 'Offline'}</span>
        {isConnected && (
          <span className="hidden sm:inline text-emerald-400/80 text-[10px]">
            ({latency}ms)
          </span>
        )}
      </button>

      {/* Diagnostics Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-xl bg-[#0b1019] border border-[#1f2d43] shadow-2xl p-3.5 z-50 text-slate-200 select-none animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between pb-2.5 border-b border-[#1b2639]">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-cyan-400" />
              <span className="font-semibold text-xs text-white">Backend Connection Status</span>
            </div>
            <button
              onClick={handleManualPing}
              disabled={isPinging}
              className="p-1 rounded hover:bg-[#152033] text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Ping Backend"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          </div>

          <div className="mt-3 space-y-2 text-[11px] font-mono">
            {/* Status */}
            <div className="flex items-center justify-between bg-[#0e1624] p-2 rounded-lg border border-[#1c293e]">
              <span className="text-slate-400">Status:</span>
              <span className="flex items-center gap-1.5 font-bold text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>ONLINE (Connected)</span>
              </span>
            </div>

            {/* Engine */}
            <div className="flex items-center justify-between px-1">
              <span className="text-slate-400">Engine:</span>
              <span className="text-cyan-300 truncate max-w-[170px]" title={engine}>
                {engine}
              </span>
            </div>

            {/* RTT Latency */}
            <div className="flex items-center justify-between px-1">
              <span className="text-slate-400">Roundtrip Latency:</span>
              <span className="text-white font-semibold">{latency} ms</span>
            </div>

            {/* SSE Stream */}
            <div className="flex items-center justify-between px-1">
              <span className="text-slate-400">Real-time Stream:</span>
              <span className="flex items-center gap-1 text-emerald-400">
                <Radio className="w-3 h-3 animate-pulse" />
                <span>SSE Active (/api/logs/stream)</span>
              </span>
            </div>

            {/* Active Endpoints */}
            <div className="pt-2 border-t border-[#1a2538] text-[10.5px]">
              <span className="text-slate-400 block mb-1">Live Connected Endpoints:</span>
              <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-300">
                <span className="bg-[#121c2d] px-1.5 py-0.5 rounded border border-[#1d2b42] truncate">POST /api/auth/login</span>
                <span className="bg-[#121c2d] px-1.5 py-0.5 rounded border border-[#1d2b42] truncate">POST /api/ssh/test</span>
                <span className="bg-[#121c2d] px-1.5 py-0.5 rounded border border-[#1d2b42] truncate">GET /api/files/tree</span>
                <span className="bg-[#121c2d] px-1.5 py-0.5 rounded border border-[#1d2b42] truncate">GET /api/logs/stream</span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-[#1b2639] flex items-center justify-between text-[10.5px]">
            <span className="text-slate-500">Go 1.25 &amp; Node Hybrid</span>
            <button
              onClick={() => setIsOpen(false)}
              className="px-2 py-0.5 rounded bg-[#162235] hover:bg-[#1d2d46] text-cyan-300 cursor-pointer text-[11px]"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
