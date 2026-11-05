package app

import (
	"crypto/subtle"
	"fmt"
	"net/http"
	"os"
	"runtime"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
)

var latencyBuckets = []float64{0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5}
var processStartedAt = time.Now()

type requestMetricKey struct {
	method string
	route  string
	status int
}

type requestMetricValue struct {
	count   uint64
	sum     float64
	buckets []uint64
}

type requestMetrics struct {
	mu     sync.Mutex
	values map[requestMetricKey]*requestMetricValue
}

func newRequestMetrics() *requestMetrics {
	return &requestMetrics{values: make(map[requestMetricKey]*requestMetricValue)}
}

func (m *requestMetrics) observe(method, route string, status int, elapsed time.Duration) {
	key := requestMetricKey{method: method, route: route, status: status}
	m.mu.Lock()
	defer m.mu.Unlock()
	value := m.values[key]
	if value == nil {
		value = &requestMetricValue{buckets: make([]uint64, len(latencyBuckets))}
		m.values[key] = value
	}
	seconds := elapsed.Seconds()
	value.count++
	value.sum += seconds
	for i, bound := range latencyBuckets {
		if seconds <= bound {
			value.buckets[i]++
		}
	}
}

type statusRecorder struct {
	http.ResponseWriter
	status      int
	wroteHeader bool
}

func (w *statusRecorder) WriteHeader(status int) {
	if w.wroteHeader {
		return
	}
	w.wroteHeader = true
	w.status = status
	w.ResponseWriter.WriteHeader(status)
}

func (w *statusRecorder) Write(body []byte) (int, error) {
	if !w.wroteHeader {
		w.WriteHeader(http.StatusOK)
	}
	return w.ResponseWriter.Write(body)
}

func (w *statusRecorder) Flush() {
	if flusher, ok := w.ResponseWriter.(http.Flusher); ok {
		flusher.Flush()
	}
}

func (w *statusRecorder) Unwrap() http.ResponseWriter { return w.ResponseWriter }

func metricRoute(path string) string {
	switch {
	case path == "/health" || path == "/api/health":
		return "/health"
	case strings.HasPrefix(path, "/api/auth/"):
		return "/api/auth"
	case strings.HasPrefix(path, "/api/connections") || strings.HasPrefix(path, "/api/ssh/"):
		return "/api/connections"
	case strings.HasPrefix(path, "/api/files/"):
		return "/api/files"
	case strings.HasPrefix(path, "/api/logs/") || path == "/api/logs":
		return "/api/logs"
	case strings.HasPrefix(path, "/api/settings"):
		return "/api/settings"
	case strings.HasPrefix(path, "/api/users"):
		return "/api/users"
	default:
		return "/other"
	}
}

