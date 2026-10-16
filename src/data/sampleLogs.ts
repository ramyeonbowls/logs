import { LogFile, LogLine, LogLevel } from '../types/log';

export const INITIAL_PRODUCTION_LINES: LogLine[] = [
  {
    id: 'l-1035',
    lineNumber: 1035,
    timestamp: '2025-05-18T14:31:39.102Z',
    level: 'INFO',
    service: 'systemd/journald',
    message: 'Starting Daily apt download activities...',
    attributes: { unit: 'apt-daily.service' }
  },
  {
    id: 'l-1036',
    lineNumber: 1036,
    timestamp: '2025-05-18T14:31:40.450Z',
    level: 'DEBUG',
    service: 'db-proxy/pgpool-01',
    traceId: 'tr_1a890f',
    message: 'Health probe ping succeeded in 0.8ms against backend node primary-db-01:5432',
    attributes: { target: 'primary-db-01:5432', latency: '0.8ms' }
  },
  {
    id: 'l-1037',
    lineNumber: 1037,
    timestamp: '2025-05-18T14:31:42.015Z',
    level: 'INFO',
    service: 'api-gateway/gw-4a11',
    traceId: 'tr_1b001c',
    message: 'HTTP/2.0 "GET /v1/products?limit=20&category=telemetry" 200 OK latency=11.4ms bytes_sent=4820',
    attributes: { status: 200, route: '/v1/products', latency: '11.4ms' }
  },
  {
    id: 'l-1038',
    lineNumber: 1038,
    timestamp: '2025-05-18T14:31:43.782Z',
    level: 'INFO',
    service: 'worker-cluster/celery-04',
    traceId: 'tr_1b104d',
    message: 'Task tasks.sync_analytics_aggregates[b8f2194] succeeded in 1.204s',
    attributes: { task_id: 'b8f2194', status: 'SUCCESS' }
  },
  {
    id: 'l-1039',
    lineNumber: 1039,
    timestamp: '2025-05-18T14:31:44.290Z',
    level: 'DEBUG',
    service: 'auth-service/auth-9df82',
    traceId: 'tr_1b199a',
    message: 'Validating public JWKS endpoint cache freshness: next_refresh_in=58s',
    attributes: { endpoint: 'https://auth.internal/.well-known/jwks.json' }
  },
  {
    id: 'l-1040',
    lineNumber: 1040,
    timestamp: '2025-05-18T14:31:45.928Z',
    level: 'INFO',
    service: 'db-proxy/pgpool-01',
    traceId: 'tr_1b205a',
    message: 'query="SELECT * FROM users WHERE tenant_id = $1" duration=2.1ms rows=1 client_ip=10.0.4.12',
    attributes: { query: 'SELECT * FROM users WHERE tenant_id = $1', duration: '2.1ms', rows: 1 }
  },
  {
    id: 'l-1041',
    lineNumber: 1041,
    timestamp: '2025-05-18T14:31:47.112Z',
    level: 'INFO',
    service: 'cache-redis/redis-rep-01',
    traceId: 'tr_1b205b',
    message: 'PING replication check OK latency=0.4ms connected_clients=38',
    attributes: { latency: '0.4ms', connected_clients: 38 }
  },
  {
    id: 'l-1042',
    lineNumber: 1042,
    timestamp: '2025-05-18T14:31:48.005Z',
    level: 'WARN',
    service: 'api-gateway/gw-4a11',
    traceId: 'tr_2c306b',
    message: 'client_ip=198.51.100.44 Rate limiting threshold reached (92% quota used) client_id=c_99812',
    attributes: { client_ip: '198.51.100.44', quota: '92%' }
  },
  {
    id: 'l-1043',
    lineNumber: 1043,
    timestamp: '2025-05-18T14:31:49.420Z',
    level: 'DEBUG',
    service: 'auth-service/auth-9df82',
    traceId: 'tr_2c306c',
    message: 'public_key_cache valid (fingerprint=sha256:4f81ae... expires_in=310s)',
    attributes: { fingerprint: 'sha256:4f81ae...', expires_in: '310s' }
  },
  {
    id: 'l-1044',
    lineNumber: 1044,
    timestamp: '2025-05-18T14:31:50.119Z',
    level: 'ERROR',
    service: 'billing-worker/bill-x12',
    traceId: 'tr_3d407c',
    message: 'KafkaProducerError: Broker: Not enough in-sync replicas topic=billing.events',
    attributes: { topic: 'billing.events', error: 'KafkaProducerError' }
  },
  {
    id: 'l-1045',
    lineNumber: 1045,
    timestamp: '2025-05-18T14:31:52.339Z',
    level: 'INFO',
    service: 'auth-service/auth-9df82',
    traceId: 'tr_4e508d',
    message: 'OIDC Session token refreshed for sub=usr_8921da issuer=https://auth.internal',
    attributes: { sub: 'usr_8921da', issuer: 'https://auth.internal' }
  },
  {
    id: 'l-1046',
    lineNumber: 1046,
    timestamp: '2025-05-18T14:31:54.801Z',
    level: 'DEBUG',
    service: 'cache-redis/redis-rep-01',
    traceId: 'tr_4e508e',
    message: 'Cache hit key: "session:usr_8921da" ttl_remaining=1782s node=redis-c1',
    attributes: { key: 'session:usr_8921da', ttl_remaining: '1782s' }
  },
  {
    id: 'l-1047',
    lineNumber: 1047,
    timestamp: '2025-05-18T14:31:55.019Z',
    level: 'INFO',
    service: 'api-gateway/gw-4a11',
    traceId: 'tr_5d609f',
    message: 'HTTP/2.0 "GET /v1/users/me" 200 OK latency=14.2ms bytes_sent=1402 client=10.0.2.14',
    attributes: { status: 200, latency: '14.2ms', bytes_sent: 1402 }
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
    attributes: { token_age: '3602s', max_age: '3600s', error: 'TokenExpiredError' },
    stackTrace: [
      'TokenExpiredError: jwt expired',
      '    at /app/node_modules/jsonwebtoken/verify.js:152:21',
      '    at getSecret (/app/node_modules/jsonwebtoken/verify.js:90:14)',
      '    at Object.module.exports [as verify] (/app/src/security/jwt.ts:44:12)',
      '    at AuthGuard.validateToken (/app/src/guards/auth.ts:28:30)',
      '    at async FastifyInstance.handleRoute (/app/node_modules/fastify/lib/route.js:410:9)',
      '    at processTicksAndRejections (node:internal/process/task_queues:95:5)'
    ]
  },
  {
    id: 'l-1056',
    lineNumber: 1056,
    timestamp: '2025-05-18T14:32:01.408Z',
    level: 'WARN',
    service: 'api-gateway/gw-4a11',
    traceId: 'tr_8a91f0',
    message: 'HTTP/2.0 "POST /v1/auth/verify" 401 Unauthorized latency=6.1ms client_ip=198.51.100.44',
    attributes: { status: 401, latency: '6.1ms' }
  },
  {
    id: 'l-1057',
    lineNumber: 1057,
    timestamp: '2025-05-18T14:32:00.912Z',
    level: 'FATAL',
    service: 'db-proxy/pgpool-02',
    traceId: 'tr_8a91ec',
    message: 'Connection pool exhausted: max_conn=100 reached. Refusing incoming socket connection from backend-node-03',
    attributes: { max_conn: 100, active: 100 }
  },
  {
    id: 'l-1058',
    lineNumber: 1058,
    timestamp: '2025-05-18T14:32:02.100Z',
    level: 'INFO',
    service: 'billing-worker/bill-x12',
    traceId: 'tr_6c710a',
    message: 'Stripe webhook event processed: evt_3N4x78 amount=4999 currency=usd invoice=in_8820',
    attributes: { amount: 4999, currency: 'usd', invoice: 'in_8820' }
  },
  {
    id: 'l-1059',
    lineNumber: 1059,
    timestamp: '2025-05-18T14:32:02.890Z',
    level: 'WARN',
    service: 'api-gateway/gw-4a11',
    traceId: 'tr_7b82ab',
    message: 'Upstream timeout after 2500ms on route /v1/checkout/charge. Retrying (attempt 1/3)',
    attributes: { timeout: '2500ms', attempt: '1/3' }
  },
  {
    id: 'l-1060',
    lineNumber: 1060,
    timestamp: '2025-05-18T14:32:03.114Z',
    level: 'INFO',
    service: 'audit-trail/audit-01',
    traceId: 'tr_9b0201',
    message: 'Security audit written: event=SESSION_EXPIRED ip=172.56.21.90 user_id=usr_8921da',
    attributes: { event: 'SESSION_EXPIRED', ip: '172.56.21.90', user_id: 'usr_8921da' }
  },
  {
    id: 'l-1061',
    lineNumber: 1061,
    timestamp: '2025-05-18T14:32:03.450Z',
    level: 'DEBUG',
    service: 'cache-redis/redis-rep-01',
    traceId: 'tr_9b0202',
    message: 'Eviction run complete: 0 keys evicted, memory_used=1.42GB fragmentation_ratio=1.08',
    attributes: { memory_used: '1.42GB', fragmentation_ratio: '1.08' }
  },
  {
    id: 'l-1062',
    lineNumber: 1062,
    timestamp: '2025-05-18T14:32:04.011Z',
    level: 'INFO',
    service: 'metrics-exporter/prom-01',
    message: 'Scraped 2,410 timeseries in 8.4ms (remote_write=ok)',
    attributes: { series: 2410, duration: '8.4ms' }
  },
  {
    id: 'l-1063',
    lineNumber: 1063,
    timestamp: '2025-05-18T14:32:04.981Z',
    level: 'INFO',
    service: 'api-gateway/gw-4a11',
    traceId: 'tr_9b0205',
    message: 'HTTP/2.0 "GET /healthz" 200 OK latency=0.3ms host=api.internal',
    attributes: { status: 200, latency: '0.3ms' }
  },
  {
    id: 'l-1064',
    lineNumber: 1064,
    timestamp: '2025-05-18T14:32:05.110Z',
    level: 'INFO',
    service: 'systemd/journald',
    message: 'logrotate.service: Deactivated successfully.',
    attributes: { service: 'logrotate' }
  },
  {
    id: 'l-1065',
    lineNumber: 1065,
    timestamp: '2025-05-18T14:32:05.402Z',
    level: 'INFO',
    service: 'db-proxy/pgpool-01',
    traceId: 'tr_9b0210',
    message: 'Pool stats: active=42, idle=58, max=100, wait_time_p99=1.1ms connections_recycled=142',
    attributes: { active: 42, idle: 58, max: 100, wait_time_p99: '1.1ms' }
  },
  {
    id: 'l-1066',
    lineNumber: 1066,
    timestamp: '2025-05-18T14:32:06.128Z',
    level: 'DEBUG',
    service: 'telemetry-agent/otel-col',
    message: 'Batch export sent 450 spans to ClickHouse buffer in 14.8ms',
    attributes: { spans: 450, latency: '14.8ms' }
  },
  {
    id: 'l-1067',
    lineNumber: 1067,
    timestamp: '2025-05-18T14:32:07.391Z',
    level: 'INFO',
    service: 'api-gateway/gw-4a11',
    traceId: 'tr_9b0312',
    message: 'HTTP/2.0 "POST /v1/telemetry/events" 202 Accepted latency=8.9ms bytes_in=942 client=10.0.5.88',
    attributes: { status: 202, latency: '8.9ms' }
  }
];

