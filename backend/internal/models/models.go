package models

import "time"

// User represents an authenticated SRE / DevOps operator
type User struct {
	ID       string `json:"id"`
	Username string `json:"username"`
	Email    string `json:"email"`
	Name     string `json:"name"`
	Role     string `json:"role"`
}

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Success bool   `json:"success"`
	Token   string `json:"token"`
	User    User   `json:"user"`
}

// SSHConnection represents an active or configured remote SSH host
type SSHConnection struct {
	ID             string `json:"id"`
	Name           string `json:"name"`
	Host           string `json:"host"`
	Port           int    `json:"port"`
	Username       string `json:"username"`
	AuthMethod     string `json:"authMethod"` // "key" or "password"
	PrivateKeyName string `json:"privateKeyName,omitempty"`
	RemotePath     string `json:"remotePath"`
	IsConnected    bool   `json:"isConnected"`
	LatencyMs      int    `json:"latencyMs"`
	Cipher         string `json:"cipher"`
	Fingerprint    string `json:"fingerprint"`
}

type SSHTestRequest struct {
	Host       string `json:"host"`
	Port       int    `json:"port"`
	Username   string `json:"username"`
	AuthMethod string `json:"authMethod"`
	KeyName    string `json:"keyName,omitempty"`
	Password   string `json:"password,omitempty"`
	RemotePath string `json:"remotePath"`
}

type SSHTestResponse struct {
	Success   bool   `json:"success"`
	LatencyMs int    `json:"latencyMs"`
	Message   string `json:"message"`
	Cipher    string `json:"cipher"`
	HostKey   string `json:"hostKey"`
}

// FileTreeNode represents a node in the remote file tree
type FileTreeNode struct {
	ID        string          `json:"id"`
	Name      string          `json:"name"`
	Path      string          `json:"path"`
	Type      string          `json:"type"` // "folder" or "file"
	Size      string          `json:"size,omitempty"`
	LineCount int             `json:"lineCount,omitempty"`
	FileID    string          `json:"fileId,omitempty"`
	IsOpen    bool            `json:"isOpen,omitempty"`
	Children  []*FileTreeNode `json:"children,omitempty"`
}

// LogLine represents an individual colorized log event
type LogLine struct {
	ID          string                 `json:"id"`
	LineNumber  int                    `json:"lineNumber"`
	Timestamp   string                 `json:"timestamp"`
	Level       string                 `json:"level"` // "INFO", "WARN", "DEBUG", "ERROR", "FATAL"
	Service     string                 `json:"service"`
	TraceID     string                 `json:"traceId,omitempty"`
	SpanID      string                 `json:"spanId,omitempty"`
	Message     string                 `json:"message"`
	Attributes  map[string]interface{} `json:"attributes,omitempty"`
	StackTrace  []string               `json:"stackTrace,omitempty"`
}

// LogFile represents an active log stream with stats
type LogFile struct {
	ID         string     `json:"id"`
	Path       string     `json:"path"`
	Filename   string     `json:"filename"`
	Size       string     `json:"size"`
	LineCount  int        `json:"lineCount"`
	Encoding   string     `json:"encoding"`
	LineEnding string     `json:"lineEnding"`
	Stats      LogStats   `json:"stats"`
	Lines      []LogLine  `json:"lines,omitempty"`
	UpdatedAt  time.Time  `json:"updatedAt"`
}

type LogStats struct {
	ErrorCount int `json:"errorCount"`
	WarnCount  int `json:"warnCount"`
	InfoCount  int `json:"infoCount"`
	DebugCount int `json:"debugCount"`
	FatalCount int `json:"fatalCount"`
}

type LogQueryResponse struct {
	FileID      string    `json:"fileId"`
	Filename    string    `json:"filename"`
	TotalLines  int       `json:"totalLines"`
	Filtered    int       `json:"filtered"`
	MatchCount  int       `json:"matchCount"`
	Stats       LogStats  `json:"stats"`
	Lines       []LogLine `json:"lines"`
}

// MetricsResponse represents ingest and system telemetry
type MetricsResponse struct {
	IngestRateEPS int       `json:"ingestRateEPS"`
	ErrorRatio    float64   `json:"errorRatio"`
	LatencyMs     float64   `json:"latencyMs"`
	P99LatencyMs  float64   `json:"p99LatencyMs"`
	MemoryUsedMB  float64   `json:"memoryUsedMB"`
	MemoryMaxMB   float64   `json:"memoryMaxMB"`
	TotalEvents   int64     `json:"totalEvents"`
	Heatmap       []int     `json:"heatmap"`
	Timestamp     time.Time `json:"timestamp"`
}

// Settings represents parser and memory configuration
type Settings struct {
	DefaultGrammar string `json:"defaultGrammar"`
	Timezone       string `json:"timezone"`
	MaxBufferSize  int    `json:"maxBufferSize"` // in MB
}