func (a *App) prometheusMetrics(w http.ResponseWriter, r *http.Request) {
	tokenPath := os.Getenv("PROMETHEUS_METRICS_TOKEN_FILE")
	tokenBytes, err := os.ReadFile(tokenPath)
	token := strings.TrimSpace(string(tokenBytes))
	provided := strings.TrimSpace(strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer "))
	if err != nil || token == "" || provided == "" || subtle.ConstantTimeCompare([]byte(token), []byte(provided)) != 1 {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	w.Header().Set("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
	var mem runtime.MemStats
	runtime.ReadMemStats(&mem)
	dbStats := a.db.Stats()
	fmt.Fprintln(w, "# HELP logpulse_process_uptime_seconds Time since the Go API started.")
	fmt.Fprintln(w, "# TYPE logpulse_process_uptime_seconds gauge")
	fmt.Fprintf(w, "logpulse_process_uptime_seconds %.3f\n", time.Since(processStartedAt).Seconds())
	fmt.Fprintln(w, "# HELP logpulse_process_goroutines Number of currently active goroutines.")
	fmt.Fprintln(w, "# TYPE logpulse_process_goroutines gauge")
	fmt.Fprintf(w, "logpulse_process_goroutines %d\n", runtime.NumGoroutine())
	fmt.Fprintln(w, "# HELP logpulse_process_heap_alloc_bytes Bytes allocated on the Go heap and still in use.")
	fmt.Fprintln(w, "# TYPE logpulse_process_heap_alloc_bytes gauge")
	fmt.Fprintf(w, "logpulse_process_heap_alloc_bytes %d\n", mem.HeapAlloc)
	fmt.Fprintln(w, "# HELP logpulse_process_heap_sys_bytes Bytes obtained from the operating system for the Go heap.")
	fmt.Fprintln(w, "# TYPE logpulse_process_heap_sys_bytes gauge")
	fmt.Fprintf(w, "logpulse_process_heap_sys_bytes %d\n", mem.HeapSys)
	fmt.Fprintln(w, "# HELP logpulse_sqlite_open_connections Number of open SQLite connections in database/sql.")
	fmt.Fprintln(w, "# TYPE logpulse_sqlite_open_connections gauge")
	fmt.Fprintf(w, "logpulse_sqlite_open_connections %d\n", dbStats.OpenConnections)
	fmt.Fprintln(w, "# HELP logpulse_sqlite_in_use_connections Number of SQLite connections currently in use.")
	fmt.Fprintln(w, "# TYPE logpulse_sqlite_in_use_connections gauge")
	fmt.Fprintf(w, "logpulse_sqlite_in_use_connections %d\n", dbStats.InUse)

	type metricSnapshot struct {
		key   requestMetricKey
		value requestMetricValue
	}
	a.requestMetrics.mu.Lock()
	snapshots := make([]metricSnapshot, 0, len(a.requestMetrics.values))
	for key, value := range a.requestMetrics.values {
		snapshots = append(snapshots, metricSnapshot{key: key, value: requestMetricValue{
			count: value.count, sum: value.sum, buckets: append([]uint64(nil), value.buckets...),
		}})
	}
	a.requestMetrics.mu.Unlock()
	sort.Slice(snapshots, func(i, j int) bool {
		if snapshots[i].key.route != snapshots[j].key.route {
			return snapshots[i].key.route < snapshots[j].key.route
		}
		if snapshots[i].key.method != snapshots[j].key.method {
			return snapshots[i].key.method < snapshots[j].key.method
		}
		return snapshots[i].key.status < snapshots[j].key.status
	})
	fmt.Fprintln(w, "# HELP logpulse_http_requests_total Completed HTTP requests, excluding metrics and long-lived log streams.")
	fmt.Fprintln(w, "# TYPE logpulse_http_requests_total counter")
	fmt.Fprintln(w, "# HELP logpulse_http_request_duration_seconds HTTP request duration in seconds.")
	fmt.Fprintln(w, "# TYPE logpulse_http_request_duration_seconds histogram")
	for _, snapshot := range snapshots {
		key, value := snapshot.key, snapshot.value
		labels := fmt.Sprintf("method=\"%s\",route=\"%s\",status=\"%d\"", escapeMetricLabel(key.method), escapeMetricLabel(key.route), key.status)
		fmt.Fprintf(w, "logpulse_http_requests_total{%s} %d\n", labels, value.count)
		for i, bound := range latencyBuckets {
			fmt.Fprintf(w, "logpulse_http_request_duration_seconds_bucket{%s,le=\"%s\"} %d\n", labels, strconv.FormatFloat(bound, 'f', -1, 64), value.buckets[i])
		}
		fmt.Fprintf(w, "logpulse_http_request_duration_seconds_bucket{%s,le=\"+Inf\"} %d\n", labels, value.count)
		fmt.Fprintf(w, "logpulse_http_request_duration_seconds_sum{%s} %.9f\n", labels, value.sum)
		fmt.Fprintf(w, "logpulse_http_request_duration_seconds_count{%s} %d\n", labels, value.count)
	}
}

func escapeMetricLabel(value string) string {
	value = strings.ReplaceAll(value, `\`, `\\`)
	value = strings.ReplaceAll(value, "\n", `\n`)
	return strings.ReplaceAll(value, `"`, `\"`)
}
