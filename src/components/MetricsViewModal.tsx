import React, { useState, useEffect } from 'react';
import { X, BarChart2, TrendingUp, AlertTriangle, Cpu, Activity } from 'lucide-react';
import { LogFile } from '../types/log';
import { LogPulseAPI } from '../services/api';

interface MetricsViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFile: LogFile;
}

export const MetricsViewModal: React.FC<MetricsViewModalProps> = ({
  isOpen,
  onClose,
  currentFile,
}) => {
  const [metrics, setMetrics] = useState<{
    ingestRateEPS: number;
    errorRatio: number;
    latencyMs: number;
    memoryUsedMB: number;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      LogPulseAPI.getMetrics().then((data) => {
        if (data) setMetrics(data);
      });
    }
  }, [isOpen]);
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-[#0b1019] border border-[#1e2d44] w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="h-12 bg-[#0e1624] border-b border-[#1b273b] px-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <BarChart2 className="w-4 h-4 text-cyan-400" />
            <span>File Ingest Metrics &amp; Telemetry Breakdown</span>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Top KPI row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-[#0e1624] border border-[#1b273b]">
              <div className="text-[10px] text-slate-400 uppercase font-mono flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-cyan-400" />
                Ingest Rate
              </div>
              <div className="text-xl font-bold font-mono text-cyan-300 mt-1">
                2,480 <span className="text-xs font-normal text-slate-400">EPS</span>
              </div>
              <div className="text-[10px] text-emerald-400 mt-1 font-mono">↑ 8.4% nominal</div>
            </div>

            <div className="p-3 rounded-lg bg-[#0e1624] border border-[#1b273b]">
              <div className="text-[10px] text-slate-400 uppercase font-mono flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-rose-400" />
                Error Ratio
              </div>
              <div className="text-xl font-bold font-mono text-rose-400 mt-1">
                0.27%
              </div>
              <div className="text-[10px] text-slate-400 mt-1 font-mono">{currentFile.stats.errorCount} total errors</div>
            </div>

            <div className="p-3 rounded-lg bg-[#0e1624] border border-[#1b273b]">
              <div className="text-[10px] text-slate-400 uppercase font-mono flex items-center gap-1">
                <Activity className="w-3 h-3 text-emerald-400" />
                Ingest Latency
              </div>
              <div className="text-xl font-bold font-mono text-emerald-300 mt-1">
                1.4 <span className="text-xs font-normal text-slate-400">ms</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1 font-mono">p99 = 4.2ms</div>
            </div>

            <div className="p-3 rounded-lg bg-[#0e1624] border border-[#1b273b]">
              <div className="text-[10px] text-slate-400 uppercase font-mono flex items-center gap-1">
                <Cpu className="w-3 h-3 text-sky-400" />
                Memory Buffer
              </div>
              <div className="text-xl font-bold font-mono text-sky-300 mt-1">
                48.2 <span className="text-xs font-normal text-slate-400">MB</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1 font-mono">18.8% of 256 MB</div>
            </div>
          </div>

          {/* Simulated Ingest Sparklines / Bars */}
          <div className="p-4 rounded-lg bg-[#0e1624] border border-[#1b273b]">
            <div className="text-xs font-semibold text-slate-200 mb-3 flex items-center justify-between">
              <span>Log Volume Heatmap (Past 30 Minutes)</span>
              <span className="text-[11px] font-mono text-cyan-400">Live Window</span>
            </div>
            <div className="h-28 flex items-end gap-1.5 pt-2">
              {[42, 50, 48, 65, 78, 60, 45, 88, 92, 110, 85, 90, 75, 70, 82, 95, 68, 72, 80, 89, 94, 102, 98, 85].map((val, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className={`w-full rounded-t transition-all duration-300 ${
                      val > 100
                        ? 'bg-rose-500/80 shadow-[0_0_6px_rgba(244,63,94,0.4)]'
                        : val > 80
                        ? 'bg-amber-500/80'
                        : 'bg-cyan-500/80'
                    }`}
                    style={{ height: `${(val / 120) * 100}%` }}
                    title={`${val * 24} events`}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-2">
              <span>14:00 UTC</span>
              <span>14:15 UTC</span>
              <span>14:30 UTC</span>
            </div>
          </div>

          {/* Breakdown by Service */}
          <div className="p-4 rounded-lg bg-[#0e1624] border border-[#1b273b]">
            <div className="text-xs font-semibold text-slate-200 mb-2">Throughput by Service Node</div>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">api-gateway/gw-4a11</span>
                <span className="text-cyan-300">54,120 lines (43%)</span>
              </div>
              <div className="w-full h-1 bg-[#152030] rounded-full overflow-hidden">
                <div className="h-full bg-cyan-400 rounded-full" style={{ width: '43%' }} />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-300">db-proxy/pgpool</span>
                <span className="text-cyan-300">38,910 lines (31%)</span>
              </div>
              <div className="w-full h-1 bg-[#152030] rounded-full overflow-hidden">
                <div className="h-full bg-cyan-400 rounded-full" style={{ width: '31%' }} />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-300">auth-service &amp; redis</span>
                <span className="text-cyan-300">31,820 lines (26%)</span>
              </div>
              <div className="w-full h-1 bg-[#152030] rounded-full overflow-hidden">
                <div className="h-full bg-cyan-400 rounded-full" style={{ width: '26%' }} />
              </div>
            </div>
          </div>
        </div>

        <div className="h-11 bg-[#0e1624] border-t border-[#1b273b] px-4 flex items-center justify-end">
          <button onClick={onClose} className="px-4 py-1.5 rounded bg-slate-800 text-slate-200 text-xs cursor-pointer">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
