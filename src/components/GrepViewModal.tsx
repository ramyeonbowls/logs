import React from 'react';
import { X, Binary, Check } from 'lucide-react';

interface GrepViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyPattern: (pattern: string) => void;
}

export const GrepViewModal: React.FC<GrepViewModalProps> = ({
  isOpen,
  onClose,
  onApplyPattern,
}) => {
  if (!isOpen) return null;

  const presets = [
    { title: 'JWT Token Expirations & Auth Errors', pattern: 'jwt|TokenExpiredError|401', desc: 'Find all session authentication failures' },
    { title: 'Postgres & DB Connection Pool Deadlocks', pattern: 'pgpool|Connection pool|deadlock', desc: 'Isolate database saturation and lock contention' },
    { title: 'HTTP 5xx Server Errors & Timeouts', pattern: '500|502|504|timeout|Upstream', desc: 'Gateway and reverse-proxy failures' },
    { title: 'Kafka & Message Broker Replicas', pattern: 'KafkaProducerError|Broker|RabbitMQ', desc: 'Asynchronous event pipeline bottlenecks' },
    { title: 'Rate Limiting & Throttling Warnings', pattern: 'Rate limiting|quota|429', desc: 'Client throttling and burst limits' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-[#0b1019] border border-[#1e2d44] w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="h-12 bg-[#0e1624] border-b border-[#1b273b] px-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <Binary className="w-4 h-4 text-cyan-400" />
            <span>Grep Filters &amp; Regex Presets</span>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3 overflow-y-auto">
          <p className="text-xs text-slate-400 leading-relaxed">
            Select a curated regex filter to instantly isolate critical incident signals in the log viewer:
          </p>

          <div className="space-y-2">
            {presets.map((preset) => (
              <div
                key={preset.title}
                onClick={() => {
                  onApplyPattern(preset.pattern);
                  onClose();
                }}
                className="p-3 rounded-lg bg-[#0e1624] hover:bg-[#132034] border border-[#1a263a] hover:border-cyan-500/50 cursor-pointer transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-slate-200 group-hover:text-cyan-300">
                    {preset.title}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/40">
                    Apply Filter
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">{preset.desc}</div>
                <code className="block mt-1.5 text-[10.5px] font-mono text-cyan-400 bg-[#070b12] p-1.5 rounded border border-[#172233]">
                  /{preset.pattern}/gi
                </code>
              </div>
            ))}
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
