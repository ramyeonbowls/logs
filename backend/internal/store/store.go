package store

import (
	"fmt"
	"math/rand"
	"sync"
	"time"

	"logpulse-backend/internal/models"
)

type Store struct {
	mu             sync.RWMutex
	Files          map[string]*models.LogFile
	Connections    []models.SSHConnection
	ActiveConnID   string
	FileTree       []*models.FileTreeNode
	Settings       models.Settings
	StreamSubscribers map[chan models.LogLine]bool
	subMu          sync.Mutex
}

var GlobalStore *Store

func init() {
	GlobalStore = NewStore()
}

func NewStore() *Store {
	return &Store{
		Files:             make(map[string]*models.LogFile),
		StreamSubscribers: make(map[chan models.LogLine]bool),
		Settings: models.Settings{
			DefaultGrammar: "raw_ansi",
			Timezone:       "utc",
			MaxBufferSize:  256,
		},
	}
}

func newDemoStore() *Store {
	s := &Store{
		Files:             make(map[string]*models.LogFile),
		StreamSubscribers: make(map[chan models.LogLine]bool),
		ActiveConnID:      "conn-prod-01",
		Settings: models.Settings{
			DefaultGrammar: "raw_ansi",
			Timezone:       "utc",
			MaxBufferSize:  256,
		},
	}

	// 1. Initial SSH Connections
	s.Connections = []models.SSHConnection{
		{
			ID:             "conn-prod-01",
			Name:           "Production Node 01 (US-East)",
			Host:           "prod-k8s-node-01.us-east.internal",
			Port:           22,
			Username:       "deploy",
			AuthMethod:     "key",
			PrivateKeyName: "id_ed25519_prod_sre",
			RemotePath:     "/var/log",
			IsConnected:    true,
			LatencyMs:      14,
			Cipher:         "chacha20-poly1305@openssh.com",
			Fingerprint:    "SHA256:d8Q8kZ...9aB12",
		},
		{
			ID:             "conn-stage-02",
			Name:           "Staging Cluster 02",
			Host:           "stage-cluster-02.internal",
			Port:           22,
			Username:       "ops-user",
			AuthMethod:     "key",
			PrivateKeyName: "id_rsa_stage",
			RemotePath:     "/var/log/services",
			IsConnected:    false,
			LatencyMs:      42,
			Cipher:         "aes256-gcm@openssh.com",
			Fingerprint:    "SHA256:m0K2jQ...8vC91",
		},
		{
			ID:          "conn-edge-eu",
			Name:        "Frankfurt Edge Ingress",
			Host:        "gw-fra-edge01.cloud.internal",
			Port:        2222,
			Username:    "sre-admin",
			AuthMethod:  "password",
			RemotePath:  "/var/log/nginx",
			IsConnected: false,
			LatencyMs:   78,
			Cipher:      "aes128-ctr",
			Fingerprint: "SHA256:p1L4yT...5zE33",
		},
	}

	// 2. Initial Sample Log Files
	prodFile := &models.LogFile{
		ID:         "production-api",
		Path:       "/var/log/services/production-api-2025-05-18.log",
		Filename:   "production-api-2025-05-18.log",
		Size:       "48.2 MB",
		LineCount:  124850,
		Encoding:   "UTF-8",
		LineEnding: "LF (Unix)",
		Stats: models.LogStats{
			ErrorCount: 34,
			WarnCount:  128,
			InfoCount:  8940,
			DebugCount: 2150,
			FatalCount: 3,
		},
		UpdatedAt: time.Now(),
		Lines: []models.LogLine{
			{
				ID:         "l-1040",
				LineNumber: 1040,
				Timestamp:  "2025-05-18T14:31:45.928Z",
				Level:      "INFO",
				Service:    "db-proxy/pgpool-01",
				TraceID:    "tr_1b205a",
				Message:    "query=\"SELECT * FROM users WHERE tenant_id = $1\" duration=2.1ms rows=1 client_ip=10.0.4.12",
			},
			{
				ID:         "l-1041",
				LineNumber: 1041,
				Timestamp:  "2025-05-18T14:31:47.112Z",
				Level:      "INFO",
				Service:    "cache-redis/redis-rep-01",
				TraceID:    "tr_1b205b",
				Message:    "PING replication check OK latency=0.4ms connected_clients=38",
			},
			{
				ID:         "l-1042",
				LineNumber: 1042,
				Timestamp:  "2025-05-18T14:31:48.005Z",
				Level:      "WARN",
				Service:    "api-gateway/gw-4a11",
				TraceID:    "tr_2c306b",
				Message:    "client_ip=198.51.100.44 Rate limiting threshold reached (92% quota used) client_id=c_99812",
			},
			{
				ID:         "l-1043",
				LineNumber: 1043,
				Timestamp:  "2025-05-18T14:31:49.420Z",
				Level:      "DEBUG",
				Service:    "auth-service/auth-9df82",
				TraceID:    "tr_2c306c",
				Message:    "public_key_cache valid (fingerprint=sha256:4f81ae... expires_in=310s)",
			},
			{
				ID:         "l-1044",
				LineNumber: 1044,
				Timestamp:  "2025-05-18T14:31:50.119Z",
				Level:      "ERROR",
				Service:    "billing-worker/bill-x12",
				TraceID:    "tr_3d407c",
				Message:    "KafkaProducerError: Broker: Not enough in-sync replicas topic=billing.events",
			},
			{
				ID:         "l-1045",
				LineNumber: 1045,
				Timestamp:  "2025-05-18T14:31:52.339Z",
				Level:      "INFO",
				Service:    "auth-service/auth-9df82",
				TraceID:    "tr_4e508d",
				Message:    "OIDC Session token refreshed for sub=usr_8921da issuer=https://auth.internal",
			},
			{
				ID:         "l-1046",
				LineNumber: 1046,
				Timestamp:  "2025-05-18T14:31:54.801Z",
				Level:      "DEBUG",
				Service:    "cache-redis/redis-rep-01",
				TraceID:    "tr_4e508e",
				Message:    "Cache hit key: \"session:usr_8921da\" ttl_remaining=1782s node=redis-c1",
			},
			{
				ID:         "l-1047",
				LineNumber: 1047,
				Timestamp:  "2025-05-18T14:31:55.019Z",
				Level:      "INFO",
				Service:    "api-gateway/gw-4a11",
				TraceID:    "tr_5d609f",
				Message:    "HTTP/2.0 \"GET /v1/users/me\" 200 OK latency=14.2ms bytes_sent=1402 client=10.0.2.14",
			},
			{
				ID:         "l-1048",
				LineNumber: 1048,
				Timestamp:  "2025-05-18T14:32:01.402Z",
				Level:      "ERROR",
				Service:    "auth-service/auth-9df82",
				TraceID:    "tr_8a91f0",
				SpanID:     "sp_00e72c81",
				Message:    "TokenExpiredError: jwt expired (token_age=3602s, max_age=3600s)",
				StackTrace: []string{
					"TokenExpiredError: jwt expired",
					"    at /app/node_modules/jsonwebtoken/verify.js:152:21",
					"    at getSecret (/app/node_modules/jsonwebtoken/verify.js:90:14)",
					"    at Object.module.exports [as verify] (/app/src/security/jwt.ts:44:12)",
					"    at AuthGuard.validateToken (/app/src/guards/auth.ts:28:30)",
					"    at async FastifyInstance.handleRoute (/app/node_modules/fastify/lib/route.js:410:9)",
					"    at processTicksAndRejections (node:internal/process/task_queues:95:5)",
				},
			},
			{
				ID:         "l-1056",
				LineNumber: 1056,
				Timestamp:  "2025-05-18T14:32:01.408Z",
				Level:      "WARN",
				Service:    "api-gateway/gw-4a11",
				TraceID:    "tr_8a91f0",
				Message:    "HTTP/2.0 \"POST /v1/auth/verify\" 401 Unauthorized latency=6.1ms client_ip=198.51.100.44",
			},
			{
				ID:         "l-1057",
				LineNumber: 1057,
				Timestamp:  "2025-05-18T14:32:00.912Z",
				Level:      "FATAL",
				Service:    "db-proxy/pgpool-02",
				TraceID:    "tr_8a91ec",
				Message:    "Connection pool exhausted: max_conn=100 reached. Refusing incoming socket connection",
			},
			{
				ID:         "l-1058",
				LineNumber: 1058,
				Timestamp:  "2025-05-18T14:32:02.100Z",
				Level:      "INFO",
				Service:    "billing-worker/bill-x12",
				TraceID:    "tr_6c710a",
				Message:    "Stripe webhook event processed: evt_3N4x78 amount=4999 currency=usd invoice=in_8820",
			},
			{
				ID:         "l-1059",
				LineNumber: 1059,
				Timestamp:  "2025-05-18T14:32:02.890Z",
				Level:      "WARN",
				Service:    "api-gateway/gw-4a11",
				TraceID:    "tr_7b82ab",
				Message:    "Upstream timeout after 2500ms on route /v1/checkout/charge. Retrying (attempt 1/3)",
			},
			{
				ID:         "l-1060",
				LineNumber: 1060,
				Timestamp:  "2025-05-18T14:32:03.114Z",
				Level:      "INFO",
				Service:    "audit-trail/audit-01",
				TraceID:    "tr_9b0201",
				Message:    "Security audit written: event=SESSION_EXPIRED ip=172.56.21.90 user_id=usr_8921da",
			},
			{
				ID:         "l-1061",
				LineNumber: 1061,
				Timestamp:  "2025-05-18T14:32:03.450Z",
				Level:      "DEBUG",
				Service:    "cache-redis/redis-rep-01",
				TraceID:    "tr_9b0202",
				Message:    "Eviction run complete: 0 keys evicted, memory_used=1.42GB",
			},
			{
				ID:         "l-1062",
				LineNumber: 1062,
				Timestamp:  "2025-05-18T14:32:04.011Z",
				Level:      "INFO",
				Service:    "metrics-exporter/prom-01",
				Message:    "Scraped 2,410 timeseries in 8.4ms (remote_write=ok)",
			},
			{
				ID:         "l-1063",
				LineNumber: 1063,
				Timestamp:  "2025-05-18T14:32:04.981Z",
				Level:      "INFO",
				Service:    "api-gateway/gw-4a11",
				TraceID:    "tr_9b0205",
				Message:    "HTTP/2.0 \"GET /healthz\" 200 OK latency=0.3ms host=api.internal",
			},
			{
				ID:         "l-1064",
				LineNumber: 1064,
				Timestamp:  "2025-05-18T14:32:05.110Z",
				Level:      "INFO",
				Service:    "systemd/journald",
				Message:    "logrotate.service: Deactivated successfully.",
			},
			{
				ID:         "l-1065",
				LineNumber: 1065,
				Timestamp:  "2025-05-18T14:32:05.402Z",
				Level:      "INFO",
				Service:    "db-proxy/pgpool-01",
				TraceID:    "tr_9b0210",
				Message:    "Pool stats: active=42, idle=58, max=100, wait_time_p99=1.1ms connections_recycled=142",
			},
		},
	}
	s.Files["production-api"] = prodFile

	// 3. Initial File Tree
	s.FileTree = []*models.FileTreeNode{
		{
			ID:     "dir-var-log",
			Name:   "/var/log",
			Path:   "/var/log",
			Type:   "folder",
			IsOpen: true,
			Children: []*models.FileTreeNode{
				{
					ID:     "dir-services",
					Name:   "services",
					Path:   "/var/log/services",
					Type:   "folder",
					IsOpen: true,
					Children: []*models.FileTreeNode{
						{
							ID:        "file-prod-api",
							Name:      "production-api-2025-05-18.log",
							Path:      "/var/log/services/production-api-2025-05-18.log",
							Type:      "file",
							Size:      "48.2 MB",
							LineCount: 124850,
							FileID:    "production-api",
						},
						{
							ID:        "file-app-error",
							Name:      "app-error.log",
							Path:      "/var/log/services/app-error.log",
							Type:      "file",
							Size:      "6.4 MB",
							LineCount: 14200,
							FileID:    "app-error",
						},
						{
							ID:        "file-worker",
							Name:      "worker.log",
							Path:      "/var/log/services/worker.log",
							Type:      "file",
							Size:      "18 MB",
							LineCount: 62400,
							FileID:    "worker",
						},
					},
				},
				{
					ID:     "dir-nginx",
					Name:   "nginx",
					Path:   "/var/log/nginx",
					Type:   "folder",
					IsOpen: true,
					Children: []*models.FileTreeNode{
						{
							ID:        "file-nginx-access",
							Name:      "nginx-access.log",
							Path:      "/var/log/nginx/nginx-access.log",
							Type:      "file",
							Size:      "120 MB",
							LineCount: 489200,
							FileID:    "nginx-access",
						},
					},
				},
			},
		},
	}

	return s
}