export const SAMPLE_FILES: LogFile[] = [
  {
    id: 'production-api',
    path: '/var/log/services/production-api-2025-05-18.log',
    filename: 'production-api-2025-05-18.log',
    size: '48.2 MB',
    lineCount: 124850,
    encoding: 'UTF-8',
    lineEnding: 'LF (Unix)',
    stats: {
      errorCount: 34,
      warnCount: 128,
      infoCount: 8940,
      debugCount: 2150,
      fatalCount: 3
    },
    lines: INITIAL_PRODUCTION_LINES
  },
  {
    id: 'nginx-access',
    path: '/var/log/nginx/nginx-access.log',
    filename: 'nginx-access.log',
    size: '120MB',
    lineCount: 489200,
    encoding: 'UTF-8',
    lineEnding: 'LF (Unix)',
    stats: {
      errorCount: 19,
      warnCount: 84,
      infoCount: 35120,
      debugCount: 410,
      fatalCount: 0
    },
    lines: [
      {
        id: 'ng-1',
        lineNumber: 1,
        timestamp: '2025-05-18T14:30:01.002Z',
        level: 'INFO',
        service: 'nginx/frontend',
        message: '172.56.21.90 - - [18/May/2025:14:30:01 +0000] "GET /index.html HTTP/2.0" 200 4821 "https://app.logpulse.internal/" "Mozilla/5.0"',
        attributes: { status: 200, ip: '172.56.21.90' }
      },
      {
        id: 'ng-2',
        lineNumber: 2,
        timestamp: '2025-05-18T14:30:02.140Z',
        level: 'WARN',
        service: 'nginx/frontend',
        message: '198.51.100.44 - - [18/May/2025:14:30:02 +0000] "POST /api/v1/auth HTTP/2.0" 429 184 "-" "Go-http-client/2.0" (ratelimited zone=api)',
        attributes: { status: 429, ip: '198.51.100.44' }
      },
      {
        id: 'ng-3',
        lineNumber: 3,
        timestamp: '2025-05-18T14:30:03.451Z',
        level: 'ERROR',
        service: 'nginx/ingress',
        message: '2025/05/18 14:30:03 [error] 481#481: *99120 upstream prematurely closed connection while reading response header from upstream: "http://10.0.3.18:8080/charge"',
        attributes: { status: 502, error: 'upstream prematurely closed connection' }
      }
    ]
  },
  {
    id: 'app-error',
    path: '/var/log/services/app-error.log',
    filename: 'app-error.log',
    size: '6.4MB',
    lineCount: 14200,
    encoding: 'UTF-8',
    lineEnding: 'LF (Unix)',
    stats: {
      errorCount: 88,
      warnCount: 14,
      infoCount: 210,
      debugCount: 0,
      fatalCount: 12
    },
    lines: [
      {
        id: 'ae-1',
        lineNumber: 88,
        timestamp: '2025-05-18T14:28:10.881Z',
        level: 'ERROR',
        service: 'billing-worker/bill-x12',
        traceId: 'tr_err_01',
        message: 'CircuitBreakerOpenException: Downstream payment provider circuit is OPEN after 5 consecutive timeouts',
        attributes: { circuit: 'stripe-gateway', threshold: 5 }
      },
      {
        id: 'ae-2',
        lineNumber: 89,
        timestamp: '2025-05-18T14:28:11.200Z',
        level: 'FATAL',
        service: 'db-proxy/pgpool-02',
        traceId: 'tr_err_02',
        message: 'Deadlock detected while executing concurrent row locks on billing_ledger_entries_partition_202505',
        attributes: { error: 'DeadlockDetected', table: 'billing_ledger_entries' }
      }
    ]
  },
  {
    id: 'worker',
    path: '/var/log/services/worker.log',
    filename: 'worker.log',
    size: '18MB',
    lineCount: 62400,
    encoding: 'UTF-8',
    lineEnding: 'LF (Unix)',
    stats: {
      errorCount: 12,
      warnCount: 31,
      infoCount: 4210,
      debugCount: 1980,
      fatalCount: 1
    },
    lines: [
      {
        id: 'wk-1',
        lineNumber: 410,
        timestamp: '2025-05-18T14:25:01.011Z',
        level: 'INFO',
        service: 'worker/indexing-pool',
        message: 'Elasticsearch bulk indexer committed 1,500 documents in 38ms (cluster_health=green)',
        attributes: { documents: 1500, latency: '38ms' }
      },
      {
        id: 'wk-2',
        lineNumber: 411,
        timestamp: '2025-05-18T14:25:02.502Z',
        level: 'WARN',
        service: 'worker/queue-consumer',
        message: 'RabbitMQ queue "events.high_priority" length exceeded warning threshold: depth=48,190 messages',
        attributes: { queue: 'events.high_priority', depth: 48190 }
      }
    ]
  }
];

