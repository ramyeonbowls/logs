export interface SSHConnection {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  authMethod: 'key' | 'password';
  privateKeyName?: string;
  remotePath: string;
  isConnected: boolean;
  latencyMs: number;
  cipher: string;
  fingerprint: string;
}

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
