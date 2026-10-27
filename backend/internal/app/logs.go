package app

import (
	"bufio"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime"
	"net/http"
	"os"
	"os/exec"
	"path"
	"path/filepath"
	"regexp"
	"runtime"
	"strings"
	"syscall"
	"time"
)

const maxLogBytes = 1 << 20
const maxLogLines = 2500

func (a *App) logs(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)
	conn, err := a.activeConnection(r.Context(), user.ID)
	if errors.Is(err, sql.ErrNoRows) {
		jsonError(w, http.StatusConflict, "Select and activate a connection first.")
		return
	}
	if err != nil {
		jsonError(w, http.StatusInternalServerError, "Could not load active connection.")
		return
	}
	target := r.URL.Query().Get("path")
	if target == "" {
		jsonError(w, http.StatusBadRequest, "A log file path is required.")
		return
	}
	if err := validateTargetPath(conn, target); err != nil {
		jsonError(w, http.StatusForbidden, err.Error())
		return
	}
	contents, _, err := a.readLogTail(r.Context(), conn, target)
	if err != nil {
		jsonError(w, http.StatusBadGateway, "Could not read log file.")
		return
	}
	lines := parseLogLines(contents)
	search := r.URL.Query().Get("search")
	caseSensitive := r.URL.Query().Get("caseSensitive") == "true"
	isRegex := r.URL.Query().Get("isRegex") == "true"
	level := strings.ToUpper(r.URL.Query().Get("level"))
	var expression *regexp.Regexp
	if search != "" && isRegex {
		pattern := search
		if !caseSensitive {
			pattern = "(?i)" + pattern
		}
		expression, err = regexp.Compile(pattern)
		if err != nil {
			jsonError(w, http.StatusBadRequest, "Invalid regular expression.")
			return
		}
	}
	filtered := make([]map[string]any, 0, len(lines))
	for _, line := range lines {
		if level != "" && !strings.EqualFold(fmt.Sprint(line["level"]), level) {
			continue
		}
		text := fmt.Sprint(line["raw"])
		matched := true
		if search != "" {
			switch {
			case expression != nil:
				matched = expression.MatchString(text)
			case caseSensitive:
				matched = strings.Contains(text, search)
			default:
				matched = strings.Contains(strings.ToLower(text), strings.ToLower(search))
			}
		}
		if matched {
			filtered = append(filtered, line)
		}
	}
	jsonResponse(w, http.StatusOK, map[string]any{
		"fileId": defaultString(r.URL.Query().Get("fileId"), target), "filename": path.Base(target),
		"totalLines": len(lines), "filtered": len(filtered), "matchCount": len(filtered),
		"stats": map[string]int{"errorCount": 0, "warnCount": 0, "infoCount": len(lines), "debugCount": 0, "fatalCount": 0}, "lines": filtered,
	})
}

func (a *App) readLogTail(ctx context.Context, conn connection, target string) ([]byte, int64, error) {
	if conn.Type == "local_folder" {
		resolved, err := allowedLocalPath(target)
		if err != nil {
			return nil, 0, err
		}
		info, err := os.Stat(resolved)
		if err != nil {
			return nil, 0, err
		}
		if !info.Mode().IsRegular() {
			return nil, 0, errors.New("target is not a regular file")
		}
		file, err := os.Open(resolved)
		if err != nil {
			return nil, 0, err
		}
		defer file.Close()
		start := info.Size() - maxLogBytes
		if start < 0 {
			start = 0
		}
		if _, err := file.Seek(start, io.SeekStart); err != nil {
			return nil, 0, err
		}
		contents, err := io.ReadAll(io.LimitReader(file, maxLogBytes+1))
		return contents, info.Size(), err
	}
	if conn.Type == "ssh" {
		if err := validateRemoteTarget(conn, target); err != nil {
			return nil, 0, err
		}
		command := remoteGuardedCommand(conn.RemotePath, target, `size=$(wc -c < "$LOGPULSE_TARGET"); tail -c `+fmt.Sprint(maxLogBytes)+` -- "$LOGPULSE_TARGET"; printf '\nLOGPULSE_SIZE:%s\n' "$size"`)
		output, err := a.runSSH(ctx, conn, command)
		if err != nil {
			return nil, 0, err
		}
		marker := []byte("\nLOGPULSE_SIZE:")
		index := strings.LastIndex(string(output), string(marker))
		if index < 0 {
			return output, int64(bytesLineCount(output)), nil
		}
		var size int64
		_, _ = fmt.Sscanf(string(output[index+len(marker):]), "%d", &size)
		return output[:index], size, nil
	}
	return nil, 0, errors.New("Log reading is not available for this connection type")
}