export interface MockStreamItem {
  level: LogLevel;
  service: string;
  message: string;
  attributes?: Record<string, string | number | boolean>;
  stackTrace?: string[];
}

export const MOCK_NEW_STREAM_LINES: MockStreamItem[] = [
  {
    level: 'INFO',
    service: 'db-proxy/pgpool-01',
    message: 'query="UPDATE accounts SET last_active = NOW() WHERE id = $1" duration=1.4ms rows=1',
    attributes: { duration: '1.4ms', rows: 1 }
  },
  {
    level: 'DEBUG',
    service: 'cache-redis/redis-rep-01',
    message: 'SETEX "session:usr_auto_91" 1800 "{\"authenticated\":true}" -> OK',
    attributes: { status: 'OK' }
  },
  {
    level: 'INFO',
    service: 'api-gateway/gw-4a11',
    message: 'HTTP/2.0 "GET /v1/system/status" 200 OK latency=4.1ms client=10.0.1.18',
    attributes: { status: 200, latency: '4.1ms' }
  },
  {
    level: 'WARN',
    service: 'api-gateway/gw-4a11',
    message: 'client_ip=203.0.113.19 Burst threshold warning: 75 requests/sec on endpoint /v1/ingest',
    attributes: { rps: 75 }
  },
  {
    level: 'INFO',
    service: 'worker-cluster/celery-02',
    message: 'Dispatched async background task tasks.archive_s3_chunk to worker pool (3 workers active)',
    attributes: { pool_size: 3 }
  },
  {
    level: 'ERROR',
    service: 'auth-service/auth-9df82',
    message: 'SignatureVerificationFailed: Invalid cryptographic signature for JWT token header alg=RS256',
    attributes: { alg: 'RS256', error: 'SignatureVerificationFailed' },
    stackTrace: [
      'JsonWebTokenError: invalid signature',
      '    at /app/node_modules/jsonwebtoken/verify.js:133:19',
      '    at Object.module.exports [as verify] (/app/src/security/jwt.ts:44:12)',
      '    at AuthGuard.validateToken (/app/src/guards/auth.ts:28:30)'
    ]
  }
];
