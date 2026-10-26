import React, { useState, useEffect, useMemo } from 'react';
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
  X,
  Globe,
  Database,
  Radio,
  Search
} from 'lucide-react';
import { FileTreeNode, SSHConnection } from '../types/ssh';
import { useToast } from './Toast';

interface SidebarProps {
  fileTree: FileTreeNode[];
  currentFilePath: string;
  onSelectTreeNode: (node: FileTreeNode) => void;
  activeConnection: SSHConnection;
  onOpenSSHModal: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  onRefreshTree?: () => void | Promise<void>;
}

export const Sidebar: React.FC<SidebarProps> = ({
  fileTree,
  currentFilePath,
  onSelectTreeNode,
  activeConnection,
  onOpenSSHModal,
  isMobileOpen = false,
  onCloseMobile,
  onRefreshTree,
}) => {
  const [treeState, setTreeState] = useState<FileTreeNode[]>(fileTree);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { showToast } = useToast();
  const [treeSearch, setTreeSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Sync internal state when prop fileTree changes
  useEffect(() => {
    setTreeState(fileTree);
  }, [fileTree]);

  const visibleTree = useMemo(() => {
    const query = treeSearch.trim().toLowerCase();
    const filterNodes = (nodes: FileTreeNode[]): FileTreeNode[] => nodes
      .map(node => {
        if (node.type === 'file') {
          return !query || node.name.toLowerCase().includes(query) || node.path.toLowerCase().includes(query)
            ? node
            : null;
        }

        const children = filterNodes(node.children || []);
        if (query && children.length === 0) return null;
        return { ...node, children, isOpen: query ? true : node.isOpen };
      })
      .filter((node): node is FileTreeNode => node !== null)
      .sort((left, right) => {
        const difference = (left.modifiedAt || 0) - (right.modifiedAt || 0);
        return sortOrder === 'newest' ? -difference : difference;
      });

    return filterNodes(treeState);
  }, [treeState, treeSearch, sortOrder]);

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

  const handleRefresh = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRefreshing(true);
    try {
      await onRefreshTree?.();
    } catch (error: any) {
      showToast(error.message || 'Could not refresh directory tree.');
    } finally {
      setIsRefreshing(false);
    }
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
        <div key={node.id} className="file-tree-node select-none font-mono text-[11.5px]">
          {isFolder ? (
            /* Folder Item */
            <div>
              <div
                onClick={() => toggleFolder(node.id)}
                title={node.modifiedAt ? `Updated ${new Date(node.modifiedAt).toLocaleString()}` : undefined}
                style={{ paddingLeft: `${depth * 14 + 8}px` }}
                className="file-tree-folder flex items-center justify-between py-1.5 pr-2 rounded hover:bg-[#121c2d] text-slate-300 hover:text-white cursor-pointer group transition-colors"
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
                  <span className="text-[10px] text-slate-600 font-mono">
                    {node.children.length}
                  </span>
                )}
              </div>

              {/* Children */}
              {node.isOpen && node.children && (
                <div className="relative">
                  <div 
                    style={{ left: `${depth * 14 + 14}px` }} 
                    className="absolute top-0 bottom-0 w-[1px] bg-[#1a2538]" 
                  />
                  {renderTree(node.children, depth + 1)}
                </div>
              )}
            </div>
          ) : (
            /* File Item */
            <div
              onClick={() => handleFileClick(node)}
              title={node.modifiedAt ? `Updated ${new Date(node.modifiedAt).toLocaleString()}` : undefined}
              style={{ paddingLeft: `${depth * 14 + 16}px` }}
              className={`file-tree-file flex items-center justify-between py-1.5 pr-2 rounded cursor-pointer transition-colors ${
                isSelected
                  ? 'is-selected bg-cyan-950/70 text-cyan-300 font-semibold border-l-2 border-cyan-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#101726]'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <FileCode2 className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-cyan-400' : 'text-slate-500'}`} />
                <span className="truncate">{node.name}</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-500 shrink-0">
                {node.size && <span>{node.size}</span>}
              </div>
            </div>
          )}
        </div>
      );
    });
  };

  const isLocal = activeConnection?.type === 'local_folder';
  const isTunnel = activeConnection?.type === 'remote_tunnel';

  const sidebarContent = (
    <div className="workspace-sidebar flex flex-col h-full overflow-hidden select-none">
      
      {/* Top Section: ACTIVE CONNECTION BANNER */}
      <div className="sidebar-connection-panel p-3 border-b border-[#182336] bg-[#0c121e]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-[10px] font-mono tracking-wider text-slate-400 uppercase font-bold">
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span>MOUNTED CONNECTION</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={onOpenSSHModal}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#131d2e] hover:bg-[#1a2942] border border-[#233550] text-[10.5px] text-cyan-300 hover:text-cyan-200 transition-colors cursor-pointer"
              title="Configure Connections & SQLite Credentials"
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

        {/* Active Connection Card */}
        <div 
          onClick={onOpenSSHModal}
          className={`p-2.5 rounded-lg border cursor-pointer transition-all group ${
            isLocal 
              ? 'bg-[#120f08] border-amber-800/50 hover:border-amber-500/70'
              : isTunnel
              ? 'bg-[#081214] border-teal-800/50 hover:border-teal-500/70'
              : 'bg-[#070b12] border-[#1b273b] hover:border-cyan-500/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 truncate">
              {isLocal ? (
                <Folder className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              ) : isTunnel ? (
                <Globe className="w-3.5 h-3.5 text-teal-400 shrink-0" />
              ) : (
                <Server className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              )}
              <span className={`font-mono text-[11.5px] font-semibold truncate ${
                isLocal ? 'text-amber-200 group-hover:text-amber-300' : isTunnel ? 'text-teal-200 group-hover:text-teal-300' : 'text-white group-hover:text-cyan-300'
              }`}>
                {activeConnection?.name || 'Local System Logs'}
              </span>
            </div>
            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border shrink-0 ${
              isLocal 
                ? 'text-amber-400 bg-amber-950/50 border-amber-800/50' 
                : 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40'
            }`}>
              {isLocal ? '<1ms (I/O)' : `${activeConnection?.latencyMs || 14}ms`}
            </span>
          </div>

          <div className="mt-1 flex items-center justify-between text-[10.5px] font-mono text-slate-400 truncate">
            {isLocal ? (
              <span className="truncate text-amber-300/90 font-medium">{activeConnection?.localPath || '/var/log'}</span>
            ) : (
              <span className="truncate text-slate-400">{activeConnection?.username}@{activeConnection?.host}:{activeConnection?.port}</span>
            )}
            <span className="text-[9.5px] font-mono bg-black/40 text-slate-400 px-1 rounded ml-1 shrink-0">
              {isLocal ? 'LOCAL' : isTunnel ? 'TUNNEL' : 'SSH'}
            </span>
          </div>

          <div className="mt-1 text-[10px] font-mono text-slate-400 flex items-center justify-between pt-1 border-t border-[#162234]">
            <span className="flex items-center gap-1 text-slate-400">
              <Database className="w-2.5 h-2.5 text-cyan-400" />
              <span>SQLite Synced</span>
            </span>
            <span className="text-cyan-400/90 truncate">
              {isLocal ? `${activeConnection?.fileFilter || '*.log'}` : `${activeConnection?.remotePath || '/var/log'}`}
            </span>
          </div>
        </div>
      </div>

      {/* Middle Section: FILE TREE EXPLORER */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tree Header */}
        <div className="file-tree-header px-3 py-2 border-b border-[#152030] flex items-center justify-between bg-[#080c14]">
          <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase">
            <FolderTree className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isLocal ? 'LOCAL FILE TREE' : 'REMOTE FILE TREE'}</span>
          </div>

          <button
            onClick={handleRefresh}
            className="p-1 rounded hover:bg-[#141f30] text-slate-500 hover:text-slate-200 transition-colors cursor-pointer"
            title="Refresh directory tree from backend"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>

        <div className="file-tree-filters flex items-center gap-1.5 px-2 py-2 border-b border-[#152030]">
          <label className="flex items-center gap-1.5 flex-1 min-w-0 bg-[#070b12] border border-[#1b2639] rounded px-2 py-1.5 focus-within:border-cyan-500/80">
            <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <input
              type="search"
              value={treeSearch}
              onChange={event => setTreeSearch(event.target.value)}
              placeholder="Search files or paths"
              aria-label="Search files or paths"
              className="w-full min-w-0 bg-transparent text-[10.5px] font-mono text-slate-200 placeholder-slate-600 focus:outline-none"
            />
          </label>
          <select
            value={sortOrder}
            onChange={event => setSortOrder(event.target.value as 'newest' | 'oldest')}
            aria-label="Sort files by last update"
            className="max-w-[88px] bg-[#101724] border border-[#1e2c44] rounded px-1.5 py-1.5 text-[9.5px] font-mono text-slate-300 focus:outline-none focus:border-cyan-500/80"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
          </select>
        </div>

        {/* Scrollable Tree View */}
        <div className="file-tree-list flex-1 overflow-y-auto p-1.5 space-y-0.5">
          {visibleTree.length > 0 ? (
            renderTree(visibleTree)
          ) : (
            <div className="p-4 text-center text-slate-500 font-mono text-[11px]">
              {treeSearch ? 'No matching files.' : 'No files found on this connection.'}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Memory & SQLite Buffer Widget */}
      <div className="p-1 border-t border-[#182233] bg-[#070a10] shrink-0">
        {/* <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-1">
          <span className="tracking-wider uppercase font-semibold text-slate-500 flex items-center gap-1">
            <HardDrive className="w-3 h-3 text-cyan-500" />
            BUFFER &amp; STORAGE
          </span>
          <span className="text-slate-300 font-medium">48.2 MB / 256 MB</span>
        </div> */}

        {/* Progress bar with cyan indicator */}
        {/* <div className="w-full h-1.5 bg-[#141d2c] rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-cyan-500 to-sky-400 rounded-full"
            style={{ width: `${(48.2 / 256) * 100}%` }}
          />
        </div> */}

        <div className="mt-1 flex items-center justify-between text-[9.5px] font-mono text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>SQLite: data/logpulse.sqlite</span>
          </span>
          <span>{isLocal ? 'POSIX Direct I/O' : (activeConnection?.cipher || 'chacha20-poly1305').split('@')[0]}</span>
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
