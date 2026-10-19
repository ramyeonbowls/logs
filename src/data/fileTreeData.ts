import { FileTreeNode, SSHConnection } from '../types/ssh';

export const DEFAULT_SSH_CONNECTIONS: SSHConnection[] = [
  {
    id: 'conn-prod-01',
    name: 'Production Node 01 (US-East)',
    type: 'ssh',
    host: 'prod-k8s-node-01.us-east.internal',
    port: 22,
    username: 'deploy',
    authMethod: 'key',
    privateKeyName: 'id_ed25519_prod_sre',
    remotePath: '/var/log',
    isConnected: true,
    latencyMs: 14,
    cipher: 'chacha20-poly1305@openssh.com',
    fingerprint: 'SHA256:d8Q8kZ...9aB12'
  },
  {
    id: 'conn-local-sys',
    name: 'Host Local System Logs (/var/log)',
    type: 'local_folder',
    localPath: '/var/log',
    recursive: true,
    fileFilter: '*.log',
    isConnected: true,
    latencyMs: 1,
    cipher: 'posix-direct-io',
    fingerprint: 'FS:POSIX:DIRECT_IO'
  },
  {
    id: 'conn-stage-02',
    name: 'Staging Cluster 02',
    type: 'ssh',
    host: 'stage-cluster-02.internal',
    port: 22,
    username: 'ops-user',
    authMethod: 'key',
    privateKeyName: 'id_rsa_stage',
    remotePath: '/var/log/services',
    isConnected: false,
    latencyMs: 42,
    cipher: 'aes256-gcm@openssh.com',
    fingerprint: 'SHA256:m0K2jQ...8vC91'
  },
  {
    id: 'conn-edge-eu',
    name: 'Frankfurt Edge Tunnel',
    type: 'remote_tunnel',
    host: 'gw-fra-edge01.cloud.internal',
    port: 443,
    username: 'sre-admin',
    authMethod: 'token',
    tunnelToken: 'lp_tun_sec_99a81b2c7e0d3f4',
    remotePath: '/var/log/nginx',
    isConnected: false,
    latencyMs: 38,
    cipher: 'tls1.3-chacha20-poly1305',
    fingerprint: 'SHA256:p1L4yT...5zE33'
  }
];

export const INITIAL_FILE_TREE: FileTreeNode[] = [
  {
    id: 'dir-var-log',
    name: '/var/log',
    path: '/var/log',
    type: 'folder',
    isOpen: true,
    children: [
      {
        id: 'dir-services',
        name: 'services',
        path: '/var/log/services',
        type: 'folder',
        isOpen: true,
        children: [
          {
            id: 'file-prod-api',
            name: 'production-api-2025-05-18.log',
            path: '/var/log/services/production-api-2025-05-18.log',
            type: 'file',
            size: '48.2 MB',
            lineCount: 124850,
            fileId: 'production-api'
          },
          {
            id: 'file-app-error',
            name: 'app-error.log',
            path: '/var/log/services/app-error.log',
            type: 'file',
            size: '6.4 MB',
            lineCount: 14200,
            fileId: 'app-error'
          },
          {
            id: 'file-worker',
            name: 'worker.log',
            path: '/var/log/services/worker.log',
            type: 'file',
            size: '18 MB',
            lineCount: 62400,
            fileId: 'worker'
          },
          {
            id: 'file-billing',
            name: 'billing-service.log',
            path: '/var/log/services/billing-service.log',
            type: 'file',
            size: '12.1 MB',
            lineCount: 38100,
            fileId: 'app-error'
          }
        ]
      },
      {
        id: 'dir-nginx',
        name: 'nginx',
        path: '/var/log/nginx',
        type: 'folder',
        isOpen: true,
        children: [
          {
            id: 'file-nginx-access',
            name: 'nginx-access.log',
            path: '/var/log/nginx/nginx-access.log',
            type: 'file',
            size: '120 MB',
            lineCount: 489200,
            fileId: 'nginx-access'
          },
          {
            id: 'file-nginx-error',
            name: 'nginx-error.log',
            path: '/var/log/nginx/nginx-error.log',
            type: 'file',
            size: '2.4 MB',
            lineCount: 8400,
            fileId: 'app-error'
          }
        ]
      },
      {
        id: 'dir-containers',
        name: 'containers',
        path: '/var/log/containers',
        type: 'folder',
        isOpen: false,
        children: [
          {
            id: 'file-pod-auth',
            name: 'auth-service-7f4b89-pod.log',
            path: '/var/log/containers/auth-service-7f4b89-pod.log',
            type: 'file',
            size: '8.1 MB',
            lineCount: 29500,
            fileId: 'production-api'
          },
          {
            id: 'file-pod-redis',
            name: 'redis-replica-01.log',
            path: '/var/log/containers/redis-replica-01.log',
            type: 'file',
            size: '3.2 MB',
            lineCount: 11200,
            fileId: 'production-api'
          },
          {
            id: 'file-pod-pgpool',
            name: 'pgpool-cluster.log',
            path: '/var/log/containers/pgpool-cluster.log',
            type: 'file',
            size: '15.4 MB',
            lineCount: 51200,
            fileId: 'production-api'
          }
        ]
      },
      {
        id: 'dir-systemd',
        name: 'systemd',
        path: '/var/log/systemd',
        type: 'folder',
        isOpen: false,
        children: [
          {
            id: 'file-syslog',
            name: 'syslog',
            path: '/var/log/systemd/syslog',
            type: 'file',
            size: '14.2 MB',
            lineCount: 48100,
            fileId: 'production-api'
          },
          {
            id: 'file-journald',
            name: 'journald.log',
            path: '/var/log/systemd/journald.log',
            type: 'file',
            size: '38 MB',
            lineCount: 98000,
            fileId: 'production-api'
          }
        ]
      }
    ]
  },
  {
    id: 'dir-opt-production',
    name: '/opt/production/logs',
    path: '/opt/production/logs',
    type: 'folder',
    isOpen: false,
    children: [
      {
        id: 'file-audit',
        name: 'audit-trail.log',
        path: '/opt/production/logs/audit-trail.log',
        type: 'file',
        size: '5.9 MB',
        lineCount: 19800,
        fileId: 'production-api'
      },
      {
        id: 'file-clickhouse',
        name: 'clickhouse-buffer.log',
        path: '/opt/production/logs/clickhouse-buffer.log',
        type: 'file',
        size: '24.0 MB',
        lineCount: 88100,
        fileId: 'worker'
      }
    ]
  }
];
