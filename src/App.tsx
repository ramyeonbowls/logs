import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { SAMPLE_FILES, MOCK_NEW_STREAM_LINES } from './data/sampleLogs';
import { DEFAULT_SSH_CONNECTIONS, INITIAL_FILE_TREE } from './data/fileTreeData';
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
  // Current screen mode: 'login' | 'workspace'
  const [currentScreen, setCurrentScreen] = useState<'login' | 'workspace'>('workspace');

  // Authenticated user state
  const [currentUser, setCurrentUser] = useState({
    name: 'Julian Putra',
    email: 'julian.putra99@gmail.com',
    role: 'Site Reliability Engineer (L5)'
  });

  // Backend Connection Status
  const [backendStatus, setBackendStatus] = useState<BackendStatus | null>(null);

  // SSH Connections & Active Connection
  const [sshConnections, setSshConnections] = useState<SSHConnection[]>(DEFAULT_SSH_CONNECTIONS);
  const [activeSSHId, setActiveSSHId] = useState<string>('conn-prod-01');
  const [isSSHModalOpen, setIsSSHModalOpen] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // File Tree State
  const [fileTree, setFileTree] = useState<FileTreeNode[]>(INITIAL_FILE_TREE);

  // Files data & current file selection
  const [files, setFiles] = useState<LogFile[]>(SAMPLE_FILES);
  const [currentFileId, setCurrentFileId] = useState<string>('production-api');

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

        // Fetch backend SSH connections
        const conns = await LogPulseAPI.getSSHConnections();
        if (mounted && conns && conns.length > 0) {
          setSshConnections(conns);
        }

        // Fetch backend File Tree
        const tree = await LogPulseAPI.getFileTree();
        if (mounted && tree && tree.length > 0) {
          setFileTree(tree);
        }

        // Fetch initial logs from backend for production-api
        const logsRes = await LogPulseAPI.getLogs({ fileId: 'production-api' });
        if (mounted && logsRes && logsRes.lines && logsRes.lines.length > 0) {
          setFiles(prev => prev.map(f => f.id === 'production-api' ? {
            ...f,
            lines: logsRes.lines,
            lineCount: logsRes.totalLines,
            stats: logsRes.stats
          } : f));
        }
      } catch (err) {
        console.warn('Backend sync failed, running with local caches:', err);
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
  }, []);

  // Active SSH object
  const activeConnection = useMemo(() => {
    return sshConnections.find(c => c.id === activeSSHId) || sshConnections[0];
  }, [sshConnections, activeSSHId]);

  // Current active log file object
  const currentFile = useMemo(() => {
    return files.find(f => f.id === currentFileId) || files[0];
  }, [files, currentFileId]);

  // Selected Log Line object for inspector
  const selectedLine = useMemo(() => {
    if (!selectedLineNumber) return currentFile.lines[0] || null;
    return currentFile.lines.find(l => l.lineNumber === selectedLineNumber) || currentFile.lines[0] || null;
  }, [currentFile, selectedLineNumber]);

  // Real-time tailing via SSE from backend, with local fallback
  useEffect(() => {
    if (!isTailing || currentFileId !== 'production-api') return;

    let sseActive = false;

    // Connect to Server-Sent Events (SSE) from the backend
    const unsubscribeSSE = LogPulseAPI.subscribeLogStream(
      (newLine: LogLine) => {
        sseActive = true;
        setFiles(prevFiles =>
          prevFiles.map(file => {
            if (file.id !== 'production-api') return file;

            return {
              ...file,
              lineCount: file.lineCount + 1,
              stats: {
                ...file.stats,
                errorCount: file.stats.errorCount + (newLine.level === 'ERROR' ? 1 : 0),
                warnCount: file.stats.warnCount + (newLine.level === 'WARN' ? 1 : 0),
                infoCount: file.stats.infoCount + (newLine.level === 'INFO' ? 1 : 0),
                debugCount: file.stats.debugCount + (newLine.level === 'DEBUG' ? 1 : 0),
              },
              lines: [...file.lines, newLine]
            };
          })
        );
      },
      (connected) => {
        setBackendStatus(prev => prev ? { ...prev, sseActive: connected } : null);
      }
    );

    // Backup timer fallback in case SSE is interrupted or backend is paused
    let mockIndex = 0;
    const interval = setInterval(() => {
      if (sseActive) return; // SSE is delivering live data, no need for local mock

      const template = MOCK_NEW_STREAM_LINES[mockIndex % MOCK_NEW_STREAM_LINES.length];
      mockIndex++;

      setFiles(prevFiles =>
        prevFiles.map(file => {
          if (file.id !== 'production-api') return file;

          const lastLine = file.lines[file.lines.length - 1];
          const nextLineNumber = (lastLine ? lastLine.lineNumber + (lastLine.stackTrace ? lastLine.stackTrace.length + 1 : 1) : 1068);

          const newLine: LogLine = {
            id: `stream-${Date.now()}-${Math.random()}`,
            lineNumber: nextLineNumber,
            timestamp: new Date().toISOString(),
            level: template.level,
            service: template.service,
            traceId: `tr_${Math.random().toString(36).substring(2, 8)}`,
            spanId: `sp_${Math.random().toString(36).substring(2, 10)}`,
            message: template.message,
            attributes: template.attributes,
            stackTrace: template.stackTrace
          };

          return {
            ...file,
            lineCount: file.lineCount + 1,
            stats: {
              ...file.stats,
              errorCount: file.stats.errorCount + (template.level === 'ERROR' ? 1 : 0),
              warnCount: file.stats.warnCount + (template.level === 'WARN' ? 1 : 0),
              infoCount: file.stats.infoCount + (template.level === 'INFO' ? 1 : 0),
              debugCount: file.stats.debugCount + (template.level === 'DEBUG' ? 1 : 0),
            },
            lines: [...file.lines, newLine]
          };
        })
      );
    }, 4500);

    return () => {
      unsubscribeSSE();
      clearInterval(interval);
    };
  }, [isTailing, currentFileId]);

  // Handle clicking a node in the File Tree
  const handleSelectTreeNode = async (node: FileTreeNode) => {
    if (node.type !== 'file') return;

    // Check if backend has logs for this file
    if (node.fileId || node.path) {
      try {
        const backendLog = await LogPulseAPI.getLogs({ fileId: node.fileId, filePath: node.path });
        if (backendLog && backendLog.lines && backendLog.lines.length > 0) {
          const targetId = node.fileId || node.id;
          setFiles(prev => {
            const exists = prev.find(f => f.id === targetId || f.path === node.path);
            if (exists) {
              return prev.map(f => (f.id === targetId || f.path === node.path) ? {
                ...f,
                lines: backendLog.lines,
                lineCount: backendLog.totalLines,
                stats: backendLog.stats
              } : f);
            } else {
              const newFile: LogFile = {
                id: node.fileId!,
                path: node.path,
                filename: node.name,
                size: node.size || '12.4 MB',
                lineCount: backendLog.totalLines,
                encoding: 'UTF-8',
                lineEnding: 'LF (Unix)',
                stats: backendLog.stats,
                lines: backendLog.lines
              };
              return [newFile, ...prev];
            }
          });
          setCurrentFileId(targetId);
          setSelectedLineNumber(backendLog.lines[0]?.lineNumber || 1);
          return;
        }
      } catch (err) {
        console.warn('Backend getLogs error:', err);
      }
    }

    // Check if file already exists in files list
    const existing = files.find(f => f.id === node.fileId || f.path === node.path);
    if (existing) {
      setCurrentFileId(existing.id);
      setSelectedLineNumber(existing.lines[0]?.lineNumber || 1048);
      return;
    }

    // Otherwise create dynamic file for this tree node
    const newLogFile: LogFile = {
      id: node.id,
      path: node.path,
      filename: node.name,
      size: node.size || '4.2 MB',
      lineCount: node.lineCount || 12000,
      encoding: 'UTF-8',
      lineEnding: 'LF (Unix)',
      stats: {
        errorCount: 8,
        warnCount: 24,
        infoCount: 1420,
        debugCount: 310,
        fatalCount: 0
      },
      lines: [
        {
          id: `${node.id}-1`,
          lineNumber: 1,
          timestamp: new Date().toISOString(),
          level: 'INFO',
          service: node.name.replace('.log', ''),
          message: `Mounted remote SSH file ${node.path} via SFTP stream (${activeConnection.host})`,
          attributes: { host: activeConnection.host || activeConnection.name, user: activeConnection.username || 'local' }
        },
        {
          id: `${node.id}-2`,
          lineNumber: 2,
          timestamp: new Date().toISOString(),
          level: 'INFO',
          service: node.name.replace('.log', ''),
          message: `Read buffer allocated: 64KB chunk size. Cipher: ${activeConnection.cipher || 'direct-io'}`,
          attributes: { latency: `${activeConnection.latencyMs}ms` }
        },
        {
          id: `${node.id}-3`,
          lineNumber: 3,
          timestamp: new Date().toISOString(),
          level: 'DEBUG',
          service: node.name.replace('.log', ''),
          message: `Active file descriptor synchronized. Ready for tailing.`,
        }
      ]
    };

    setFiles(prev => [newLogFile, ...prev]);
    setCurrentFileId(newLogFile.id);
    setSelectedLineNumber(1);
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
    return currentFile.lines.filter(line => {
      // Level filter
      if (activeLevelFilter && line.level !== activeLevelFilter) {
        return false;
      }

      // Search query
      if (!searchQuery.trim()) return true;

      const fullText = `${line.lineNumber} ${line.timestamp} ${line.level} ${line.service} ${line.traceId || ''} ${line.message} ${line.stackTrace?.join(' ') || ''}`;

      if (isRegex) {
        try {
          const rx = new RegExp(searchQuery, isCaseSensitive ? '' : 'i');
          return rx.test(fullText);
        } catch {
          return fullText.toLowerCase().includes(searchQuery.toLowerCase());
        }
      }

      if (isCaseSensitive) {
        return fullText.includes(searchQuery);
      }

      return fullText.toLowerCase().includes(searchQuery.toLowerCase());
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
  const handleCopyLogs = () => {
    const textToCopy = filteredLines.map(l => `${l.lineNumber} ${l.timestamp} [${l.level}] [${l.service}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(textToCopy);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Download raw file
  const handleDownloadFile = () => {
    const content = currentFile.lines.map(l => `${l.lineNumber} ${l.timestamp} [${l.level}] [${l.service}] ${l.message}`).join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentFile.filename;
    a.click();
    URL.revokeObjectURL(url);
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
            setCurrentUser(user);
            setCurrentScreen('workspace');
          }}
        />
        {/* Floating switch button to instantly view workspace */}
        <button
          onClick={() => setCurrentScreen('workspace')}
          className="fixed bottom-4 right-4 z-50 px-3 py-1.5 rounded-lg bg-[#141e30] hover:bg-[#1c2c46] border border-[#233550] text-cyan-300 text-xs shadow-xl cursor-pointer flex items-center gap-1.5 transition-colors font-mono"
        >
          <span>Skip to Log Viewer Screen →</span>
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen flex flex-col bg-[#070b12] text-slate-200 overflow-hidden select-none font-sans">
      
      {/* Top Header Bar */}
      <HeaderBar
        currentFile={currentFile}
        isTailing={isTailing}
        onToggleTail={() => setIsTailing(!isTailing)}
        onSignOut={() => setCurrentScreen('login')}
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
      <div className="flex-1 flex overflow-hidden relative">
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
            if (tree && tree.length > 0) setFileTree(tree);
          }}
        />

        {/* Central Log Viewer Area */}
        <main className="flex-1 flex flex-col overflow-hidden bg-[#070b12] min-w-0">
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
          try {
            const act = await LogPulseAPI.activateConnection(connId);
            const newTree = (updatedTree && updatedTree.length > 0)
              ? updatedTree
              : (act.fileTree && act.fileTree.length > 0 ? act.fileTree : await LogPulseAPI.getFileTree());
            if (newTree && newTree.length > 0) {
              setFileTree(newTree);
              const first = findFirstFileNode(newTree);
              if (first) {
                handleSelectTreeNode(first);
              }
            }
          } catch (err) {
            console.warn('Activate connection error:', err);
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
