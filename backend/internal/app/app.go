package app

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	_ "modernc.org/sqlite"
)

const sessionCookie = "logpulse_session"
const sessionTTL = 12 * time.Hour

type App struct {
	db           *sql.DB
	logger       *slog.Logger
	loginMu      sync.Mutex
	loginFailures map[string]loginFailure
}

type loginFailure struct {
	count       int
	windowStart time.Time
	blockedTill time.Time
}

type identity struct {
	ID       string `json:"id"`
	Username string `json:"username"`
	Email    string `json:"email"`
	Name     string `json:"name"`
	Role     string `json:"role"`
}

type contextKey string

const identityKey contextKey = "identity"

func New(logger *slog.Logger) (*App, error) {
	if logger == nil {
		logger = slog.Default()
	}
	dataDir := os.Getenv("DATA_DIR")
	if dataDir == "" {
		dataDir = "./data"
	}
	if err := os.MkdirAll(dataDir, 0o750); err != nil {
		return nil, fmt.Errorf("create data directory: %w", err)
	}
	dbPath := filepath.Join(dataDir, "logpulse.sqlite")
	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, fmt.Errorf("open sqlite database: %w", err)
	}
	db.SetMaxOpenConns(8)
	db.SetMaxIdleConns(4)
	db.SetConnMaxLifetime(0)
	a := &App{db: db, logger: logger, loginFailures: make(map[string]loginFailure)}
	if err := a.initDB(context.Background()); err != nil {
		db.Close()
		return nil, err
	}
	return a, nil
}

func (a *App) Close() error { return a.db.Close() }

