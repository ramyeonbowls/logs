import React, { useState } from 'react';
import { X, ArrowDownToLine } from 'lucide-react';

interface JumpModalProps {
  isOpen: boolean;
  onClose: () => void;
  maxLines: number;
  onJump: (lineNumber: number) => void;
}

export const JumpModal: React.FC<JumpModalProps> = ({
  isOpen,
  onClose,
  maxLines,
  onJump,
}) => {
  const [lineInput, setLineInput] = useState('1048');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(lineInput, 10);
    if (!isNaN(parsed) && parsed > 0) {
      onJump(parsed);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-[#0b1019] border border-[#1e2d44] w-full max-w-sm rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="h-11 bg-[#0e1624] border-b border-[#1b273b] px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowDownToLine className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-semibold text-white">
              Jump to Line
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3 font-mono">
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">
              Line number (1 - {maxLines.toLocaleString()}):
            </label>
            <input
              type="number"
              min={1}
              max={maxLines}
              value={lineInput}
              onChange={(e) => setLineInput(e.target.value)}
              className="w-full px-3 py-2 rounded bg-[#070b12] border border-[#1b263a] text-cyan-300 text-xs focus:outline-none focus:border-cyan-500"
              autoFocus
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer font-sans"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium cursor-pointer font-sans"
            >
              Go to Line
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
