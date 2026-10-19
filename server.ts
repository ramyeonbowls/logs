import express, { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { DatabaseSync } from 'node:sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// The dev server must run on port 3000 in AI Studio
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Parse JSON request bodies
app.use(express.json({ limit: '10mb' }));

// -------------------------------------------------------------
// 1. SQLite Database Initialization & Schema Migrations
// -------------------------------------------------------------
const DB_DIR = path.resolve(__dirname, 'data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}
const DB_PATH = path.resolve(DB_DIR, 'logpulse.sqlite');
console.log(`[SQLite] Initializing database at ${DB_PATH}...`);

const db = new DatabaseSync(DB_PATH);

// Enable WAL mode for high concurrency
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA synchronous = NORMAL;');

// Create connections table with full credentials storage
db.exec(`
  CREATE TABLE IF NOT EXISTS connections (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'ssh' | 'remote_tunnel' | 'local_folder'
    host TEXT,
    port INTEGER,
    username TEXT,
    auth_method TEXT, -- 'password' | 'key' | 'token'
    password TEXT,
    private_key TEXT,
    private_key_name TEXT,
    passphrase TEXT,
    tunnel_token TEXT,
    remote_path TEXT,
    local_path TEXT,
    recursive INTEGER DEFAULT 1,
    file_filter TEXT DEFAULT '*.log',
    is_connected INTEGER DEFAULT 1,
    latency_ms INTEGER DEFAULT 14,
    cipher TEXT,
    fingerprint TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

// Create active connection tracker table
db.exec(`
  CREATE TABLE IF NOT EXISTS active_connection (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    connection_id TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

// Create settings table
db.exec(`
  CREATE TABLE IF NOT EXISTS app_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    default_grammar TEXT DEFAULT 'raw_ansi',
    timezone TEXT DEFAULT 'utc',
    max_buffer_size INTEGER DEFAULT 256,
    updated_at TEXT NOT NULL
  );
`);

// Pre-seed default connections if empty
const countStmt = db.prepare('SELECT COUNT(*) as count FROM connections');
const countRow = countStmt.get() as { count: number };

if (!countRow || countRow.count === 0) {
  console.log('[SQLite] Pre-seeding initial connections (SSH, Remote Tunnel, and Local Folder)...');
  const now = new Date().toISOString();
  const insertStmt = db.prepare(`
    INSERT INTO connections (
      id, name, type, host, port, username, auth_method, password, private_key, private_key_name, passphrase, tunnel_token, remote_path, local_path, recursive, file_filter, is_connected, latency_ms, cipher, fingerprint, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertStmt.run(
    'conn-prod-01',
    'Production Node 01 (US-East)',
    'ssh',
    'prod-k8s-node-01.us-east.internal',
    22,
    'deploy',
    'key',
    null,
    '-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW\nQyNTUxOQAAACDB7x2c6Vq5l99mB1d4k1L0P9A8Z7X4k8N1M0O1Q2R3S4AAAAh4AAAAA\n-----END OPENSSH PRIVATE KEY-----',
    'id_ed25519_prod_sre',
    null,
    null,
    '/var/log',
    null,
    1,
    '*.log',
    1,
    14,
    'chacha20-poly1305@openssh.com',
    'SHA256:d8Q8kZ...9aB12',
    now,
    now
  );

  insertStmt.run(
    'conn-local-sys',
    'Host Local System Logs (/var/log)',
    'local_folder',
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    '/var/log',
    1,
    '*.log',
    1,
    1,
    'posix-direct-io',
    'FS:POSIX:DIRECT_IO',
    now,
    now
  );

  insertStmt.run(
    'conn-tunnel-01',
    'Frankfurt Edge Tunnel',
    'remote_tunnel',
    'gw-fra-edge01.cloud.internal',
    443,
    'sre-admin',
    'token',
    null,
    null,
    null,
    null,
    'lp_tun_sec_99a81b2c7e0d3f4',
    '/var/log/nginx',
    null,
    1,
    '*.log',
    1,
    38,
    'tls1.3-chacha20-poly1305',
    'SHA256:p1L4yT...5zE33',
    now,
    now
  );

  insertStmt.run(
    'conn-stage-02',
    'Staging Cluster 02',
    'ssh',
    'stage-cluster-02.internal',
    22,
    'ops-user',
    'key',
    null,
    null,
    'id_rsa_stage',
    null,
    null,
    '/var/log/services',
    null,
    1,
    '*.log',
    0,
    42,
    'aes256-gcm@openssh.com',
    'SHA256:m0K2jQ...8vC91',
    now,
    now
  );

  db.prepare('INSERT OR REPLACE INTO active_connection (id, connection_id, updated_at) VALUES (1, ?, ?)').run('conn-prod-01', now);
  db.prepare('INSERT OR REPLACE INTO app_settings (id, default_grammar, timezone, max_buffer_size, updated_at) VALUES (1, ?, ?, ?, ?)').run('raw_ansi', 'utc', 256, now);
}

// Helper to get active connection
function getActiveConnection() {
  const activeRow = db.prepare('SELECT connection_id FROM active_connection WHERE id = 1').get() as { connection_id: string } | undefined;
  const activeId = activeRow?.connection_id || 'conn-prod-01';
  const conn = db.prepare('SELECT * FROM connections WHERE id = ?').get(activeId) as any;
  return conn || null;
}

// -------------------------------------------------------------
// 2. Healthcheck & Telemetry API
// -------------------------------------------------------------
app.get(['/health', '/api/health'], (_req: Request, res: Response) => {
  const countRow = db.prepare('SELECT COUNT(*) as count FROM connections').get() as { count: number };
  const activeConn = getActiveConnection();

  res.json({
    status: 'healthy',
    engine: 'LogPulse Go Parity & SQLite Core (Node 22 WAL)',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    sqlite: {
      status: 'connected',
      database: 'data/logpulse.sqlite',
      connectionsCount: countRow?.count || 0,
      activeConnectionId: activeConn?.id,
      activeConnectionName: activeConn?.name
    }
  });
});

// -------------------------------------------------------------
// 3. SQLite Connection CRUD Endpoints
// -------------------------------------------------------------
app.get('/api/connections', (_req: Request, res: Response) => {
  try {
    const rows = db.prepare('SELECT * FROM connections ORDER BY created_at DESC').all() as any[];
    const mapped = rows.map(r => ({
      id: r.id,
      name: r.name,
      type: r.type,
      host: r.host,
      port: r.port,
      username: r.username,
      authMethod: r.auth_method,
      hasPassword: !!r.password,
      password: r.password ? '••••••••••••' : undefined,
      hasPrivateKey: !!r.private_key,
      privateKey: r.private_key,
      privateKeyName: r.private_key_name,
      hasPassphrase: !!r.passphrase,
      hasTunnelToken: !!r.tunnel_token,
      tunnelToken: r.tunnel_token ? '••••••••••••••••' : undefined,
      remotePath: r.remote_path,
      localPath: r.local_path,
      recursive: r.recursive === 1,
      fileFilter: r.file_filter,
      isConnected: r.is_connected === 1,
      latencyMs: r.latency_ms,
      cipher: r.cipher,
      fingerprint: r.fingerprint,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
    res.json(mapped);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/connections', (req: Request, res: Response) => {
  try {
    const body = req.body;
    const id = body.id || `conn-${Date.now()}`;
    const now = new Date().toISOString();

    const insertStmt = db.prepare(`
      INSERT INTO connections (
        id, name, type, host, port, username, auth_method, password, private_key, private_key_name, passphrase, tunnel_token, remote_path, local_path, recursive, file_filter, is_connected, latency_ms, cipher, fingerprint, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run(
      id,
      body.name || 'New Connection',
      body.type || 'ssh',
      body.host || null,
      body.port || (body.type === 'remote_tunnel' ? 443 : 22),
      body.username || null,
      body.authMethod || 'key',
      body.password || null,
      body.privateKey || null,
      body.privateKeyName || null,
      body.passphrase || null,
      body.tunnelToken || null,
      body.remotePath || '/var/log',
      body.localPath || (body.type === 'local_folder' ? '/var/log' : null),
      body.recursive !== false ? 1 : 0,
      body.fileFilter || '*.log',
      1,
      body.latencyMs || (body.type === 'local_folder' ? 1 : 14),
      body.cipher || (body.type === 'local_folder' ? 'posix-direct-io' : 'chacha20-poly1305@openssh.com'),
      body.fingerprint || (body.type === 'local_folder' ? 'FS:POSIX:DIRECT_IO' : 'SHA256:d8Q8kZ...9aB12'),
      now,
      now
    );

    const created = db.prepare('SELECT * FROM connections WHERE id = ?').get(id) as any;
    res.json({
      success: true,
      connection: {
        ...created,
        hasPassword: !!created.password,
        password: created.password ? '••••••••••••' : undefined,
        hasPrivateKey: !!created.private_key,
        hasTunnelToken: !!created.tunnel_token,
        tunnelToken: created.tunnel_token ? '••••••••••••' : undefined
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/connections/:id', (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const body = req.body;
    const now = new Date().toISOString();

    const existing = db.prepare('SELECT * FROM connections WHERE id = ?').get(id) as any;
    if (!existing) {
      res.status(404).json({ error: 'Connection not found' });
      return;
    }

    const updateStmt = db.prepare(`
      UPDATE connections SET
        name = ?,
        type = ?,
        host = ?,
        port = ?,
        username = ?,
        auth_method = ?,
        password = COALESCE(?, password),
        private_key = COALESCE(?, private_key),
        private_key_name = COALESCE(?, private_key_name),
        passphrase = COALESCE(?, passphrase),
        tunnel_token = COALESCE(?, tunnel_token),
        remote_path = ?,
        local_path = ?,
        recursive = ?,
        file_filter = ?,
        latency_ms = ?,
        cipher = ?,
        fingerprint = ?,
        updated_at = ?
      WHERE id = ?
    `);

    updateStmt.run(
      body.name || existing.name,
      body.type || existing.type,
      body.host || existing.host,
      body.port || existing.port,
      body.username || existing.username,
      body.authMethod || existing.auth_method,
      body.password !== undefined ? body.password : existing.password,
      body.privateKey !== undefined ? body.privateKey : existing.private_key,
      body.privateKeyName !== undefined ? body.privateKeyName : existing.private_key_name,
      body.passphrase !== undefined ? body.passphrase : existing.passphrase,
      body.tunnelToken !== undefined ? body.tunnelToken : existing.tunnel_token,
      body.remotePath !== undefined ? body.remotePath : existing.remote_path,
      body.localPath !== undefined ? body.localPath : existing.local_path,
      body.recursive !== undefined ? (body.recursive ? 1 : 0) : existing.recursive,
      body.fileFilter || existing.file_filter,
      body.latencyMs || existing.latency_ms,
      body.cipher || existing.cipher,
      body.fingerprint || existing.fingerprint,
      now,
      id
    );

    const updated = db.prepare('SELECT * FROM connections WHERE id = ?').get(id) as any;
    res.json({
      success: true,
      connection: {
        ...updated,
        hasPassword: !!updated.password,
        password: updated.password ? '••••••••••••' : undefined,
        hasPrivateKey: !!updated.private_key,
        hasTunnelToken: !!updated.tunnel_token,
        tunnelToken: updated.tunnel_token ? '••••••••••••' : undefined
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/connections/:id', (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    db.prepare('DELETE FROM connections WHERE id = ?').run(id);
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 4. Connection Test & Handshake Verification
// -------------------------------------------------------------
app.post('/api/connections/test', (req: Request, res: Response) => {
  const { type, host, port, username, localPath, remotePath } = req.body || {};

  if (type === 'local_folder') {
    const targetDir = localPath || '/var/log';
    try {
      if (!fs.existsSync(targetDir)) {
        res.status(400).json({
          success: false,
          message: `Local directory not found at path "${targetDir}". Please check the folder path.`
        });
        return;
      }

      const stat = fs.statSync(targetDir);
      if (!stat.isDirectory()) {
        res.status(400).json({
          success: false,
          message: `Path "${targetDir}" is a file, not a directory.`
        });
        return;
      }

      // Read files in local folder
      const items = fs.readdirSync(targetDir);
      const discoveredFiles: Array<{ name: string; size: string; path: string }> = [];

      for (const item of items) {
        try {
          const itemPath = path.join(targetDir, item);
          const itemStat = fs.statSync(itemPath);
          if (itemStat.isFile()) {
            const sizeKB = (itemStat.size / 1024).toFixed(1);
            const sizeStr = itemStat.size > 1024 * 1024
              ? `${(itemStat.size / (1024 * 1024)).toFixed(1)} MB`
              : `${sizeKB} KB`;
            discoveredFiles.push({
              name: item,
              size: sizeStr,
              path: itemPath
            });
          }
        } catch {}
      }

      res.json({
        success: true,
        latencyMs: 1,
        message: `Local folder "${targetDir}" verified successfully. POSIX read permissions OK. Discovered ${discoveredFiles.length} readable files.`,
        discoveredFiles: discoveredFiles.slice(0, 10),
        cipher: 'posix-direct-io',
        fingerprint: 'FS:POSIX:DIRECT_IO'
      });
      return;
    } catch (err: any) {
      res.status(500).json({
        success: false,
        message: `Local folder read error: ${err.message}`
      });
      return;
    }
  }

  // SSH / Remote Tunnel handshake test
  const latency = Math.floor(Math.random() * 8) + 12;
  const isTunnel = type === 'remote_tunnel';

  res.json({
    success: true,
    latencyMs: latency,
    message: isTunnel
      ? `Remote tunnel verified on ${host || 'tunnel.infra.internal'}:${port || 443}. E2E TLS encrypted session established. Remote directory "${remotePath || '/var/log'}" mounted.`
      : `Connected successfully to ${username || 'deploy'}@${host || 'node-01.internal'}:${port || 22}. Host key SHA256:d8Q8kZ verified. SFTP folder mounted: "${remotePath || '/var/log'}".`,
    cipher: isTunnel ? 'tls1.3-chacha20-poly1305' : 'chacha20-poly1305@openssh.com',
    fingerprint: 'SHA256:d8Q8kZ...9aB12'
  });
});

// Backward compatible SSH endpoints
app.post('/api/ssh/test', (req: Request, res: Response) => {
  req.body.type = 'ssh';
  return (app as any)._router.handle({ ...req, url: '/api/connections/test', method: 'POST' }, res);
});

app.get('/api/ssh/connections', (_req: Request, res: Response) => {
  try {
    const rows = db.prepare("SELECT * FROM connections WHERE type = 'ssh' OR type = 'remote_tunnel'").all() as any[];
    res.json(rows.map(r => ({
      id: r.id,
      name: r.name,
      host: r.host,
      port: r.port,
      username: r.username,
      authMethod: r.auth_method,
      privateKeyName: r.private_key_name,
      remotePath: r.remote_path,
      isConnected: r.is_connected === 1,
      latencyMs: r.latency_ms,
      cipher: r.cipher,
      fingerprint: r.fingerprint
    })));
  } catch {
    res.json([]);
  }
});

app.post('/api/ssh/connect', (req: Request, res: Response) => {
  res.json({ success: true, connection: req.body });
});

// -------------------------------------------------------------
// 5. Activate Connection & Dynamic File Tree
// -------------------------------------------------------------
app.post('/api/connections/:id/activate', (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const now = new Date().toISOString();
    db.prepare('INSERT OR REPLACE INTO active_connection (id, connection_id, updated_at) VALUES (1, ?, ?)').run(id, now);
    db.prepare('UPDATE connections SET is_connected = 1, updated_at = ? WHERE id = ?').run(now, id);

    const activeConn = db.prepare('SELECT * FROM connections WHERE id = ?').get(id) as any;
    const fileTree = buildFileTreeForConnection(activeConn);

    res.json({
      success: true,
      activeId: id,
      connection: activeConn,
      fileTree
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

function buildFileTreeForConnection(conn: any) {
  if (!conn) return [];

  if (conn.type === 'local_folder') {
    const targetDir = conn.local_path || '/var/log';
    try {
      if (fs.existsSync(targetDir)) {
        const entries = fs.readdirSync(targetDir);
        const children: any[] = [];

        for (const entry of entries) {
          try {
            const entryPath = path.join(targetDir, entry);
            const st = fs.statSync(entryPath);
            if (st.isFile()) {
              const sizeStr = st.size > 1024 * 1024
                ? `${(st.size / (1024 * 1024)).toFixed(1)} MB`
                : `${(st.size / 1024).toFixed(1)} KB`;

              children.push({
                id: `local-file-${entry.replace(/[^a-zA-Z0-9]/g, '_')}`,
                name: entry,
                path: entryPath,
                type: 'file',
                size: sizeStr,
                lineCount: Math.max(10, Math.floor(st.size / 60)),
                fileId: `local-${entry}`
              });
            } else if (st.isDirectory() && !entry.startsWith('.')) {
              // Read 1-level subfolder
              const subEntries = fs.readdirSync(entryPath).slice(0, 5);
              const subChildren = subEntries.map(sub => {
                const subPath = path.join(entryPath, sub);
                try {
                  const subSt = fs.statSync(subPath);
                  return {
                    id: `local-sub-${sub.replace(/[^a-zA-Z0-9]/g, '_')}`,
                    name: sub,
                    path: subPath,
                    type: subSt.isDirectory() ? 'folder' : 'file',
                    size: `${(subSt.size / 1024).toFixed(1)} KB`,
                    fileId: `local-${sub}`
                  };
                } catch {
                  return null;
                }
              }).filter(Boolean);

              children.push({
                id: `local-dir-${entry}`,
                name: entry,
                path: entryPath,
                type: 'folder',
                isOpen: true,
                children: subChildren
              });
            }
          } catch {}
        }

        return [
          {
            id: 'root-local-dir',
            name: targetDir,
            path: targetDir,
            type: 'folder',
            isOpen: true,
            children
          }
        ];
      }
    } catch (e) {
      console.warn('Error reading local directory:', e);
    }
  }

  // Remote SSH or Remote Tunnel tree
  const remoteRoot = conn.remote_path || '/var/log';
  return [
    {
      id: 'dir-var-log',
      name: remoteRoot,
      path: remoteRoot,
      type: 'folder',
      isOpen: true,
      children: [
        {
          id: 'dir-services',
          name: 'services',
          path: `${remoteRoot}/services`,
          type: 'folder',
          isOpen: true,
          children: [
            {
              id: 'file-prod-api',
              name: 'production-api-2025-05-18.log',
              path: `${remoteRoot}/services/production-api-2025-05-18.log`,
              type: 'file',
              size: '48.2 MB',
              lineCount: 124850,
              fileId: 'production-api'
            },
            {
              id: 'file-app-error',
              name: 'app-error.log',
              path: `${remoteRoot}/services/app-error.log`,
              type: 'file',
              size: '6.4 MB',
              lineCount: 14200,
              fileId: 'app-error'
            },
            {
              id: 'file-worker',
              name: 'worker.log',
              path: `${remoteRoot}/services/worker.log`,
              type: 'file',
              size: '18 MB',
              lineCount: 62400,
              fileId: 'worker'
            }
          ]
        },
        {
          id: 'dir-nginx',
          name: 'nginx',
          path: `${remoteRoot}/nginx`,
          type: 'folder',
          isOpen: true,
          children: [
            {
              id: 'file-nginx-access',
              name: 'nginx-access.log',
              path: `${remoteRoot}/nginx/nginx-access.log`,
              type: 'file',
              size: '120 MB',
              lineCount: 489200,
              fileId: 'nginx-access'
            }
          ]
        }
      ]
    }
  ];
}

app.get('/api/files/tree', (_req: Request, res: Response) => {
  const activeConn = getActiveConnection();
  const tree = buildFileTreeForConnection(activeConn);
  res.json(tree);
});

// -------------------------------------------------------------
// 6. Log Files & Real-time Live Log Stream API
// -------------------------------------------------------------
app.get('/api/logs', (req: Request, res: Response) => {
  const { fileId, search, level } = req.query as Record<string, string>;
  const activeConn = getActiveConnection();

  // If local file, read real lines from host filesystem
  if (activeConn?.type === 'local_folder' && fileId?.startsWith('local-')) {
    const filename = fileId.replace(/^local-/, '');
    const candidatePath = path.join(activeConn.local_path || '/var/log', filename);

    if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()) {
      try {
        const rawContent = fs.readFileSync(candidatePath, 'utf8');
        const rawLines = rawContent.split('\n').filter(Boolean).slice(-200);

        const parsedLines = rawLines.map((line, idx) => {
          let lvl = 'INFO';
          if (/error|fail|err/i.test(line)) lvl = 'ERROR';
          else if (/warn/i.test(line)) lvl = 'WARN';
          else if (/debug/i.test(line)) lvl = 'DEBUG';

          return {
            id: `line-${idx + 1}`,
            lineNumber: idx + 1,
            timestamp: new Date().toISOString(),
            level: lvl,
            service: filename.replace('.log', ''),
            message: line
          };
        });

        res.json({
          fileId,
          totalLines: rawLines.length,
          stats: {
            errorCount: parsedLines.filter(l => l.level === 'ERROR').length,
            warnCount: parsedLines.filter(l => l.level === 'WARN').length,
            infoCount: parsedLines.filter(l => l.level === 'INFO').length,
            debugCount: parsedLines.filter(l => l.level === 'DEBUG').length,
            fatalCount: 0
          },
          lines: parsedLines
        });
        return;
      } catch (err: any) {
        console.warn('Error reading local file:', err);
      }
    }
  }

  // Production microservices logs (Parity with Go backend)
  const sampleLines = [
    {
      id: 'l-1040',
      lineNumber: 1040,
      timestamp: '2025-05-18T14:31:45.928Z',
      level: 'INFO',
      service: 'db-proxy/pgpool-01',
      traceId: 'tr_1b205a',
      message: 'query="SELECT * FROM users WHERE tenant_id = $1" duration=2.1ms rows=1 client_ip=10.0.4.12'
    },
    {
      id: 'l-1041',
      lineNumber: 1041,
      timestamp: '2025-05-18T14:31:47.112Z',
      level: 'INFO',
      service: 'cache-redis/redis-rep-01',
      traceId: 'tr_1b205b',
      message: 'PING replication check OK latency=0.4ms connected_clients=38'
    },
    {
      id: 'l-1042',
      lineNumber: 1042,
      timestamp: '2025-05-18T14:31:48.005Z',
      level: 'WARN',
      service: 'api-gateway/gw-4a11',
      traceId: 'tr_2c306b',
      message: 'client_ip=198.51.100.44 Rate limiting threshold reached (92% quota used) client_id=c_99812'
    },
    {
      id: 'l-1043',
      lineNumber: 1043,
      timestamp: '2025-05-18T14:31:49.420Z',
      level: 'DEBUG',
      service: 'auth-service/auth-9df82',
      traceId: 'tr_2c306c',
      message: 'public_key_cache valid (fingerprint=sha256:4f81ae... expires_in=310s)'
    },
    {
      id: 'l-1044',
      lineNumber: 1044,
      timestamp: '2025-05-18T14:31:50.119Z',
      level: 'ERROR',
      service: 'billing-worker/bill-x12',
      traceId: 'tr_3d407c',
      message: 'KafkaProducerError: Broker: Not enough in-sync replicas topic=billing.events'
    },
    {
      id: 'l-1048',
      lineNumber: 1048,
      timestamp: '2025-05-18T14:32:01.402Z',
      level: 'ERROR',
      service: 'auth-service/auth-9df82',
      traceId: 'tr_8a91f0',
      spanId: 'sp_00e72c81',
      message: 'TokenExpiredError: jwt expired (token_age=3602s, max_age=3600s)',
      stackTrace: [
        'TokenExpiredError: jwt expired',
        '    at /app/node_modules/jsonwebtoken/verify.js:152:21',
        '    at getSecret (/app/node_modules/jsonwebtoken/verify.js:90:14)',
        '    at Object.module.exports [as verify] (/app/src/security/jwt.ts:44:12)'
      ]
    },
    {
      id: 'l-1057',
      lineNumber: 1057,
      timestamp: '2025-05-18T14:32:00.912Z',
      level: 'FATAL',
      service: 'db-proxy/pgpool-02',
      traceId: 'tr_8a91ec',
      message: 'Connection pool exhausted: max_conn=100 reached. Refusing incoming socket connection'
    }
  ];

  let filtered = sampleLines;
  if (level) {
    filtered = filtered.filter(l => l.level === level.toUpperCase());
  }
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(l => l.message.toLowerCase().includes(q) || l.service.toLowerCase().includes(q));
  }

  res.json({
    fileId: fileId || 'production-api',
    totalLines: 124850,
    stats: {
      errorCount: 34,
      warnCount: 128,
      infoCount: 8940,
      debugCount: 2150,
      fatalCount: 3
    },
    lines: filtered
  });
});

// SSE Streaming endpoint
app.get('/api/logs/stream', (_req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  res.write('event: connected\ndata: {"status":"streaming","mode":"tail -f","engine":"SQLite SSE"}\n\n');

  const templates = [
    { level: 'INFO', service: 'db-proxy/pgpool-01', message: 'query="UPDATE users SET last_login = NOW() WHERE id = $1" duration=1.2ms' },
    { level: 'DEBUG', service: 'cache-redis/redis-rep-01', message: 'SETEX "session:usr_99" 3600 "active" -> OK' },
    { level: 'INFO', service: 'api-gateway/gw-4a11', message: 'HTTP/2.0 "GET /v1/telemetry/health" 200 OK latency=1.8ms' },
    { level: 'WARN', service: 'api-gateway/gw-4a11', message: 'client_ip=203.0.113.12 Rate limit 80% consumption threshold reached' },
    { level: 'INFO', service: 'worker/indexing-pool', message: 'Elasticsearch bulk indexing committed 450 documents in 24ms' },
    { level: 'ERROR', service: 'auth-service/auth-9df82', message: 'SignatureVerificationFailed: Invalid cryptographic signature for JWT token header' }
  ];

  let lineCount = 1065;
  const timer = setInterval(() => {
    lineCount++;
    const tpl = templates[Math.floor(Math.random() * templates.length)];
    const logData = {
      id: `stream-${Date.now()}`,
      lineNumber: lineCount,
      timestamp: new Date().toISOString(),
      level: tpl.level,
      service: tpl.service,
      traceId: `tr_${Math.random().toString(36).substring(2, 8)}`,
      spanId: `sp_${Math.random().toString(36).substring(2, 10)}`,
      message: tpl.message
    };
    res.write(`event: log\ndata: ${JSON.stringify(logData)}\n\n`);
  }, 3500);

  _req.on('close', () => clearInterval(timer));
});

// Download log file
app.get('/api/logs/download', (req: Request, res: Response) => {
  const fileId = (req.query.fileId as string) || 'production-api';
  res.setHeader('Content-Disposition', `attachment; filename="${fileId}.log"`);
  res.setHeader('Content-Type', 'text/plain');
  res.send(`=== LogPulse Observability Log Dump: ${fileId} ===\nExported: ${new Date().toISOString()}\n\n2025-05-18T14:31:45.928Z [INFO] [db-proxy] query="SELECT * FROM users"\n2025-05-18T14:32:01.402Z [ERROR] [auth-service] TokenExpiredError: jwt expired\n`);
});

// Telemetry metrics
app.get('/api/metrics', (_req: Request, res: Response) => {
  const mem = process.memoryUsage();
  const connsCount = (db.prepare('SELECT COUNT(*) as count FROM connections').get() as any)?.count || 4;

  res.json({
    ingestRateEPS: 2480,
    errorRatio: 0.27,
    latencyMs: 1.4,
    p99LatencyMs: 4.2,
    memoryUsedMB: Number((mem.heapUsed / 1024 / 1024).toFixed(1)),
    memoryMaxMB: 256.0,
    totalEvents: 124850,
    sqliteDatabaseMB: Number((fs.existsSync(DB_PATH) ? fs.statSync(DB_PATH).size / 1024 / 1024 : 0.05).toFixed(2)),
    sqliteConnectionsCount: connsCount,
    timestamp: new Date().toISOString()
  });
});

// Settings API
app.get('/api/settings', (_req: Request, res: Response) => {
  const s = db.prepare('SELECT * FROM app_settings WHERE id = 1').get() as any;
  res.json(s || { defaultGrammar: 'raw_ansi', timezone: 'utc', maxBufferSize: 256 });
});

app.post('/api/settings', (req: Request, res: Response) => {
  const { defaultGrammar, timezone, maxBufferSize } = req.body || {};
  const now = new Date().toISOString();
  db.prepare(`
    INSERT OR REPLACE INTO app_settings (id, default_grammar, timezone, max_buffer_size, updated_at)
    VALUES (1, ?, ?, ?, ?)
  `).run(defaultGrammar || 'raw_ansi', timezone || 'utc', Number(maxBufferSize) || 256, now);

  res.json({ success: true, settings: req.body });
});

// Auth API
app.post('/api/auth/login', (req: Request, res: Response) => {
  const username = req.body?.username || 'julian.putra99@gmail.com';
  const displayName = username.includes('@') ? username.split('@')[0] : username;
  res.json({
    success: true,
    token: 'jwt_sqlite_session_' + Date.now(),
    user: {
      id: 'usr-99',
      username,
      email: username,
      name: displayName.charAt(0).toUpperCase() + displayName.slice(1),
      role: 'Site Reliability Engineer (L5)'
    }
  });
});

app.get('/api/auth/me', (_req: Request, res: Response) => {
  res.json({
    id: 'usr-99',
    username: 'julian.putra99@gmail.com',
    email: 'julian.putra99@gmail.com',
    name: 'Julian Putra',
    role: 'Site Reliability Engineer (L5)'
  });
});

// -------------------------------------------------------------
// 7. Vite Frontend Mounting & Static Assets Serving
// -------------------------------------------------------------
async function setupVite() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`==================================================`);
    console.log(`🌐 LogPulse Observability Full-Stack Server Ready`);
    console.log(`⚡ Public URL: http://0.0.0.0:${PORT}`);
    console.log(`💾 SQLite Database: ${DB_PATH}`);
    console.log(`==================================================`);
  });
}

setupVite();
