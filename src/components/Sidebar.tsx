import React, { useState } from 'react';
import { 
  Folder, 
  FolderOpen, 
  FileCode2, 
  ChevronRight, 
  ChevronDown, 
  Server, 
  RefreshCw, 
  HardDrive,
  Settings2,
  FolderTree,
  X
} from 'lucide-react';
import { FileTreeNode, SSHConnection } from '../types/ssh';

interface SidebarProps {
  fileTree: FileTreeNode[];
  currentFilePath: string;
  onSelectTreeNode: (node: FileTreeNode) => void;
  activeConnection: SSHConnection;
  onOpenSSHModal: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  fileTree,
  currentFilePath,
  onSelectTreeNode,
  activeConnection,
  onOpenSSHModal,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const [treeState, setTreeState] = useState<FileTreeNode[]>(fileTree);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Toggle folder open/closed
  const toggleFolder = (nodeId: string) => {
    const updateNodes = (nodes: FileTreeNode[]): FileTreeNode[] => {
      return nodes.map(node => {
        if (node.id === nodeId) {
          return { ...node, isOpen: !node.isOpen };
        }
        if (node.children) {
          return { ...node, children: updateNodes(node.children) };
        }
        return node;
      });
    };
    setTreeState(prev => updateNodes(prev));
  };