// Background goroutine to simulate live microservices tailing (tail -f)
func (s *Store) startBackgroundStreamGenerator() {
	ticker := time.NewTicker(3500 * time.Millisecond)
	defer ticker.Stop()

	sampleTemplates := []struct {
		Level   string
		Service string
		Message string
	}{
		{"INFO", "db-proxy/pgpool-01", "query=\"UPDATE users SET last_login = NOW() WHERE id = $1\" duration=1.2ms"},
		{"DEBUG", "cache-redis/redis-rep-01", "SETEX \"session:usr_99\" 3600 \"active\" -> OK"},
		{"INFO", "api-gateway/gw-4a11", "HTTP/2.0 \"GET /v1/telemetry/health\" 200 OK latency=2.1ms"},
		{"WARN", "api-gateway/gw-4a11", "client_ip=203.0.113.12 Rate limit 80% consumption threshold reached"},
		{"INFO", "worker/indexing-pool", "Elasticsearch bulk indexing committed 450 documents in 24ms"},
		{"ERROR", "auth-service/auth-9df82", "SignatureVerificationFailed: Invalid cryptographic signature for JWT token header alg=RS256"},
	}

	for range ticker.C {
		s.mu.Lock()
		prodFile, exists := s.Files["production-api"]
		if !exists {
			s.mu.Unlock()
			continue
		}

		tpl := sampleTemplates[rand.Intn(len(sampleTemplates))]
		lastLineNumber := 1065
		if len(prodFile.Lines) > 0 {
			lastLineNumber = prodFile.Lines[len(prodFile.Lines)-1].LineNumber
		}
		nextLineNum := lastLineNumber + 1

		newLine := models.LogLine{
			ID:         fmt.Sprintf("stream-%d", time.Now().UnixNano()),
			LineNumber: nextLineNum,
			Timestamp:  time.Now().UTC().Format(time.RFC3339Nano),
			Level:      tpl.Level,
			Service:    tpl.Service,
			TraceID:    fmt.Sprintf("tr_%x", rand.Int31()),
			SpanID:     fmt.Sprintf("sp_%x", rand.Int31()),
			Message:    tpl.Message,
		}

		prodFile.Lines = append(prodFile.Lines, newLine)
		prodFile.LineCount++
		prodFile.UpdatedAt = time.Now()
		if tpl.Level == "ERROR" {
			prodFile.Stats.ErrorCount++
		} else if tpl.Level == "WARN" {
			prodFile.Stats.WarnCount++
		} else if tpl.Level == "INFO" {
			prodFile.Stats.InfoCount++
		}

		s.mu.Unlock()

		// Broadcast to active SSE subscribers
		s.subMu.Lock()
		for ch := range s.StreamSubscribers {
			select {
			case ch <- newLine:
			default:
			}
		}
		s.subMu.Unlock()
	}
}

func (s *Store) Subscribe() chan models.LogLine {
	ch := make(chan models.LogLine, 50)
	s.subMu.Lock()
	s.StreamSubscribers[ch] = true
	s.subMu.Unlock()
	return ch
}

func (s *Store) Unsubscribe(ch chan models.LogLine) {
	s.subMu.Lock()
	delete(s.StreamSubscribers, ch)
	close(ch)
	s.subMu.Unlock()
}
