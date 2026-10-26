import React, { useState } from 'react';
import { X, Settings, Check } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [logFormat, setLogFormat] = useState('raw_ansi');
  const [timezone, setTimezone] = useState('utc');
  const [maxBufferSize, setMaxBufferSize] = useState('256');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="settings-glass-panel bg-[#0b1019] border border-[#1e2d44] w-full max-w-md rounded-xl shadow-2xl overflow-hidden flex flex-col">
        <div className="h-12 bg-[#0e1624] border-b border-[#1b273b] px-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <Settings className="w-4 h-4 text-cyan-400" />
            <span>Log Parser &amp; Ingest Settings</span>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs font-sans">
          <div>
            <label className="text-slate-300 font-semibold block mb-1.5">
              Default Parser Grammar
            </label>
            <div className="space-y-1.5 font-mono text-[11.5px]">
              {[
                { id: 'raw_ansi', label: 'ANSI / Syslog + TraceID (Default)' },
                { id: 'json_lines', label: 'JSON Lines (Bunyan / Zap / Pino)' },
                { id: 'nginx_combined', label: 'Nginx Combined & Apache Access' },
                { id: 'envoy_access', label: 'Envoy / Istio Mesh Proxy' },
              ].map((opt) => (
                <label
                  key={opt.id}
                  className={`flex items-center justify-between p-2 rounded border cursor-pointer ${
                    logFormat === opt.id
                      ? 'bg-[#101e30] border-cyan-500/50 text-cyan-300'
                      : 'bg-[#090d16] border-[#182335] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>{opt.label}</span>
                  <input
                    type="radio"
                    name="logFormat"
                    checked={logFormat === opt.id}
                    onChange={() => setLogFormat(opt.id)}
                    className="accent-cyan-400"
                  />
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1.5">
              Timestamp Display Timezone
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full p-2 rounded bg-[#090d16] border border-[#1b2639] text-slate-200 text-xs font-mono"
            >
              <option value="utc">UTC (Coordinated Universal Time)</option>
              <option value="local">Local System Timezone (PST/PDT)</option>
              <option value="epoch">Unix Epoch Timestamp (ms)</option>
            </select>
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1.5">
              In-Memory Buffer Ceiling
            </label>
            <select
              value={maxBufferSize}
              onChange={(e) => setMaxBufferSize(e.target.value)}
              className="w-full p-2 rounded bg-[#090d16] border border-[#1b2639] text-slate-200 text-xs font-mono"
            >
              <option value="128">128 MB (Lite)</option>
              <option value="256">256 MB (Standard - Default)</option>
              <option value="512">512 MB (High Throughput)</option>
              <option value="1024">1,024 MB (Enterprise Clustered)</option>
            </select>
          </div>
        </div>

        <div className="h-12 bg-[#0e1624] border-t border-[#1b273b] px-4 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-mono">Changes persist automatically</span>
          <button
            onClick={onClose}
            className="flex items-center gap-1 px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Save Configuration</span>
          </button>
        </div>
      </div>
    </div>
  );
};
