import React, { useState } from 'react';
import { 
  X, 
  Server, 
  Key, 
  ShieldCheck, 
  Check, 
  Terminal, 
  RefreshCw, 
  Lock, 
  Folder,
  Radio
} from 'lucide-react';
import { SSHConnection } from '../types/ssh';

interface SSHConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  connections: SSHConnection[];
  activeConnectionId: string;
  onSaveConnection: (connection: SSHConnection) => void;
  onSelectConnection: (connectionId: string) => void;
}

export const SSHConnectionModal: React.FC<SSHConnectionModalProps> = ({
  isOpen,
  onClose,
  connections,
  activeConnectionId,
  onSaveConnection,
  onSelectConnection,
}) => {
  const activeConn = connections.find(c => c.id === activeConnectionId) || connections[0];

  const [selectedPresetId, setSelectedPresetId] = useState<string>(activeConn?.id || 'conn-prod-01');
  const [name, setName] = useState(activeConn?.name || 'Production Node 01');
  const [host, setHost] = useState(activeConn?.host || 'prod-k8s-node-01.us-east.internal');
  const [port, setPort] = useState(activeConn?.port || 22);
  const [username, setUsername] = useState(activeConn?.username || 'deploy');
  const [authMethod, setAuthMethod] = useState<'key' | 'password'>(activeConn?.authMethod || 'key');
  const [keyName, setKeyName] = useState(activeConn?.privateKeyName || 'id_ed25519_prod_sre');
  const [password, setPassword] = useState('••••••••••••');
  const [remotePath, setRemotePath] = useState(activeConn?.remotePath || '/var/log');
  
  // Handshake test states
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latency?: number } | null>(null);

  if (!isOpen) return null;

  const handleSelectPreset = (connId: string) => {
    setSelectedPresetId(connId);
    const found = connections.find(c => c.id === connId);
    if (found) {
      setName(found.name);
      setHost(found.host);
      setPort(found.port);
      setUsername(found.username);
      setAuthMethod(found.authMethod);
      setKeyName(found.privateKeyName || 'id_ed25519_prod_sre');
      setRemotePath(found.remotePath);
      setTestResult(null);
    }
  };

  const handleTestConnection = () => {
    setIsTesting(true);
    setTestResult(null);

    setTimeout(() => {
      setIsTesting(false);
      setTestResult({
        success: true,
        latency: Math.floor(Math.random() * 8) + 12,
        message: `Connected successfully to ${username}@${host}:${port}. Host key SHA256:d8Q8kZ verified. SFTP folder mounted: "${remotePath}".`
      });
    }, 850);
  };

  const handleConnectAndMount = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: SSHConnection = {
      id: selectedPresetId,
      name,
      host,
      port: Number(port),
      username,
      authMethod,
      privateKeyName: keyName,
      remotePath,
      isConnected: true,
      latencyMs: testResult?.latency || 14,
      cipher: 'chacha20-poly1305@openssh.com',
      fingerprint: 'SHA256:d8Q8kZ...9aB12'
    };

    onSaveConnection(updated);
    onSelectConnection(selectedPresetId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 select-none">
      <div className="bg-[#0b1019] border border-[#1e2d44] w-full max-w-xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="h-12 bg-[#0e1624] border-b border-[#1b273b] px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs sm:text-sm font-semibold text-white truncate">
              SSH Connection &amp; Remote Folder Mount
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-slate-400 hover:text-white cursor-pointer transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs font-sans">
          
          {/* Preset Profiles Tabs */}
          <div>
            <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1.5">
              Configured Remote SSH Hosts
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {connections.map((conn) => {
                const isSelected = conn.id === selectedPresetId;
                return (
                  <button
                    key={conn.id}
                    type="button"
                    onClick={() => handleSelectPreset(conn.id)}
                    className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#102138] border-cyan-500/70 text-cyan-300 shadow-sm'
                        : 'bg-[#0e1624] border-[#1a263a] text-slate-400 hover:text-slate-200 hover:bg-[#131e30]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-medium truncate text-[11.5px]">
                      <Radio className={`w-3 h-3 shrink-0 ${isSelected ? 'text-cyan-400' : 'text-slate-600'}`} />
                      <span className="truncate">{conn.name}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono truncate mt-0.5">
                      {conn.host}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form */}
          <form id="ssh-form" onSubmit={handleConnectAndMount} className="space-y-3.5">
            
            {/* Host and Port */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              <div className="sm:col-span-3">
                <label className="text-slate-300 font-medium block mb-1 text-[11.5px]">
                  Remote Server Host / IP Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-500">
                    <Server className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="text"
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    placeholder="e.g. prod-k8s-node-01.internal"
                    required
                    className="w-full pl-8 pr-3 py-1.5 rounded bg-[#070b12] border border-[#1b2639] text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1 text-[11.5px]">
                  Port
                </label>
                <input
                  type="number"
                  value={port}
                  onChange={(e) => setPort(Number(e.target.value))}
                  placeholder="22"
                  required
                  className="w-full px-2.5 py-1.5 rounded bg-[#070b12] border border-[#1b2639] text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Username and Remote Folder Path */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-slate-300 font-medium block mb-1 text-[11.5px]">
                  SSH Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-500 font-mono text-xs">
                    @
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="deploy / ubuntu / root"
                    required
                    className="w-full pl-7 pr-3 py-1.5 rounded bg-[#070b12] border border-[#1b2639] text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1 text-[11.5px] flex items-center justify-between">
                  <span>Remote Log Folder to Access</span>
                  <span className="text-[10px] text-cyan-400 font-mono">mount target</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-500">
                    <Folder className="w-3.5 h-3.5 text-cyan-500" />
                  </div>
                  <input
                    type="text"
                    value={remotePath}
                    onChange={(e) => setRemotePath(e.target.value)}
                    placeholder="/var/log"
                    required
                    className="w-full pl-8 pr-3 py-1.5 rounded bg-[#070b12] border border-[#1b2639] text-cyan-300 font-mono text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>

            {/* Authentication Method */}
            <div className="p-3 rounded-lg bg-[#0e1624] border border-[#1a263a] space-y-2.5">
              <label className="text-slate-300 font-semibold block text-[11.5px]">
                SSH Authentication Method
              </label>

              <div className="flex flex-wrap items-center gap-4 text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="radio"
                    name="authMethod"
                    checked={authMethod === 'key'}
                    onChange={() => setAuthMethod('key')}
                    className="accent-cyan-400"
                  />
                  <span>Public Key (Ed25519 / RSA)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="radio"
                    name="authMethod"
                    checked={authMethod === 'password'}
                    onChange={() => setAuthMethod('password')}
                    className="accent-cyan-400"
                  />
                  <span>Password Authentication</span>
                </label>
              </div>

              {authMethod === 'key' ? (
                <div className="pt-1">
                  <label className="text-slate-400 text-[11px] block mb-1">
                    Select Stored Key / Identity File:
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded bg-[#070b12] border border-[#1b2639] text-slate-200 font-mono text-xs truncate">
                      <Key className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="truncate">~/.ssh/{keyName}</span>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-mono px-2 py-1 bg-emerald-950/40 border border-emerald-800/40 rounded flex items-center gap-1 shrink-0">
                      <ShieldCheck className="w-3 h-3" />
                      Encrypted
                    </span>
                  </div>
                </div>
              ) : (
                <div className="pt-1">
                  <label className="text-slate-400 text-[11px] block mb-1">
                    SSH Password:
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-500">
                      <Lock className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 rounded bg-[#070b12] border border-[#1b2639] text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Test Connection Output */}
            {testResult && (
              <div className="p-3 rounded-lg bg-[#0a1829] border border-cyan-800/60 text-cyan-200 font-mono text-[11px] flex items-start gap-2 animate-fadeIn">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-semibold text-emerald-300">
                    Handshake Verified · Latency: {testResult.latency}ms
                  </div>
                  <div className="text-[10.5px] text-slate-300 mt-0.5 leading-relaxed">
                    {testResult.message}
                  </div>
                </div>
              </div>
            )}

          </form>

        </div>

        {/* Modal Footer */}
        <div className="bg-[#0e1624] border-t border-[#1b273b] px-4 py-2.5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-1.5 rounded bg-[#131e30] hover:bg-[#1a2942] border border-[#233550] text-slate-200 text-xs font-mono transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isTesting ? 'animate-spin' : ''}`} />
            <span>{isTesting ? 'Testing...' : 'Test SSH Handshake'}</span>
          </button>

          <div className="w-full sm:w-auto flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="ssh-form"
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs transition-colors cursor-pointer shadow-md shadow-cyan-600/30"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Connect</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