func (a *App) initDB(ctx context.Context) error {
	for _, statement := range []string{
		`PRAGMA journal_mode = WAL`,
		`PRAGMA synchronous = NORMAL`,
		`PRAGMA foreign_keys = ON`,
		`PRAGMA busy_timeout = 5000`,
		`CREATE TABLE IF NOT EXISTS connections (
			id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL, host TEXT, port INTEGER,
			username TEXT, auth_method TEXT, password TEXT, private_key TEXT, private_key_name TEXT,
			passphrase TEXT, tunnel_token TEXT, remote_path TEXT, local_path TEXT,
			recursive INTEGER DEFAULT 1, file_filter TEXT DEFAULT '*.log', is_connected INTEGER DEFAULT 0,
			latency_ms INTEGER DEFAULT 14, cipher TEXT, fingerprint TEXT,
			created_at TEXT NOT NULL, updated_at TEXT NOT NULL, user_id TEXT NOT NULL DEFAULT ''
		)`,
		`CREATE TABLE IF NOT EXISTS active_connection (
			id INTEGER PRIMARY KEY CHECK (id = 1), connection_id TEXT NOT NULL, updated_at TEXT NOT NULL
		)`,
		`CREATE TABLE IF NOT EXISTS user_active_connection (
			user_id TEXT PRIMARY KEY, connection_id TEXT NOT NULL, updated_at TEXT NOT NULL
		)`,
		`CREATE TABLE IF NOT EXISTS app_settings (
			id INTEGER PRIMARY KEY CHECK (id = 1), default_grammar TEXT DEFAULT 'raw_ansi',
			timezone TEXT DEFAULT 'utc', max_buffer_size INTEGER DEFAULT 256, updated_at TEXT NOT NULL
		)`,
		`CREATE TABLE IF NOT EXISTS user_settings (
			user_id TEXT PRIMARY KEY, default_grammar TEXT NOT NULL, timezone TEXT NOT NULL,
			max_buffer_size INTEGER NOT NULL, updated_at TEXT NOT NULL
		)`,
		`CREATE TABLE IF NOT EXISTS users (
			id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, email TEXT NOT NULL UNIQUE,
			password_hash TEXT NOT NULL, name TEXT NOT NULL,
			role TEXT NOT NULL DEFAULT 'Site Reliability Engineer (L5)',
			is_active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
		)`,
		`CREATE TABLE IF NOT EXISTS sessions (
			token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			expires_at TEXT NOT NULL, created_at TEXT NOT NULL
		)`,
	} {
		if _, err := a.db.ExecContext(ctx, statement); err != nil {
			return fmt.Errorf("initialize database: %w", err)
		}
	}

	if err := a.ensureColumn(ctx, "connections", "user_id", `ALTER TABLE connections ADD COLUMN user_id TEXT NOT NULL DEFAULT ''`); err != nil {
		return err
	}
	now := time.Now().UTC().Format(time.RFC3339Nano)
	if _, err := a.db.ExecContext(ctx, `INSERT OR IGNORE INTO app_settings
		(id, default_grammar, timezone, max_buffer_size, updated_at) VALUES (1, 'raw_ansi', 'utc', 256, ?)`, now); err != nil {
		return err
	}

	userCount := 0
	if err := a.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM users`).Scan(&userCount); err != nil {
		return err
	}
	if userCount == 0 {
		username, password := strings.TrimSpace(os.Getenv("APP_USERNAME")), os.Getenv("APP_PASSWORD")
		if username == "" || password == "" {
			return errors.New("APP_USERNAME and APP_PASSWORD must be set before first startup")
		}
		email := username
		if !strings.Contains(email, "@") {
			email += "@logpulse.internal"
		}
		name := username
		if at := strings.IndexByte(name, '@'); at >= 0 {
			name = name[:at]
		}
		if name == "" {
			name = "Admin"
		} else {
			name = strings.ToUpper(name[:1]) + name[1:]
		}
		hash, err := hashPassword(password)
		if err != nil {
			return fmt.Errorf("hash initial admin password: %w", err)
		}
		if _, err := a.db.ExecContext(ctx, `INSERT INTO users
			(id, username, email, password_hash, name, role, is_active, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, 'Administrator', 1, ?, ?)`, randomID("usr"), username, email, hash, name, now, now); err != nil {
			return fmt.Errorf("create initial admin user: %w", err)
		}
	}

	var adminID string
	if err := a.db.QueryRowContext(ctx, `SELECT id FROM users WHERE is_active = 1 ORDER BY created_at LIMIT 1`).Scan(&adminID); err == nil {
		if _, err := a.db.ExecContext(ctx, `UPDATE connections SET user_id = ? WHERE user_id = ''`, adminID); err != nil {
			return err
		}
		var activeID string
		if err := a.db.QueryRowContext(ctx, `SELECT connection_id FROM active_connection WHERE id = 1`).Scan(&activeID); err == nil {
			_, _ = a.db.ExecContext(ctx, `INSERT OR IGNORE INTO user_active_connection (user_id, connection_id, updated_at) VALUES (?, ?, ?)`, adminID, activeID, now)
		}
	}
	return nil
}

func (a *App) ensureColumn(ctx context.Context, table, column, alter string) error {
	rows, err := a.db.QueryContext(ctx, `PRAGMA table_info(`+table+`)`)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var cid, notNull, primaryKey int
		var name, dataType string
		var defaultValue any
		if err := rows.Scan(&cid, &name, &dataType, &notNull, &defaultValue, &primaryKey); err != nil {
			return err
		}
		if name == column {
			return nil
		}
	}
	if err := rows.Err(); err != nil {
		return err
	}
	_, err = a.db.ExecContext(ctx, alter)
	return err
}

func (a *App) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", a.health)
	mux.HandleFunc("GET /api/health", a.health)
	mux.HandleFunc("POST /api/auth/login", a.login)
	mux.Handle("POST /api/auth/logout", a.auth(http.HandlerFunc(a.logout)))
	mux.Handle("GET /api/auth/me", a.auth(http.HandlerFunc(a.me)))

	mux.Handle("GET /api/connections", a.auth(http.HandlerFunc(a.connections)))
	mux.Handle("POST /api/connections", a.auth(http.HandlerFunc(a.connections)))
	mux.Handle("PUT /api/connections/{id}", a.auth(http.HandlerFunc(a.connections)))
	mux.Handle("DELETE /api/connections/{id}", a.auth(http.HandlerFunc(a.connections)))
	mux.Handle("POST /api/connections/test", a.auth(http.HandlerFunc(a.testConnection)))
	mux.Handle("POST /api/connections/{id}/activate", a.auth(http.HandlerFunc(a.activateConnection)))
	mux.Handle("POST /api/ssh/test", a.auth(http.HandlerFunc(a.testConnection)))
	mux.Handle("GET /api/ssh/connections", a.auth(http.HandlerFunc(a.connections)))
	mux.Handle("POST /api/ssh/connect", a.auth(http.HandlerFunc(a.connections)))
	mux.Handle("GET /api/files/tree", a.auth(http.HandlerFunc(a.fileTree)))
	mux.Handle("GET /api/logs", a.auth(http.HandlerFunc(a.logs)))
	mux.Handle("GET /api/logs/stream", a.auth(http.HandlerFunc(a.logStream)))
	mux.Handle("GET /api/logs/download", a.auth(http.HandlerFunc(a.downloadLog)))
	mux.Handle("GET /api/metrics", a.auth(http.HandlerFunc(a.metrics)))
	mux.Handle("GET /api/settings", a.auth(http.HandlerFunc(a.settings)))
	mux.Handle("POST /api/settings", a.auth(http.HandlerFunc(a.settings)))
	mux.Handle("PUT /api/settings", a.auth(http.HandlerFunc(a.settings)))
	mux.Handle("GET /api/users", a.auth(a.admin(http.HandlerFunc(a.users))))
	mux.Handle("POST /api/users", a.auth(a.admin(http.HandlerFunc(a.users))))
	mux.Handle("PUT /api/users/{id}", a.auth(a.admin(http.HandlerFunc(a.users))))
	mux.Handle("DELETE /api/users/{id}", a.auth(a.admin(http.HandlerFunc(a.users))))
	return a.requestMiddleware(a.cors(mux))
}

func (a *App) health(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), time.Second)
	defer cancel()
	if err := a.db.PingContext(ctx); err != nil {
		jsonError(w, http.StatusServiceUnavailable, "Database is unavailable.")
		return
	}
	var count int
	_ = a.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM connections`).Scan(&count)
	jsonResponse(w, http.StatusOK, map[string]any{
		"status": "healthy", "engine": "LogPulse Go API", "uptime": "ok",
		"sqlite": map[string]any{"status": "connected", "connectionsCount": count},
	})
}

