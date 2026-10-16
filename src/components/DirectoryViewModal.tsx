import React from 'react';
import { X, Folder, FileText, HardDrive } from 'lucide-react';
import { LogFile } from '../types/log';

interface DirectoryViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: LogFile[];
  onSelectFile: (fileId: string) => void;
}

export const DirectoryViewModal: React.FC<DirectoryViewModalProps> = ({
  isOpen,
  onClose,
  files,
  onSelectFile,
}) => {
  if (!isOpen) return null;

  const directories = [
    { name: '/var/log/services', fileCount: 4, size: '72.6 MB' },
    { name: '/var/log/nginx', fileCount: 2, size: '120.0 MB' },
    { name: '/var/log/systemd', fileCount: 1, size: '14.2 MB' },
    { name: '/var/log/containers', fileCount: 8, size: '210.4 MB' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-[#0b1019] border border-[#1e2d44] w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="h-12 bg-[#0e1624] border-b border-[#1b273b] px-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <Folder className="w-4 h-4 text-cyan-400" />
            <span>Server Log Files Directory (/var/log)</span>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto">
          {/* Virtual File System Folders */}
          <div>
            <div className="text-[11px] font-mono text-slate-400 uppercase mb-2">Mount Points &amp; Folders</div>
            <div className="grid grid-cols-2 gap-2">
              {directories.map((dir) => (
                <div key={dir.name} className="p-2.5 rounded bg-[#0e1624] border border-[#1a263a] flex items-center justify-between">
                  <div className="flex items-center gap-2 truncate">
                    <Folder className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span className="font-mono text-xs text-slate-200 truncate">{dir.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono shrink-0">{dir.size}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Files */}
          <div>
            <div className="text-[11px] font-mono text-slate-400 uppercase mb-2">Available Server Log Files</div>
            <div className="space-y-1 font-mono text-xs">
              {files.map((file) => (
                <div
                  key={file.id}
                  onClick={() => {
                    onSelectFile(file.id);
                    onClose();
                  }}
                  className="flex items-center justify-between p-2 rounded bg-[#090d16] hover:bg-[#121c2c] border border-[#172234] text-slate-300 hover:text-cyan-300 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="truncate">{file.path}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 text-[11px]">
                    <span className="text-slate-500">{file.size}</span>
                    <span className="text-slate-500">{file.lineCount.toLocaleString()} lines</span>
                    <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/40 text-[10px]">
                      Open
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#0e1624] border border-[#1b273b] flex items-center gap-3">
            <HardDrive className="w-5 h-5 text-cyan-400 shrink-0" />
            <div className="text-xs text-slate-300">
              <div className="font-semibold text-white">Log Rotation Daemon (Active)</div>
              <div className="text-[11px] text-slate-400">Retention policy: 14 days, max 500MB per service container. Compression: gzip.</div>
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
