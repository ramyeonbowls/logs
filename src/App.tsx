import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { LogFile, LogLevel, LogLine } from './types/log';
import { SSHConnection, FileTreeNode } from './types/ssh';
import { LogPulseAPI, BackendStatus } from './services/api';
import { LoginScreen } from './components/LoginScreen';
import { HeaderBar } from './components/HeaderBar';
import { Sidebar } from './components/Sidebar';
import { LogViewerToolbar } from './components/LogViewerToolbar';
import { LogStatusBar } from './components/LogStatusBar';
import { LogStreamViewer } from './components/LogStreamViewer';
import { BottomStatusBar } from './components/BottomStatusBar';
import { JumpModal } from './components/JumpModal';
import { DirectoryViewModal } from './components/DirectoryViewModal';
import { MetricsViewModal } from './components/MetricsViewModal';
import { GrepViewModal } from './components/GrepViewModal';
import { SettingsModal } from './components/SettingsModal';
import { SSHConnectionModal } from './components/SSHConnectionModal';
import { ConnectionSettingsModal } from './components/ConnectionSettingsModal';
import { useToast } from './components/Toast';

const EMPTY_CONNECTION: SSHConnection = {
  id: '',
  name: 'No connection selected',
  type: 'ssh',
  isConnected: false,
  latencyMs: 0
};

const EMPTY_LOG_FILE: LogFile = {
  id: '',
  path: '',
  filename: 'No file selected',
  size: '0 B',
  lineCount: 0,
  encoding: 'UTF-8',
  lineEnding: 'LF',
  stats: { errorCount: 0, warnCount: 0, infoCount: 0, debugCount: 0, fatalCount: 0 },
  lines: []
};

function findFirstFileNode(nodes: FileTreeNode[]): FileTreeNode | null {
  for (const node of nodes) {
    if (node.type === 'file') return node;
    if (node.children) {
      const found = findFirstFileNode(node.children);
      if (found) return found;
    }
  }
  return null;
}

