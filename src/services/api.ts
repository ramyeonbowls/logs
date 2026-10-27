import { LogLine, LogFile, LogLevel } from '../types/log';
import { AppConnection, SSHConnection, FileTreeNode, ConnectionType } from '../types/ssh';

// When empty, relative URLs ('/api/...') hit the integrated backend server
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  return fetch(input, { ...init, credentials: 'include' });
}

class ApiResponseError extends Error {}

async function readApiError(res: Response, fallback: string): Promise<ApiResponseError> {
  const data = await res.json().catch(() => ({}));
  return new ApiResponseError(data.message || fallback);
}

export interface BackendStatus {
  connected: boolean;
  engine: string;
  uptime?: number;
  latencyMs: number;
  sseActive: boolean;
  lastChecked: string;
  sqliteActive?: boolean;
  sqliteConnectionsCount?: number;
}

export class LogPulseAPI {
  // 0. Healthcheck & connection probe
  static async checkHealth(): Promise<BackendStatus> {
    const startTime = performance.now();
    try {
      const res = await apiFetch(`${API_BASE}/api/health`, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(3500)
      });
      const latencyMs = Math.round(performance.now() - startTime);

      if (res.ok) {
        const data = await res.json();
        return {
          connected: true,
          engine: data.engine || 'LogPulse Core & SQLite',
          uptime: data.uptime || 0,
          latencyMs,
          sseActive: false,
          lastChecked: new Date().toLocaleTimeString(),
          sqliteActive: true,
          sqliteConnectionsCount: data.sqlite?.connectionsCount || 0
        };
      }
      throw new Error('Health check returned non-200');
    } catch {
      return {
        connected: false,
        engine: 'Offline',
        latencyMs: 0,
        sseActive: false,
        lastChecked: new Date().toLocaleTimeString(),
        sqliteActive: false,
        sqliteConnectionsCount: 0
      };
    }
  }

  // 1. Auth API
  static async login(username: string, password?: string) {
    try {
      const res = await apiFetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (!res.ok) throw await readApiError(res, 'Authentication failed');
      return await res.json();
    } catch (error) { throw error; }
  }

  static async logout() {
    const res = await apiFetch(`${API_BASE}/api/auth/logout`, { method: 'POST' });
    if (!res.ok) throw await readApiError(res, 'Could not sign out');
  }

  static async getMe() {
    try {
      const res = await apiFetch(`${API_BASE}/api/auth/me`);
      if (!res.ok) throw new Error('Failed to get user');
      return await res.json();
    } catch {
      return null;
    }
  }

  // 2. Comprehensive Connection Management & SQLite Persistence API
  static async getConnections(): Promise<AppConnection[]> {
    try {
      const res = await apiFetch(`${API_BASE}/api/connections`);
      if (!res.ok) throw await readApiError(res, 'Failed to fetch connections');
      return await res.json();
    } catch (err) {
      throw err;
    }
  }

  static async createConnection(conn: Partial<AppConnection>): Promise<{ success: boolean; connection: AppConnection }> {
    try {
      const res = await apiFetch(`${API_BASE}/api/connections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(conn)
      });
      if (!res.ok) throw await readApiError(res, 'Failed to create connection');
      return await res.json();
    } catch (err) { throw err; }
  }

  static async updateConnection(id: string, conn: Partial<AppConnection>): Promise<{ success: boolean; connection: AppConnection }> {
    try {
      const res = await apiFetch(`${API_BASE}/api/connections/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(conn)
      });
      if (!res.ok) throw await readApiError(res, 'Failed to update connection');
      return await res.json();
    } catch (err) { throw err; }
  }

  static async deleteConnection(id: string): Promise<{ success: boolean }> {
    try {
      const res = await apiFetch(`${API_BASE}/api/connections/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw await readApiError(res, 'Failed to delete connection');
      return await res.json();
    } catch (err) {
      throw err;
    }
  }

  static async activateConnection(id: string): Promise<{ success: boolean; activeId: string; fileTree: FileTreeNode[] }> {
    const res = await apiFetch(`${API_BASE}/api/connections/${encodeURIComponent(id)}/activate`, {
      method: 'POST'
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to activate connection');
    }
    return await res.json();
  }

  // 3. Connection Test & Handshake Verification (Supports Remote SSH, Tunnel, and Local Folder)
  static async testConnection(params: {
    type: ConnectionType;
    host?: string;
    port?: number;
    username?: string;
    authMethod?: string;
    password?: string;
    privateKey?: string;
    passphrase?: string;
    tunnelToken?: string;
    remotePath?: string;
    localPath?: string;
    recursive?: boolean;
    fileFilter?: string;
  }): Promise<{
    success: boolean;
    message: string;
    latencyMs: number;
    cipher?: string;
    fingerprint?: string;
    discoveredFiles?: Array<{ name: string; size: string; path: string }>;
  }> {
    const res = await apiFetch(`${API_BASE}/api/connections/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || 'Connection test failed');
    }
    return await res.json();
  }

  // Backward compatibility alias for existing components
  static async testSSH(params: {
    host: string;
    port: number;
    username: string;
    authMethod: string;
    remotePath: string;
    password?: string;
    privateKey?: string;
    passphrase?: string;
  }) {
    return this.testConnection({
      type: 'ssh',
      ...params
    });
  }

  static async getSSHConnections(): Promise<SSHConnection[]> {
    return this.getConnections();
  }

  static async saveSSHConnection(conn: SSHConnection) {
    if (conn.id) {
      return this.updateConnection(conn.id, conn);
    }
    return this.createConnection(conn);
  }

  // 4. File Tree API
  static async getFileTree(): Promise<FileTreeNode[]> {
    const res = await apiFetch(`${API_BASE}/api/files/tree`);
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to fetch file tree');
    }
    return await res.json();
  }

  // 5. Query Logs API
  static async getLogs(params: {
    fileId?: string;
    filePath?: string;
    path?: string;
    search?: string;
    level?: string;
    caseSensitive?: boolean;
    isRegex?: boolean;
  }) {
    const query = new URLSearchParams();
    if (params.fileId) query.set('fileId', params.fileId);
    if (params.filePath || params.path) query.set('path', params.filePath || params.path || '');
    if (params.search) query.set('search', params.search);
    if (params.level) query.set('level', params.level);
    if (params.caseSensitive) query.set('caseSensitive', 'true');
    if (params.isRegex) query.set('isRegex', 'true');

    const res = await apiFetch(`${API_BASE}/api/logs?${query.toString()}`);
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to fetch remote log');
    }
    return await res.json();
  }

  // 6. SSE Real-time Tailing Stream (TAIL -F)
  static subscribeLogStream(
    filePath: string,
    onLog: (line: LogLine) => void,
    onStatusChange?: (connected: boolean) => void
  ): () => void {
    try {
      const eventSource = new EventSource(`${API_BASE}/api/logs/stream?path=${encodeURIComponent(filePath)}`, { withCredentials: true });

      eventSource.onopen = () => {
        onStatusChange?.(true);
      };

      eventSource.onerror = () => {
        onStatusChange?.(false);
      };

      eventSource.addEventListener('connected', () => {
        onStatusChange?.(true);
      });

      eventSource.addEventListener('log', (event) => {
        try {
          const logLine: LogLine = JSON.parse(event.data);
          onLog(logLine);
        } catch (e) {
          console.error('SSE JSON parse error:', e);
        }
      });

      return () => {
        eventSource.close();
      };
    } catch {
      return () => {};
    }
  }

  // 7. Download Log File URL
  static getDownloadUrl(filePath: string): string {
    return `${API_BASE}/api/logs/download?path=${encodeURIComponent(filePath)}`;
  }

  // 8. Metrics API
  static async getMetrics() {
    try {
      const res = await apiFetch(`${API_BASE}/api/metrics`);
      if (!res.ok) throw await readApiError(res, 'Failed to fetch metrics');
      return await res.json();
    } catch (err) {
      throw err;
    }
  }

  // 9. Settings API
  static async getSettings() {
    try {
      const res = await apiFetch(`${API_BASE}/api/settings`);
      if (!res.ok) throw await readApiError(res, 'Failed to fetch settings');
      return await res.json();
    } catch (err) {
      throw err;
    }
  }

  static async saveSettings(newSettings: any) {
    try {
      const res = await apiFetch(`${API_BASE}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
      if (!res.ok) throw await readApiError(res, 'Failed to save settings');
      return await res.json();
    } catch (err) {
      throw err;
    }
  }
}