  const handleRefresh = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  const handleFileClick = (node: FileTreeNode) => {
    onSelectTreeNode(node);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  // Recursive renderer for file tree
  const renderTree = (nodes: FileTreeNode[], depth: number = 0) => {
    return nodes.map(node => {
      const isFolder = node.type === 'folder';
      const isSelected = !isFolder && (node.path === currentFilePath || node.fileId === currentFilePath);

      return (
        <div key={node.id} className="select-none font-mono text-[11.5px]">
          {isFolder ? (
            /* Folder Item */
            <div>
              <div
                onClick={() => toggleFolder(node.id)}
                style={{ paddingLeft: `${depth * 14 + 8}px` }}
                className="flex items-center justify-between py-1.5 pr-2 rounded hover:bg-[#121c2d] text-slate-300 hover:text-white cursor-pointer group transition-colors"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span className="text-slate-500 group-hover:text-slate-300">
                    {node.isOpen ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                  </span>
                  {node.isOpen ? (
                    <FolderOpen className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  ) : (
                    <Folder className="w-3.5 h-3.5 text-cyan-500/80 shrink-0" />
                  )}
                  <span className="font-semibold text-slate-200 group-hover:text-cyan-200 truncate">
                    {node.name}
                  </span>
                </div>
                {node.children && (
                  <span className="text-[10px] text-slate-500 font-sans">
                    {node.children.length}
                  </span>
                )}
              </div>

              {/* Children */}
              {node.isOpen && node.children && (
                <div className="border-l border-[#1a2536] ml-3.5">
                  {renderTree(node.children, depth + 1)}
                </div>
              )}
            </div>
          ) : (
            /* File Item */
            <div
              onClick={() => handleFileClick(node)}
              style={{ paddingLeft: `${depth * 14 + 16}px` }}
              className={`flex items-center justify-between py-1.5 pr-2 my-0.5 rounded cursor-pointer transition-colors group ${
                isSelected
                  ? 'bg-[#12223a] text-cyan-300 border-l-2 border-cyan-400 font-medium'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#0f1726]'
              }`}
              title={`${node.path} (${node.size || ''})`}
            >
              <div className="flex items-center gap-1.5 truncate">
                <FileCode2
                  className={`w-3.5 h-3.5 shrink-0 ${
                    isSelected ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'
                  }`}
                />
                <span className="truncate">{node.name}</span>
              </div>
              {node.size && (
                <span className="text-[10px] text-slate-500 font-sans tabular-nums shrink-0 ml-1">
                  {node.size}
                </span>
              )}
            </div>
          )}
        </div>
      );
    });
  };

  const sidebarContent = (
    <div className="flex flex-col justify-between h-full select-none text-xs">
      {/* Top Section: SSH Remote Connection Panel */}
      <div className="p-2.5 border-b border-[#182335] bg-[#0c121d]">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                activeConnection.isConnected
                  ? 'bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.8)]'
                  : 'bg-rose-500'
              }`}
            />
            <span className="text-[10.5px] font-mono font-semibold tracking-wider text-slate-400 uppercase">
              SSH HOST
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={onOpenSSHModal}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#131d2e] hover:bg-[#1a2942] border border-[#233550] text-[10.5px] text-cyan-300 hover:text-cyan-200 transition-colors cursor-pointer"
              title="Configure SSH Connection & Remote Folder"
            >
              <Settings2 className="w-3 h-3 text-cyan-400" />
              <span>Config</span>
            </button>
            {onCloseMobile && (
              <button
                onClick={onCloseMobile}
                className="md:hidden p-1 rounded hover:bg-[#1a253a] text-slate-400 hover:text-white cursor-pointer ml-1"
                aria-label="Close Sidebar"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Active SSH Connection Card */}
        <div 
          onClick={onOpenSSHModal}
          className="p-2 rounded-lg bg-[#070b12] border border-[#1b273b] hover:border-cyan-500/50 cursor-pointer transition-colors group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 truncate">
              <Server className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="font-mono text-[11.5px] font-semibold text-white group-hover:text-cyan-300 truncate">
                {activeConnection.name}
              </span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-1.5 py-0.2 rounded border border-emerald-800/40 shrink-0">
              {activeConnection.latencyMs}ms
            </span>
          </div>

          <div className="mt-1 flex items-center justify-between text-[10.5px] font-mono text-slate-400 truncate">
            <span className="truncate text-slate-400">{activeConnection.username}@{activeConnection.host}</span>
            <span className="text-slate-500 shrink-0 ml-1">:{activeConnection.port}</span>
          </div>

          <div className="mt-1 text-[10px] font-mono text-cyan-400/90 flex items-center gap-1 truncate pt-0.5 border-t border-[#141d2c]">
            <span className="text-slate-500">Mounted:</span>
            <span className="truncate">{activeConnection.remotePath}</span>
          </div>
        </div>
      </div>

      {/* Middle Section: FILE TREE EXPLORER */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tree Header */}
        <div className="px-3 py-2 border-b border-[#152030] flex items-center justify-between bg-[#080c14]">
          <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase">
            <FolderTree className="w-3.5 h-3.5 text-cyan-400" />
            <span>REMOTE FILE TREE</span>
          </div>

          <button
            onClick={handleRefresh}
            className="p-1 rounded hover:bg-[#141f30] text-slate-500 hover:text-slate-200 transition-colors cursor-pointer"
            title="Refresh remote directory tree"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>

        {/* Scrollable Tree View */}
        <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
          {renderTree(treeState)}
        </div>
      </div>

      {/* Bottom Memory & SSH Buffer Widget */}
      <div className="p-2.5 border-t border-[#182233] bg-[#070a10] shrink-0">
        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-1">
          <span className="tracking-wider uppercase font-semibold text-slate-500 flex items-center gap-1">
            <HardDrive className="w-3 h-3 text-cyan-500" />
            MEMORY BUFFER
          </span>
          <span className="text-slate-300 font-medium">48.2 MB / 256 MB</span>
        </div>

        {/* Progress bar with cyan indicator */}
        <div className="w-full h-1.5 bg-[#141d2c] rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-cyan-500 to-sky-400 rounded-full"
            style={{ width: `${(48.2 / 256) * 100}%` }}
          />
        </div>

        <div className="mt-1.5 flex items-center justify-between text-[9.5px] font-mono text-slate-500">
          <span>SSH-2.0 · OpenSSH</span>
          <span>{activeConnection.cipher.split('@')[0]}</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex w-64 lg:w-72 bg-[#090d15] border-r border-[#192233] shrink-0 h-full flex-col">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            onClick={onCloseMobile}
            className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity"
          />

          {/* Slide-out Drawer Panel */}
          <div className="relative w-[85%] max-w-[320px] bg-[#090d15] border-r border-[#1e2d42] h-full shadow-2xl flex flex-col z-50 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