export default function App() {
  const { showToast } = useToast();
  // Current screen mode: 'login' | 'workspace'
  // Check sessionStorage for existing session on mount
  const [currentScreen, setCurrentScreen] = useState<'login' | 'workspace'>(() => {
    try {
      const session = sessionStorage.getItem('logpulse_session');
      return session ? 'workspace' : 'login';
    } catch {
      return 'login';
    }
  });

  // Authenticated user state
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const session = sessionStorage.getItem('logpulse_session');
      return session ? JSON.parse(session) : { name: '', email: '', role: '' };
    } catch {
      return { name: '', email: '', role: '' };
    }
  });

  // Backend Connection Status
  const [backendStatus, setBackendStatus] = useState<BackendStatus | null>(null);

  // SSH Connections & Active Connection
  const [sshConnections, setSshConnections] = useState<SSHConnection[]>([]);
  const [activeSSHId, setActiveSSHId] = useState<string>('');
  const [isSSHModalOpen, setIsSSHModalOpen] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // File Tree State
  const [fileTree, setFileTree] = useState<FileTreeNode[]>([]);

  // Files data & current file selection
  const [files, setFiles] = useState<LogFile[]>([]);
  const [currentFileId, setCurrentFileId] = useState<string>('');

  // Tailing & Streaming
  const [isTailing, setIsTailing] = useState<boolean>(true);
  const [isFollowTail, setIsFollowTail] = useState<boolean>(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isCaseSensitive, setIsCaseSensitive] = useState<boolean>(false);
  const [isRegex, setIsRegex] = useState<boolean>(false);
  const [activeLevelFilter, setActiveLevelFilter] = useState<LogLevel | null>(null);

  // Display configurations
  const [isWrapText, setIsWrapText] = useState<boolean>(false);
  const [fontSize, setFontSize] = useState<number>(12); // default terminal 12px
  const [selectedLineNumber, setSelectedLineNumber] = useState<number | null>(1048); // Line 1048 highlighted as in Image 3
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Modals state
  const [isJumpModalOpen, setIsJumpModalOpen] = useState<boolean>(false);
  const [isDirectoryModalOpen, setIsDirectoryModalOpen] = useState<boolean>(false);
  const [isMetricsModalOpen, setIsMetricsModalOpen] = useState<boolean>(false);
  const [isGrepModalOpen, setIsGrepModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);

  // Initial Backend Discovery & Synchronization
  useEffect(() => {
    let mounted = true;

    async function initBackend() {
      try {
        const status = await LogPulseAPI.checkHealth();
        if (mounted) setBackendStatus(status);
        if (!status.connected) {
          if (mounted) showToast('Backend is offline. Remote log and connection features may be unavailable.', 'warning');
          return;
        }

        let hasLocalSession = false;
        try { hasLocalSession = Boolean(sessionStorage.getItem('logpulse_session')); } catch {}
        if (!hasLocalSession) return;

        const authenticatedUser = await LogPulseAPI.getMe();
        if (!mounted) return;
        if (!authenticatedUser) {
          try { sessionStorage.removeItem('logpulse_session'); } catch {}
          setCurrentUser({ name: '', email: '', role: '' });
          setCurrentScreen('login');
          return;
        }
        setCurrentUser(authenticatedUser);

        // Fetch backend SSH connections
        const conns = await LogPulseAPI.getSSHConnections();
        if (mounted) {
          setSshConnections(conns);
          setActiveSSHId(conns.find(connection => connection.isConnected)?.id || '');
        }

        // Fetch backend File Tree
        const tree = await LogPulseAPI.getFileTree();
        if (mounted) {
          setFileTree(tree);
        }

      } catch (err) {
        console.warn('Backend sync failed:', err);
        if (mounted) showToast(err instanceof Error ? err.message : 'Could not sync with the backend.');
      }
    }

    initBackend();

    const pingInterval = setInterval(async () => {
      const status = await LogPulseAPI.checkHealth();
      if (mounted) setBackendStatus(status);
    }, 12000);

    return () => {
      mounted = false;
      clearInterval(pingInterval);
    };
  }, [currentScreen, showToast]);

  // Active SSH object
  const activeConnection = useMemo(() => {
    return sshConnections.find(c => c.id === activeSSHId) || EMPTY_CONNECTION;
  }, [sshConnections, activeSSHId]);

  // Current active log file object
  const currentFile = useMemo(() => {
    return files.find(f => f.id === currentFileId) || EMPTY_LOG_FILE;
  }, [files, currentFileId]);

  // Selected Log Line object for inspector
  const selectedLine = useMemo(() => {
    if (!selectedLineNumber) return currentFile.lines[0] || null;
    return currentFile.lines.find(l => l.lineNumber === selectedLineNumber) || currentFile.lines[0] || null;
  }, [currentFile, selectedLineNumber]);

  // Real-time tailing from the selected remote file
  useEffect(() => {
    if (!isTailing || !currentFile.path) return;

    return LogPulseAPI.subscribeLogStream(
      currentFile.path,
      (newLines: LogLine[]) => {
        setFiles(prevFiles =>
          prevFiles.map(file => {
            if (file.path !== currentFile.path) return file;

            const lines = [...file.lines, ...newLines];
            return {
              ...file,
              lineCount: file.lineCount + newLines.length,
              // Keep the active tail bounded so long sessions cannot grow memory forever.
              lines: lines.length > 5000 ? lines.slice(-5000) : lines
            };
          })
        );
      },
      (connected) => {
        setBackendStatus(prev => prev ? { ...prev, sseActive: connected } : null);
      }
    );
  }, [isTailing, currentFile.path]);

  // Handle clicking a node in the File Tree
  const handleSelectTreeNode = async (node: FileTreeNode) => {
    if (node.type !== 'file') return;

    const fileId = node.fileId || node.id;
    try {
      const result = await LogPulseAPI.getLogs({ fileId, filePath: node.path });
      const logFile: LogFile = {
        id: fileId,
        path: node.path,
        filename: node.name,
        size: node.size || 'Unknown',
        lineCount: result.totalLines,
        encoding: 'UTF-8',
        lineEnding: 'LF',
        stats: result.stats,
        lines: result.lines
      };
      setFiles(prev => [logFile, ...prev.filter(file => file.path !== node.path)]);
      setCurrentFileId(fileId);
      setSelectedLineNumber(result.lines[0]?.lineNumber || null);
    } catch (error: any) {
      showToast(error.message || 'Could not read remote log file.');
      setCurrentFileId('');
      setSelectedLineNumber(null);
      setFiles([]);
    }
  };

  // Handle saving SSH connection
  const handleSaveSSHConnection = async (updated: SSHConnection) => {
    setSshConnections(prev => prev.map(c => c.id === updated.id ? updated : c));
    setActiveSSHId(updated.id);

    // Sync to backend and reload fileTree
    try {
      await LogPulseAPI.saveSSHConnection(updated);
      const updatedTree = await LogPulseAPI.getFileTree();
      if (updatedTree && updatedTree.length > 0) {
        setFileTree(updatedTree);
        return;
      }
    } catch (err) {
      console.warn('Backend SSH save error:', err);
    }

    // Update root folder in file tree if remote path changed
    setFileTree(prev => {
      const targetPath = updated.localPath || updated.remotePath || '/var/log';
      return prev.map((rootNode, idx) => {
        if (idx === 0) {
          return {
            ...rootNode,
            name: targetPath,
            path: targetPath,
          };
        }
        return rootNode;
      });
    });
  };

  // Filtered lines based on search and level filter
  const filteredLines = useMemo(() => {
    const query = searchQuery.trim();
    const normalizedQuery = query.toLocaleLowerCase();
    let expression: RegExp | null = null;
    if (query && isRegex) {
      try {
        expression = new RegExp(query, isCaseSensitive ? '' : 'i');
      } catch {
        expression = null;
      }
    }

    return currentFile.lines.filter(line => {
      // Level filter
      if (activeLevelFilter && line.level !== activeLevelFilter) {
        return false;
      }

      // Search query
      if (!query) return true;

      const fullText = `${line.lineNumber} ${line.timestamp} ${line.level} ${line.service} ${line.traceId || ''} ${line.message} ${line.stackTrace?.join(' ') || ''}`;

      if (expression) {
        expression.lastIndex = 0;
        return expression.test(fullText);
      }

      if (isCaseSensitive) {
        return fullText.includes(query);
      }

      return fullText.toLocaleLowerCase().includes(normalizedQuery);
    });
  }, [currentFile.lines, activeLevelFilter, searchQuery, isCaseSensitive, isRegex]);

  // Match counter calculation
  const matchCount = useMemo(() => {
    if (!searchQuery.trim()) return 0;
    return filteredLines.length;
  }, [searchQuery, filteredLines.length]);

  const [matchIndex, setMatchIndex] = useState<number>(0);

  const handlePrevMatch = useCallback(() => {
    if (matchCount === 0) return;
    const nextIdx = matchIndex <= 0 ? matchCount - 1 : matchIndex - 1;
    setMatchIndex(nextIdx);
    const targetLine = filteredLines[nextIdx];
    if (targetLine) {
      setSelectedLineNumber(targetLine.lineNumber);
      document.getElementById(`line-${targetLine.lineNumber}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [matchCount, matchIndex, filteredLines]);

  const handleNextMatch = useCallback(() => {
    if (matchCount === 0) return;
    const nextIdx = (matchIndex + 1) % matchCount;
    setMatchIndex(nextIdx);
    const targetLine = filteredLines[nextIdx];
    if (targetLine) {
      setSelectedLineNumber(targetLine.lineNumber);
      document.getElementById(`line-${targetLine.lineNumber}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [matchCount, matchIndex, filteredLines]);

  // Copy logs handler
  const handleCopyLogs = async () => {
    const textToCopy = filteredLines.map(l => `${l.lineNumber} ${l.timestamp} [${l.level}] [${l.service}] ${l.message}`).join('\n');
    try {
      await navigator.clipboard.writeText(textToCopy);
      setIsCopied(true);
      showToast('Visible log lines copied.', 'success');
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      showToast('Could not copy the log lines. Check clipboard permissions.');
    }
  };

  const handleDownloadFile = () => {
    const a = document.createElement('a');
    a.href = LogPulseAPI.getDownloadUrl(currentFile.path);
    a.download = currentFile.filename;
    a.click();
  };

  // Scroll shortcuts
  const handleScrollToTop = () => {
    setIsFollowTail(false);
    if (filteredLines[0]) {
      setSelectedLineNumber(filteredLines[0].lineNumber);
      document.getElementById(`line-${filteredLines[0].lineNumber}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleScrollToEnd = () => {
    const last = filteredLines[filteredLines.length - 1];
    if (last) {
      setSelectedLineNumber(last.lineNumber);
      document.getElementById(`line-${last.lineNumber}`)?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  };

  const handleJumpToLine = (lineNum: number) => {
    setSelectedLineNumber(lineNum);
    const element = document.getElementById(`line-${lineNum}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleUploadCustomFile = (newFile: LogFile) => {
    setFiles(prev => [newFile, ...prev]);
    setCurrentFileId(newFile.id);
    setSelectedLineNumber(newFile.lines[0]?.lineNumber || 1);

    // Also add to file tree under root
    setFileTree(prev => {
      const updated = [...prev];
      if (updated[0] && updated[0].children) {
        updated[0].children.unshift({
          id: `custom-node-${Date.now()}`,
          name: newFile.filename,
          path: newFile.path,
          type: 'file',
          size: newFile.size,
          lineCount: newFile.lineCount,
          fileId: newFile.id
        });
      }
      return updated;
    });
  };

  // If user is in Login screen
  if (currentScreen === 'login') {
    return (
      <div className="relative w-screen h-screen">
        <LoginScreen
          onSignIn={(user) => {
            try { sessionStorage.setItem('logpulse_session', JSON.stringify(user)); } catch {}
            setCurrentUser(user);
            setCurrentScreen('workspace');
          }}
        />
      </div>
    );
  }

  return (
    <div className="workspace-shell relative w-screen h-screen flex flex-col bg-[#070b12] text-slate-200 overflow-hidden select-none font-sans">
      
      {/* Top Header Bar */}
      <HeaderBar
        currentFile={currentFile}
        isTailing={isTailing}
        onToggleTail={() => setIsTailing(!isTailing)}
        onSignOut={() => {
            void LogPulseAPI.logout().catch(() => {});
            try { sessionStorage.removeItem('logpulse_session'); } catch {}
            setCurrentScreen('login');
          }}
        user={currentUser}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(prev => !prev)}
        isMobileSidebarOpen={isMobileSidebarOpen}
        backendStatus={backendStatus}
        onRefreshBackend={async () => {
          const status = await LogPulseAPI.checkHealth();
          setBackendStatus(status);
        }}
        activeConnection={activeConnection}
        onOpenConnectionModal={() => setIsSSHModalOpen(true)}
      />

      {/* Main Workspace Body: Sidebar (File Tree + SSH) + Log Viewer Viewport */}
      <div className="workspace-body flex-1 flex overflow-hidden relative">
        {/* Left Sidebar: File Tree & SSH Connection Manager */}
        <Sidebar
          fileTree={fileTree}
          currentFilePath={currentFile.path}
          onSelectTreeNode={handleSelectTreeNode}
          activeConnection={activeConnection}
          onOpenSSHModal={() => setIsSSHModalOpen(true)}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          onRefreshTree={async () => {
            const tree = await LogPulseAPI.getFileTree();
            setFileTree(tree);
          }}
        />

        {/* Central Log Viewer Area */}
        <main className="workspace-main flex-1 flex flex-col overflow-hidden bg-[#070b12] min-w-0">
          {/* Top Filter & Grep Toolbar */}
          <LogViewerToolbar
            currentFile={currentFile}
            files={files}
            onSelectFile={setCurrentFileId}
            searchQuery={searchQuery}
            onSearchChange={(q) => {
              setSearchQuery(q);
              setMatchIndex(0);
            }}
            matchIndex={matchIndex}
            matchCount={matchCount}
            onPrevMatch={handlePrevMatch}
            onNextMatch={handleNextMatch}
            isCaseSensitive={isCaseSensitive}
            onToggleCaseSensitive={() => setIsCaseSensitive(!isCaseSensitive)}
            isRegex={isRegex}
            onToggleRegex={() => setIsRegex(!isRegex)}
            isFollowTail={isFollowTail}
            onToggleFollowTail={() => setIsFollowTail(!isFollowTail)}
            isWrapText={isWrapText}
            onToggleWrapText={() => setIsWrapText(!isWrapText)}
            onOpenJumpModal={() => setIsJumpModalOpen(true)}
            fontSize={fontSize}
            onChangeFontSize={(delta) => setFontSize(prev => Math.min(18, Math.max(10, prev + delta)))}
            onCopyLogs={handleCopyLogs}
            onDownloadFile={handleDownloadFile}
            isCopied={isCopied}
          />

          {/* Sub Status & Quick Filter Bar */}
          <LogStatusBar
            currentFile={currentFile}
            activeLevelFilter={activeLevelFilter}
            onToggleLevelFilter={(lvl) => {
              setActiveLevelFilter(prev => prev === lvl ? null : lvl);
            }}
            onClearFilter={() => setActiveLevelFilter(null)}
            onScrollToTop={handleScrollToTop}
            onScrollToEnd={handleScrollToEnd}
          />

          {/* Terminal Log Stream View */}
          <LogStreamViewer
            lines={filteredLines}
            selectedLineNumber={selectedLineNumber}
            onSelectLine={(num) => {
              setSelectedLineNumber(num);
            }}
            searchQuery={searchQuery}
            isCaseSensitive={isCaseSensitive}
            isWrapText={isWrapText}
            fontSize={fontSize}
            isFollowTail={isFollowTail}
          />

          {/* Bottom IDE Status Bar */}
          <BottomStatusBar
            currentFile={currentFile}
            selectedLineNumber={selectedLineNumber}
            isTailing={isTailing}
            onToggleTail={() => setIsTailing(!isTailing)}
            backendStatus={backendStatus}
          />
        </main>
      </div>


      {/* Modals & Dialogs: Comprehensive Connection Config & SQLite Manager */}
      <ConnectionSettingsModal
        isOpen={isSSHModalOpen}
        onClose={() => setIsSSHModalOpen(false)}
        connections={sshConnections}
        activeConnectionId={activeSSHId}
        onSelectConnection={async (connId, updatedTree) => {
          setActiveSSHId(connId);
          setFiles([]);
          setCurrentFileId('');
          setSelectedLineNumber(null);
          try {
            const newTree = updatedTree?.length
              ? updatedTree
              : (await LogPulseAPI.activateConnection(connId)).fileTree;
            setFileTree(newTree);
            const first = findFirstFileNode(newTree);
            if (first) {
              handleSelectTreeNode(first);
            }
          } catch (err) {
            console.warn('Activate connection error:', err);
            showToast(err instanceof Error ? err.message : 'Could not activate connection.');
            setFileTree([]);
          }
        }}
        onRefreshConnections={async () => {
          const conns = await LogPulseAPI.getConnections();
          if (conns && conns.length > 0) {
            setSshConnections(conns);
          }
        }}
      />

      <JumpModal
        isOpen={isJumpModalOpen}
        onClose={() => setIsJumpModalOpen(false)}
        maxLines={currentFile.lineCount}
        onJump={handleJumpToLine}
      />

      <DirectoryViewModal
        isOpen={isDirectoryModalOpen}
        onClose={() => setIsDirectoryModalOpen(false)}
        files={files}
        onSelectFile={setCurrentFileId}
      />

      <MetricsViewModal
        isOpen={isMetricsModalOpen}
        onClose={() => setIsMetricsModalOpen(false)}
        currentFile={currentFile}
      />

      <GrepViewModal
        isOpen={isGrepModalOpen}
        onClose={() => setIsGrepModalOpen(false)}
        onApplyPattern={(pattern) => {
          setSearchQuery(pattern);
          setIsRegex(true);
        }}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />

    </div>
  );
}