func (a *App) cors(next http.Handler) http.Handler {
	allowed := map[string]bool{}
	for _, origin := range strings.Split(os.Getenv("CORS_ALLOWED_ORIGINS"), ",") {
		if origin = strings.TrimSpace(origin); origin != "" {
			allowed[origin] = true
		}
	}
	allowed["http://localhost:5173"] = true
	allowed["http://127.0.0.1:5173"] = true
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" && allowed[origin] {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Credentials", "true")
			w.Header().Add("Vary", "Origin")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-Requested-With")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		}
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (a *App) requestMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Referrer-Policy", "same-origin")
		w.Header().Set("X-Frame-Options", "DENY")
		if r.Method != http.MethodGet && r.Method != http.MethodHead && r.URL.Path != "/api/auth/login" && r.URL.Path != "/api/auth/logout" {
			origin := r.Header.Get("Origin")
			if origin != "" && r.Header.Get("Sec-Fetch-Site") == "cross-site" {
				jsonError(w, http.StatusForbidden, "Cross-site request rejected.")
				return
			}
		}
		next.ServeHTTP(w, r)
		a.logger.Info("http request", "method", r.Method, "path", r.URL.Path, "duration", time.Since(start))
	})
}

func (a *App) auth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie(sessionCookie)
		if err != nil || cookie.Value == "" {
			jsonError(w, http.StatusUnauthorized, "Authentication required.")
			return
		}
		tokenHash := hashToken(cookie.Value)
		var user identity
		var expires string
		err = a.db.QueryRowContext(r.Context(), `SELECT u.id, u.username, u.email, u.name, u.role, s.expires_at
			FROM sessions s JOIN users u ON u.id = s.user_id
			WHERE s.token_hash = ? AND u.is_active = 1`, tokenHash).
			Scan(&user.ID, &user.Username, &user.Email, &user.Name, &user.Role, &expires)
		if err != nil {
			clearSessionCookie(w, r)
			jsonError(w, http.StatusUnauthorized, "Session expired. Please sign in again.")
			return
		}
		if parsed, err := time.Parse(time.RFC3339Nano, expires); err != nil || time.Now().After(parsed) {
			_, _ = a.db.ExecContext(r.Context(), `DELETE FROM sessions WHERE token_hash = ?`, tokenHash)
			clearSessionCookie(w, r)
			jsonError(w, http.StatusUnauthorized, "Session expired. Please sign in again.")
			return
		}
		next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), identityKey, user)))
	})
}