func parseLogLines(contents []byte) []map[string]any {
	parts := strings.Split(strings.TrimRight(string(contents), "\r\n"), "\n")
	if len(parts) == 1 && parts[0] == "" {
		return []map[string]any{}
	}
	if len(parts) > maxLogLines {
		parts = parts[len(parts)-maxLogLines:]
	}
	lineOffset := 0
	lines := make([]map[string]any, 0, len(parts))
	for i, raw := range parts {
		if strings.HasSuffix(raw, "\r") {
			raw = strings.TrimSuffix(raw, "\r")
		}
		lines = append(lines, map[string]any{"id": fmt.Sprintf("line-%d-%d", lineOffset+i+1, i), "lineNumber": lineOffset + i + 1,
			"timestamp": "", "level": "INFO", "service": "", "message": raw, "raw": raw})
	}
	return lines
}

func bytesLineCount(b []byte) int {
	if len(b) == 0 {
		return 0
	}
	return strings.Count(string(b), "\n") + 1
}

func (a *App) downloadLog(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)
	conn, err := a.activeConnection(r.Context(), user.ID)
	if errors.Is(err, sql.ErrNoRows) {
		jsonError(w, http.StatusConflict, "Select and activate a connection first.")
		return
	}
	if err != nil {
		jsonError(w, http.StatusInternalServerError, "Could not load active connection.")
		return
	}
	target := r.URL.Query().Get("path")
	if target == "" {
		jsonError(w, http.StatusBadRequest, "A log file path is required.")
		return
	}
	if err := validateTargetPath(conn, target); err != nil {
		jsonError(w, http.StatusForbidden, err.Error())
		return
	}
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.Header().Set("Content-Disposition", mime.FormatMediaType("attachment", map[string]string{"filename": filepath.Base(target)}))
	if conn.Type == "local_folder" {
		resolved, err := allowedLocalPath(target)
		if err != nil {
			jsonError(w, http.StatusForbidden, err.Error())
			return
		}
		http.ServeFile(w, r, resolved)
		return
	}
	if err := copyCommandOutput(r.Context(), w, conn, remoteGuardedCommand(conn.RemotePath, target, `cat -- "$LOGPULSE_TARGET"`)); err != nil {
		a.logger.Warn("log download failed", "error", err)
	}
}

func (a *App) logStream(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)
	conn, err := a.activeConnection(r.Context(), user.ID)
	if errors.Is(err, sql.ErrNoRows) {
		jsonError(w, http.StatusConflict, "Select and activate a connection first.")
		return
	}
	if err != nil {
		jsonError(w, http.StatusInternalServerError, "Could not load active connection.")
		return
	}
	target := r.URL.Query().Get("path")
	if target == "" {
		jsonError(w, http.StatusBadRequest, "A log file path is required.")
		return
	}
	if err := validateTargetPath(conn, target); err != nil {
		jsonError(w, http.StatusForbidden, err.Error())
		return
	}
	flusher, ok := w.(http.Flusher)
	if !ok {
		jsonError(w, http.StatusInternalServerError, "Streaming is not supported.")
		return
	}

	ctx := r.Context()
	var cmd *exec.Cmd
	var stdout io.ReadCloser
	var cleanup func()
	if conn.Type == "local_folder" {
		resolved, err := allowedLocalPath(target)
		if err != nil {
			jsonError(w, http.StatusForbidden, err.Error())
			return
		}
		cmd = exec.CommandContext(ctx, "tail", "-n", "0", "-F", "--", resolved)
	} else if conn.Type == "ssh" {
		cmd, stdout, cleanup, err = a.startSSHStream(ctx, conn, remoteGuardedCommand(conn.RemotePath, target, `tail -n 0 -F -- "$LOGPULSE_TARGET"`))
		if err != nil {
			jsonError(w, http.StatusBadGateway, "Could not start log stream.")
			return
		}
		defer cleanup()
	} else {
		jsonError(w, http.StatusBadRequest, "Log streaming is unavailable for this connection type.")
		return
	}

	if stdout == nil {
		stdout, err = cmd.StdoutPipe()
		if err != nil {
			jsonError(w, http.StatusInternalServerError, "Could not start log stream.")
			return
		}
	}
	cmd.Stderr = io.Discard
	if err := cmd.Start(); err != nil {
		if stdout != nil {
			stdout.Close()
		}
		jsonError(w, http.StatusBadGateway, "Could not start log stream.")
		return
	}
	defer func() { _ = cmd.Process.Kill(); _ = cmd.Wait(); _ = stdout.Close() }()
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache, no-transform")
	w.Header().Set("X-Accel-Buffering", "no")
	w.WriteHeader(http.StatusOK)
	_, _ = io.WriteString(w, "event: connected\ndata: {\"status\":\"streaming\"}\n\n")
	flusher.Flush()

	lines := make(chan string, 64)
	readErr := make(chan error, 1)
	go func() {
		scanner := bufio.NewScanner(stdout)
		scanner.Buffer(make([]byte, 64*1024), 2*1024*1024)
		for scanner.Scan() {
			select {
			case lines <- scanner.Text():
			case <-ctx.Done():
				readErr <- ctx.Err()
				return
			}
		}
		readErr <- scanner.Err()
	}()
	heartbeat := time.NewTicker(15 * time.Second)
	defer heartbeat.Stop()
	lineNumber := 0
	for {
		select {
		case <-ctx.Done():
			return
		case line := <-lines:
			lineNumber++
			encoded, _ := json.Marshal(map[string]any{"id": fmt.Sprintf("stream-%d", time.Now().UnixNano()), "lineNumber": lineNumber,
				"timestamp": "", "level": "INFO", "service": "", "message": line, "raw": line})
			if _, err := fmt.Fprintf(w, "event: log\ndata: %s\n\n", encoded); err != nil {
				return
			}
			flusher.Flush()
		case err := <-readErr:
			if err != nil {
				a.logger.Debug("log stream ended", "error", err)
			}
			return
		case <-heartbeat.C:
			if _, err := io.WriteString(w, ": keep-alive\n\n"); err != nil {
				return
			}
			flusher.Flush()
		}
	}
}

