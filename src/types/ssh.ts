export type ConnectionType = 'ssh' | 'remote_tunnel' | 'local_folder';
export type AuthMethod = 'password' | 'key' | 'token';

export interface AppConnection {
  id: string;
  name: string;
  type: ConnectionType;
  
  // Remote SSH & Tunnel fields
  host?: string;
  port?: number;
  username?: string;
  authMethod?: AuthMethod;
  password?: string;
  hasPassword?: boolean;
  privateKey?: string;
  privateKeyName?: string;
  hasPrivateKey?: boolean;
  passphrase?: string;
  tunnelToken?: string;
  hasTunnelToken?: boolean;
  remotePath?: string;
  cipher?: string;
  fingerprint?: string;
  
  // Local folder fields
  localPath?: string;
  recursive?: boolean;
  fileFilter?: string;
  
  // Status fields
  isConnected: boolean;
  latencyMs: number;
  status?: 'connected' | 'disconnected' | 'testing' | 'error';
  statusMessage?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Backwards compatibility alias
export type SSHConnection = AppConnection;

export interface FileTreeNode {
  id: string;
  name: string;
  path: string;
  type: 'folder' | 'file';
  size?: string;
  lineCount?: number;
  fileId?: string;
  children?: FileTreeNode[];
  isOpen?: boolean;
}