func (a *App) admin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user, _ := r.Context().Value(identityKey).(identity)
		if !strings.EqualFold(user.Role, "administrator") && !strings.EqualFold(user.Role, "admin") {
			jsonError(w, http.StatusForbidden, "Administrator access required.")
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (a *App) login(w http.ResponseWriter, r *http.Request) {
	var request struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := decodeJSON(w, r, &request); err != nil {
		jsonError(w, http.StatusBadRequest, "Invalid request payload.")
		return
	}
	username := strings.TrimSpace(request.Username)
	if username == "" || request.Password == "" {
		jsonError(w, http.StatusBadRequest, "Username and password are required.")
		return
	}
	clientIP := requestClientIP(r)
	if retry := a.loginRetryAfter(clientIP); retry > 0 {
		w.Header().Set("Retry-After", fmt.Sprint(int(retry.Seconds())+1))
		jsonError(w, http.StatusTooManyRequests, "Too many sign-in attempts. Try again later.")
		return
	}
	var user identity
	var storedHash string
	err := a.db.QueryRowContext(r.Context(), `SELECT id, username, email, name, role, password_hash
		FROM users WHERE (username = ? OR email = ?) AND is_active = 1`, username, username).
		Scan(&user.ID, &user.Username, &user.Email, &user.Name, &user.Role, &storedHash)
	if err != nil || !verifyPassword(request.Password, storedHash) {
		a.recordLoginFailure(clientIP)
		jsonError(w, http.StatusUnauthorized, "Invalid username or password.")
		return
	}
	a.clearLoginFailures(clientIP)
	token, err := randomToken()
	if err != nil {
		jsonError(w, http.StatusInternalServerError, "Could not create session.")
		return
	}
	now := time.Now().UTC()
	expires := now.Add(sessionTTL)
	if _, err := a.db.ExecContext(r.Context(), `INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)`, hashToken(token), user.ID, expires.Format(time.RFC3339Nano), now.Format(time.RFC3339Nano)); err != nil {
		jsonError(w, http.StatusInternalServerError, "Could not create session.")
		return
	}
	http.SetCookie(w, &http.Cookie{Name: sessionCookie, Value: token, Path: "/", Expires: expires, MaxAge: int(sessionTTL.Seconds()), HttpOnly: true, Secure: isSecureRequest(r), SameSite: http.SameSiteStrictMode})
	jsonResponse(w, http.StatusOK, map[string]any{"success": true, "user": user})
}

func requestClientIP(r *http.Request) string {
	forwarded := strings.Split(r.Header.Get("X-Forwarded-For"), ",")
	if value := strings.TrimSpace(forwarded[len(forwarded)-1]); value != "" {
		return value
	}
	if host, _, err := net.SplitHostPort(r.RemoteAddr); err == nil { return host }
	return r.RemoteAddr
}

func (a *App) loginRetryAfter(ip string) time.Duration {
	a.loginMu.Lock()
	defer a.loginMu.Unlock()
	failure, ok := a.loginFailures[ip]
	if !ok { return 0 }
	now := time.Now()
	if now.Before(failure.blockedTill) { return time.Until(failure.blockedTill) }
	if now.Sub(failure.windowStart) >= 15*time.Minute { delete(a.loginFailures, ip); return 0 }
	return 0
}

func (a *App) recordLoginFailure(ip string) {
	a.loginMu.Lock()
	defer a.loginMu.Unlock()
	now := time.Now()
	failure := a.loginFailures[ip]
	if now.Sub(failure.windowStart) >= 15*time.Minute { failure = loginFailure{windowStart: now} }
	failure.count++
	if failure.count >= 8 { failure.blockedTill = now.Add(15 * time.Minute) }
	a.loginFailures[ip] = failure
	if len(a.loginFailures) > 2048 {
		for key, item := range a.loginFailures { if now.Sub(item.windowStart) > 15*time.Minute { delete(a.loginFailures, key) } }
	}
}

func (a *App) clearLoginFailures(ip string) {
	a.loginMu.Lock()
	delete(a.loginFailures, ip)
	a.loginMu.Unlock()
}

func (a *App) logout(w http.ResponseWriter, r *http.Request) {
	if cookie, err := r.Cookie(sessionCookie); err == nil && cookie.Value != "" {
		_, _ = a.db.ExecContext(r.Context(), `DELETE FROM sessions WHERE token_hash = ?`, hashToken(cookie.Value))
	}
	clearSessionCookie(w, r)
	jsonResponse(w, http.StatusOK, map[string]bool{"success": true})
}

func (a *App) me(w http.ResponseWriter, r *http.Request) {
	user, _ := r.Context().Value(identityKey).(identity)
	jsonResponse(w, http.StatusOK, user)
}

func currentUser(r *http.Request) identity {
	user, _ := r.Context().Value(identityKey).(identity)
	return user
}

func randomID(prefix string) string {
	var bytes [16]byte
	if _, err := rand.Read(bytes[:]); err != nil {
		return fmt.Sprintf("%s-%d", prefix, time.Now().UnixNano())
	}
	return prefix + "-" + hex.EncodeToString(bytes[:])
}

func randomToken() (string, error) {
	var bytes [32]byte
	if _, err := rand.Read(bytes[:]); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes[:]), nil
}

func hashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func isSecureRequest(r *http.Request) bool {
	return r.TLS != nil || strings.EqualFold(r.Header.Get("X-Forwarded-Proto"), "https")
}

func clearSessionCookie(w http.ResponseWriter, r *http.Request) {
	http.SetCookie(w, &http.Cookie{Name: sessionCookie, Value: "", Path: "/", MaxAge: -1, Expires: time.Unix(0, 0), HttpOnly: true, Secure: isSecureRequest(r), SameSite: http.SameSiteStrictMode})
}

func decodeJSON(w http.ResponseWriter, r *http.Request, target any) error {
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	return decoder.Decode(target)
}

func jsonResponse(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

func jsonError(w http.ResponseWriter, status int, message string) {
	jsonResponse(w, status, map[string]any{"success": false, "message": message})
}