func (a *App) startSSHStream(ctx context.Context, c connection, remoteCommand string) (*exec.Cmd, io.ReadCloser, func(), error) {
	_, _, cleanup, options, env, err := sshFiles(c)
	if err != nil {
		return nil, nil, nil, err
	}
	destination := ""
	filteredEnv := make([]string, 0, len(env))
	for _, item := range env {
		if strings.HasPrefix(item, "LOGPULSE_SSH_DEST=") {
			destination = strings.TrimPrefix(item, "LOGPULSE_SSH_DEST=")
		} else {
			filteredEnv = append(filteredEnv, item)
		}
	}
	cmd := exec.CommandContext(ctx, "ssh", append(options, destination, remoteCommand)...)
	cmd.Env = append(os.Environ(), filteredEnv...)
	cmd.SysProcAttr = &syscall.SysProcAttr{Setsid: true}
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		cleanup()
		return nil, nil, nil, err
	}
	return cmd, stdout, cleanup, nil
}

func validateTargetPath(c connection, target string) error {
	if c.Type == "local_folder" {
		_, err := allowedLocalPath(target)
		return err
	}
	if c.Type == "ssh" {
		return validateRemoteTarget(c, target)
	}
	return errors.New("This connection type cannot access log files.")
}

func validateRemoteTarget(c connection, target string) error {
	root := path.Clean(defaultString(c.RemotePath, "/var/log"))
	resolved := path.Clean(target)
	if !path.IsAbs(resolved) {
		return errors.New("Log path must be absolute.")
	}
	if resolved != root && !strings.HasPrefix(resolved, strings.TrimSuffix(root, "/")+"/") {
		return errors.New("The requested file is outside the configured remote directory.")
	}
	return nil
}

func remoteGuardedCommand(root, target, operation string) string {
	return `LOGPULSE_ROOT=$(realpath -- ` + shellQuote(defaultString(root, "/var/log")) + `) && LOGPULSE_TARGET=$(realpath -- ` + shellQuote(target) + `) && case "$LOGPULSE_TARGET" in "$LOGPULSE_ROOT"/*) test -f "$LOGPULSE_TARGET" && ` + operation + ` ;; *) exit 1 ;; esac`
}

func (a *App) metrics(w http.ResponseWriter, r *http.Request) {
	var mem runtime.MemStats
	runtime.ReadMemStats(&mem)
	user := currentUser(r)
	var count int
	_ = a.db.QueryRowContext(r.Context(), `SELECT COUNT(*) FROM connections WHERE user_id=?`, user.ID).Scan(&count)
	jsonResponse(w, http.StatusOK, map[string]any{"ingestRateEPS": 0, "errorRatio": 0, "latencyMs": 0, "p99LatencyMs": 0,
		"memoryUsedMB": float64(mem.Alloc) / (1024 * 1024), "memoryMaxMB": 0, "totalEvents": 0, "heatmap": []int{},
		"sqliteConnectionsCount": count, "timestamp": time.Now().UTC()})
}
