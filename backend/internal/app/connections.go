package app

import (
	"context"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"net"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"
)

type connection struct {
	ID             string `json:"id"`
	UserID         string `json:"-"`
	Name           string `json:"name"`
	Type           string `json:"type"`
	Host           string `json:"host,omitempty"`
	Port           int    `json:"port,omitempty"`
	Username       string `json:"username,omitempty"`
	AuthMethod     string `json:"authMethod,omitempty"`
	Password       string `json:"password,omitempty"`
	PrivateKey     string `json:"privateKey,omitempty"`
	PrivateKeyName string `json:"privateKeyName,omitempty"`
	Passphrase     string `json:"passphrase,omitempty"`
	TunnelToken    string `json:"tunnelToken,omitempty"`
	RemotePath     string `json:"remotePath,omitempty"`
	LocalPath      string `json:"localPath,omitempty"`
	Recursive      bool   `json:"recursive"`
	FileFilter     string `json:"fileFilter,omitempty"`
	IsConnected    bool   `json:"isConnected"`
	LatencyMs      int    `json:"latencyMs"`
	Cipher         string `json:"cipher,omitempty"`
	Fingerprint    string `json:"fingerprint,omitempty"`
	CreatedAt      string `json:"createdAt,omitempty"`
	UpdatedAt      string `json:"updatedAt,omitempty"`
}

func (a *App) connections(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)
	switch r.Method {
	case http.MethodGet:
		rows, err := a.db.QueryContext(r.Context(), `SELECT id, name, type, COALESCE(host,''), COALESCE(port,0),
			COALESCE(username,''), COALESCE(auth_method,''), COALESCE(password,''), COALESCE(private_key,''),
			COALESCE(private_key_name,''), COALESCE(passphrase,''), COALESCE(tunnel_token,''), COALESCE(remote_path,''),
			COALESCE(local_path,''), COALESCE(recursive,1), COALESCE(file_filter,'*.log'), COALESCE(latency_ms,0),
			COALESCE(cipher,''), COALESCE(fingerprint,''), created_at, updated_at
			FROM connections WHERE user_id = ? ORDER BY created_at DESC`, user.ID)
		if err != nil {
			jsonError(w, http.StatusInternalServerError, "Could not load connections.")
			return
		}
		defer rows.Close()
		activeID, _ := a.activeConnectionID(r.Context(), user.ID)
		items := make([]map[string]any, 0)
		for rows.Next() {
			item, err := scanConnection(rows, user.ID)
			if err != nil {
				jsonError(w, http.StatusInternalServerError, "Could not load connections.")
				return
			}
			items = append(items, item.public(activeID))
		}
		if err := rows.Err(); err != nil {
			jsonError(w, http.StatusInternalServerError, "Could not load connections.")
			return
		}
		jsonResponse(w, http.StatusOK, items)
	case http.MethodPost:
		var body connection
		if err := decodeJSON(w, r, &body); err != nil {
			jsonError(w, http.StatusBadRequest, "Invalid connection payload.")
			return
		}
		if err := validateConnection(&body); err != nil {
			jsonError(w, http.StatusBadRequest, err.Error())
			return
		}
		if body.ID == "" {
			body.ID = randomID("conn")
		}
		now := time.Now().UTC().Format(time.RFC3339Nano)
		body.UserID = user.ID
		if body.CreatedAt == "" {
			body.CreatedAt = now
		}
		body.UpdatedAt = now
		_, err := a.db.ExecContext(r.Context(), `INSERT INTO connections
			(id,name,type,host,port,username,auth_method,password,private_key,private_key_name,passphrase,tunnel_token,
			remote_path,local_path,recursive,file_filter,is_connected,latency_ms,cipher,fingerprint,created_at,updated_at,user_id)
			VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,?,?,?,?,?,?)`,
			body.ID, body.Name, body.Type, nullable(body.Host), nullableInt(body.Port), nullable(body.Username), nullable(body.AuthMethod),
			nullable(body.Password), nullable(body.PrivateKey), nullable(body.PrivateKeyName), nullable(body.Passphrase), nullable(body.TunnelToken),
			nullable(body.RemotePath), nullable(body.LocalPath), boolInt(body.Recursive), defaultString(body.FileFilter, "*.log"),
			defaultInt(body.LatencyMs, 14), nullable(body.Cipher), nullable(body.Fingerprint), body.CreatedAt, body.UpdatedAt, user.ID)
		if err != nil {
			jsonError(w, http.StatusConflict, "Could not create connection. Check that its ID is unique.")
			return
		}
		jsonResponse(w, http.StatusCreated, map[string]any{"success": true, "connection": body.public("")})
	case http.MethodPut:
		id := r.PathValue("id")
		var body connection
		if err := decodeJSON(w, r, &body); err != nil {
			jsonError(w, http.StatusBadRequest, "Invalid connection payload.")
			return
		}
		existing, err := a.getConnection(r.Context(), user.ID, id)
		if errors.Is(err, sql.ErrNoRows) {
			jsonError(w, http.StatusNotFound, "Connection not found.")
			return
		}
		if err != nil {
			jsonError(w, http.StatusInternalServerError, "Could not load connection.")
			return
		}
		body.ID, body.UserID = id, user.ID
		body.CreatedAt, body.UpdatedAt = existing.CreatedAt, time.Now().UTC().Format(time.RFC3339Nano)
		preserveConnectionSecrets(&body, existing)
		if body.Name == "" {
			body.Name = existing.Name
		}
		if body.Type == "" {
			body.Type = existing.Type
		}
		if body.Host == "" {
			body.Host = existing.Host
		}
		if body.Port == 0 {
			body.Port = existing.Port
		}
		if body.Username == "" {
			body.Username = existing.Username
		}
		if body.AuthMethod == "" {
			body.AuthMethod = existing.AuthMethod
		}
		if body.RemotePath == "" {
			body.RemotePath = existing.RemotePath
		}
		if body.LocalPath == "" {
			body.LocalPath = existing.LocalPath
		}
		if body.FileFilter == "" {
			body.FileFilter = existing.FileFilter
		}
		if body.LatencyMs == 0 {
			body.LatencyMs = existing.LatencyMs
		}
		if body.Cipher == "" {
			body.Cipher = existing.Cipher
		}
		if body.Fingerprint == "" {
			body.Fingerprint = existing.Fingerprint
		}
		if err := validateConnection(&body); err != nil {
			jsonError(w, http.StatusBadRequest, err.Error())
			return
		}
		_, err = a.db.ExecContext(r.Context(), `UPDATE connections SET name=?,type=?,host=?,port=?,username=?,auth_method=?,password=?,
			private_key=?,private_key_name=?,passphrase=?,tunnel_token=?,remote_path=?,local_path=?,recursive=?,file_filter=?,
			latency_ms=?,cipher=?,fingerprint=?,updated_at=? WHERE id=? AND user_id=?`,
			body.Name, body.Type, nullable(body.Host), nullableInt(body.Port), nullable(body.Username), nullable(body.AuthMethod),
			nullable(body.Password), nullable(body.PrivateKey), nullable(body.PrivateKeyName), nullable(body.Passphrase), nullable(body.TunnelToken),
			nullable(body.RemotePath), nullable(body.LocalPath), boolInt(body.Recursive), defaultString(body.FileFilter, "*.log"),
			body.LatencyMs, nullable(body.Cipher), nullable(body.Fingerprint), body.UpdatedAt, id, user.ID)
		if err != nil {
			jsonError(w, http.StatusInternalServerError, "Could not update connection.")
			return
		}
		jsonResponse(w, http.StatusOK, map[string]any{"success": true, "connection": body.public("")})
	case http.MethodDelete:
		id := r.PathValue("id")
		result, err := a.db.ExecContext(r.Context(), `DELETE FROM connections WHERE id=? AND user_id=?`, id, user.ID)
		if err != nil {
			jsonError(w, http.StatusInternalServerError, "Could not delete connection.")
			return
		}
		count, _ := result.RowsAffected()
		if count == 0 {
			jsonError(w, http.StatusNotFound, "Connection not found.")
			return
		}
		_, _ = a.db.ExecContext(r.Context(), `DELETE FROM user_active_connection WHERE user_id=? AND connection_id=?`, user.ID, id)
		jsonResponse(w, http.StatusOK, map[string]any{"success": true, "id": id})
	default:
		jsonError(w, http.StatusMethodNotAllowed, "Method not allowed.")
	}
}

func scanConnection(rows *sql.Rows, userID string) (connection, error) {
	var item connection
	var recursive int
	err := rows.Scan(&item.ID, &item.Name, &item.Type, &item.Host, &item.Port, &item.Username, &item.AuthMethod,
		&item.Password, &item.PrivateKey, &item.PrivateKeyName, &item.Passphrase, &item.TunnelToken, &item.RemotePath,
		&item.LocalPath, &recursive, &item.FileFilter, &item.LatencyMs, &item.Cipher, &item.Fingerprint, &item.CreatedAt, &item.UpdatedAt)
	item.UserID, item.Recursive = userID, recursive != 0
	return item, err
}

func (c connection) public(activeID string) map[string]any {
	return map[string]any{
		"id": c.ID, "name": c.Name, "type": c.Type, "host": c.Host, "port": c.Port, "username": c.Username,
		"authMethod": c.AuthMethod, "hasPassword": c.Password != "", "hasPrivateKey": c.PrivateKey != "",
		"privateKeyName": c.PrivateKeyName, "hasPassphrase": c.Passphrase != "", "hasTunnelToken": c.TunnelToken != "",
		"remotePath": c.RemotePath, "localPath": c.LocalPath, "recursive": c.Recursive, "fileFilter": c.FileFilter,
		"isConnected": c.ID == activeID, "latencyMs": c.LatencyMs, "cipher": c.Cipher, "fingerprint": c.Fingerprint,
		"createdAt": c.CreatedAt, "updatedAt": c.UpdatedAt,
	}
}

func (a *App) getConnection(ctx context.Context, userID, id string) (connection, error) {
	rows, err := a.db.QueryContext(ctx, `SELECT id,name,type,COALESCE(host,''),COALESCE(port,0),COALESCE(username,''),COALESCE(auth_method,''),
		COALESCE(password,''),COALESCE(private_key,''),COALESCE(private_key_name,''),COALESCE(passphrase,''),COALESCE(tunnel_token,''),
		COALESCE(remote_path,''),COALESCE(local_path,''),COALESCE(recursive,1),COALESCE(file_filter,'*.log'),COALESCE(latency_ms,0),
		COALESCE(cipher,''),COALESCE(fingerprint,''),created_at,updated_at FROM connections WHERE id=? AND user_id=?`, id, userID)
	if err != nil {
		return connection{}, err
	}
	defer rows.Close()
	if !rows.Next() {
		return connection{}, sql.ErrNoRows
	}
	return scanConnection(rows, userID)
}

func (a *App) activeConnectionID(ctx context.Context, userID string) (string, error) {
	var id string
	err := a.db.QueryRowContext(ctx, `SELECT connection_id FROM user_active_connection WHERE user_id=?`, userID).Scan(&id)
	return id, err
}

func (a *App) activeConnection(ctx context.Context, userID string) (connection, error) {
	id, err := a.activeConnectionID(ctx, userID)
	if err != nil {
		return connection{}, err
	}
	return a.getConnection(ctx, userID, id)
}

func (a *App) activateConnection(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)
	id := r.PathValue("id")
	conn, err := a.getConnection(r.Context(), user.ID, id)
	if err != nil {
		jsonError(w, http.StatusNotFound, "Connection not found.")
		return
	}
	tree, err := a.buildTree(r.Context(), conn)
	if err != nil {
		jsonError(w, http.StatusBadGateway, "Could not activate connection: "+err.Error())
		return
	}
	now := time.Now().UTC().Format(time.RFC3339Nano)
	if _, err := a.db.ExecContext(r.Context(), `INSERT INTO user_active_connection (user_id,connection_id,updated_at) VALUES (?,?,?)
		ON CONFLICT(user_id) DO UPDATE SET connection_id=excluded.connection_id,updated_at=excluded.updated_at`, user.ID, id, now); err != nil {
		jsonError(w, http.StatusInternalServerError, "Could not save active connection.")
		return
	}
	_, _ = a.db.ExecContext(r.Context(), `UPDATE connections SET is_connected=0 WHERE user_id=?`, user.ID)
	_, _ = a.db.ExecContext(r.Context(), `UPDATE connections SET is_connected=1,updated_at=? WHERE id=? AND user_id=?`, now, id, user.ID)
	jsonResponse(w, http.StatusOK, map[string]any{"success": true, "activeId": id, "connection": conn.public(id), "fileTree": tree})
}

func (a *App) testConnection(w http.ResponseWriter, r *http.Request) {
	var conn connection
	if err := decodeJSON(w, r, &conn); err != nil {
		jsonError(w, http.StatusBadRequest, "Invalid connection details.")
		return
	}
	if err := validateConnection(&conn); err != nil {
		jsonError(w, http.StatusBadRequest, err.Error())
		return
	}
	started := time.Now()
	switch conn.Type {
	case "local_folder":
		resolved, err := allowedLocalPath(conn.LocalPath)
		if err != nil {
			jsonError(w, http.StatusForbidden, err.Error())
			return
		}
		info, err := os.Stat(resolved)
		if err != nil || !info.IsDir() {
			jsonError(w, http.StatusBadRequest, "Local directory is unavailable or is not a directory.")
			return
		}
		items, _ := os.ReadDir(resolved)
		discovered := make([]map[string]string, 0)
		for _, entry := range items {
			if entry.IsDir() {
				continue
			}
			if info, err := entry.Info(); err == nil && info.Mode().IsRegular() {
				discovered = append(discovered, map[string]string{"name": entry.Name(), "path": filepath.Join(resolved, entry.Name()), "size": formatSize(info.Size())})
				if len(discovered) == 10 {
					break
				}
			}
		}
		jsonResponse(w, http.StatusOK, map[string]any{"success": true, "latencyMs": max(1, int(time.Since(started).Milliseconds())), "message": "Local folder verified.", "discoveredFiles": discovered, "cipher": "posix-direct-io", "fingerprint": "FS:POSIX:DIRECT_IO"})
	case "ssh":
		if err := validateSSHAddress(conn); err != nil {
			jsonError(w, http.StatusBadRequest, err.Error())
			return
		}
		remotePath := defaultString(conn.RemotePath, "/var/log")
		if _, err := a.runSFTP(r.Context(), conn, "ls -la "+sftpQuote(remotePath)); err != nil {
			jsonError(w, http.StatusBadGateway, "SFTP connection failed: "+err.Error())
			return
		}
		jsonResponse(w, http.StatusOK, map[string]any{"success": true, "latencyMs": max(1, int(time.Since(started).Milliseconds())), "message": "SSH authentication succeeded and remote directory is readable.", "discoveredFiles": []any{}})
	case "remote_tunnel":
		if conn.Host == "" {
			jsonError(w, http.StatusBadRequest, "Tunnel host is required.")
			return
		}
		address := net.JoinHostPort(conn.Host, strconv.Itoa(defaultInt(conn.Port, 443)))
		dialer := net.Dialer{Timeout: 3 * time.Second}
		client, err := dialer.DialContext(r.Context(), "tcp", address)
		if err != nil {
			jsonError(w, http.StatusBadGateway, "Tunnel endpoint is unreachable.")
			return
		}
		client.Close()
		jsonResponse(w, http.StatusOK, map[string]any{"success": true, "latencyMs": max(1, int(time.Since(started).Milliseconds())), "message": "Tunnel endpoint is reachable. Configure the SSH tunnel agent to mount files."})
	default:
		jsonError(w, http.StatusBadRequest, "Unsupported connection type.")
	}
}

func validateConnection(c *connection) error {
	c.Name = strings.TrimSpace(c.Name)
	if c.Name == "" {
		c.Name = "New Connection"
	}
	switch c.Type {
	case "", "ssh":
		c.Type = "ssh"
		if c.Port == 0 {
			c.Port = 22
		}
		if c.RemotePath == "" {
			c.RemotePath = "/var/log"
		}
		if c.AuthMethod == "" {
			c.AuthMethod = "key"
		}
		if err := validateSSHAddress(*c); err != nil {
			return err
		}
		if c.AuthMethod != "password" && c.AuthMethod != "key" {
			return errors.New("SSH authentication method must be password or key.")
		}
		if c.AuthMethod == "password" && c.Password == "" {
			return errors.New("SSH password is required.")
		}
		if c.AuthMethod == "key" && c.PrivateKey == "" {
			return errors.New("SSH private key is required.")
		}
	case "local_folder":
		if c.LocalPath == "" {
			c.LocalPath = "/var/log"
		}
		c.FileFilter = defaultString(c.FileFilter, "*.log")
	case "remote_tunnel":
		if c.Port == 0 {
			c.Port = 443
		}
		if c.Host == "" {
			return errors.New("Tunnel host is required.")
		}
	default:
		return errors.New("Unsupported connection type.")
	}
	return nil
}

var safeHost = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9.-]*$`)
var safeUsername = regexp.MustCompile(`^[A-Za-z0-9_.-]+$`)

func validateSSHAddress(c connection) error {
	if !safeHost.MatchString(c.Host) || strings.Contains(c.Host, "..") {
		return errors.New("SSH host is invalid.")
	}
	if !safeUsername.MatchString(c.Username) {
		return errors.New("SSH username is invalid.")
	}
	if c.Port < 1 || c.Port > 65535 {
		return errors.New("SSH port is invalid.")
	}
	return nil
}

func preserveConnectionSecrets(next *connection, existing connection) {
	if next.Password == "" {
		next.Password = existing.Password
	}
	if next.PrivateKey == "" {
		next.PrivateKey = existing.PrivateKey
	}
	if next.PrivateKeyName == "" {
		next.PrivateKeyName = existing.PrivateKeyName
	}
	if next.Passphrase == "" {
		next.Passphrase = existing.Passphrase
	}
	if next.TunnelToken == "" {
		next.TunnelToken = existing.TunnelToken
	}
}

func (a *App) fileTree(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)
	conn, err := a.activeConnection(r.Context(), user.ID)
	if errors.Is(err, sql.ErrNoRows) {
		jsonResponse(w, http.StatusOK, []any{})
		return
	}
	if err != nil {
		jsonError(w, http.StatusInternalServerError, "Could not load active connection.")
		return
	}
	tree, err := a.buildTree(r.Context(), conn)
	if err != nil {
		jsonError(w, http.StatusBadGateway, "Could not read directory: "+err.Error())
		return
	}
	jsonResponse(w, http.StatusOK, tree)
}

func (a *App) buildTree(ctx context.Context, conn connection) ([]map[string]any, error) {
	if conn.Type == "local_folder" {
		root, err := allowedLocalPath(conn.LocalPath)
		if err != nil {
			return nil, err
		}
		count := 0
		children := localTreeChildren(root, 0, 5, defaultString(conn.FileFilter, "*.log"), &count)
		return []map[string]any{{"id": "root-" + hex.EncodeToString([]byte(root)), "name": root, "path": root, "type": "folder", "isOpen": true, "children": children}}, nil
	}
	if conn.Type == "ssh" {
		root := defaultString(conn.RemotePath, "/var/log")
		command := "find " + shellQuote(root) + " -maxdepth 5 -mindepth 1 \\( -type f -o -type d \\) -printf '%y\\t%s\\t%T@\\t%p\\0' 2>/dev/null | head -c 524288"
		output, err := a.runSSH(ctx, conn, command)
		if err != nil {
			return nil, err
		}
		return parseRemoteTree(root, output), nil
	}
	return nil, errors.New("File browsing is not available for this connection type.")
}

func localTreeChildren(root string, depth, maxDepth int, fileFilter string, count *int) []map[string]any {
	children := make([]map[string]any, 0)
	entries, err := os.ReadDir(root)
	if err != nil {
		return []map[string]any{}
	}
	for _, entry := range entries {
		if *count >= 1000 {
			break
		}
		path := filepath.Join(root, entry.Name())
		info, err := entry.Info()
		if err != nil || !info.Mode().IsRegular() && !info.IsDir() {
			continue
		}
		node := map[string]any{"id": "local-" + hex.EncodeToString([]byte(path)), "name": entry.Name(), "path": path,
			"modifiedAt": info.ModTime().UnixMilli()}
		if info.IsDir() {
			*count++
			node["type"] = "folder"
			node["isOpen"] = depth < 1
			if depth < maxDepth {
				node["children"] = localTreeChildren(path, depth+1, maxDepth, fileFilter, count)
			}
		} else {
			if !matchesFileFilter(entry.Name(), fileFilter) {
				continue
			}
			*count++
			node["type"] = "file"
			node["size"] = formatSize(info.Size())
			node["lineCount"] = 0
			node["fileId"] = path
		}
		children = append(children, node)
	}
	return children
}

func matchesFileFilter(name, filter string) bool {
	if filter == "" || filter == "*" || filter == "*.*" {
		return true
	}
	matched, err := filepath.Match(filter, name)
	return err == nil && matched
}

func allowedLocalPath(target string) (string, error) {
	resolved, err := filepath.Abs(filepath.Clean(target))
	if err != nil {
		return "", errors.New("Local path is invalid.")
	}
	resolved, err = filepath.EvalSymlinks(resolved)
	if err != nil {
		return "", errors.New("Local path does not exist or cannot be resolved.")
	}
	roots := strings.Split(defaultString(os.Getenv("LOG_ALLOWED_ROOTS"), "/var/log,/data"), ",")
	for _, candidate := range roots {
		root, err := filepath.Abs(filepath.Clean(strings.TrimSpace(candidate)))
		if err != nil {
			continue
		}
		if realRoot, evalErr := filepath.EvalSymlinks(root); evalErr == nil {
			root = realRoot
		}
		if resolved == root || strings.HasPrefix(resolved, root+string(filepath.Separator)) {
			return resolved, nil
		}
	}
	return "", errors.New("Local path is outside the configured LOG_ALLOWED_ROOTS.")
}

func nullable(value string) any {
	if value == "" {
		return nil
	}
	return value
}
func nullableInt(value int) any {
	if value == 0 {
		return nil
	}
	return value
}
func boolInt(value bool) int {
	if value {
		return 1
	}
	return 0
}
func defaultString(value, fallback string) string {
	if value == "" {
		return fallback
	}
	return value
}
func defaultInt(value, fallback int) int {
	if value == 0 {
		return fallback
	}
	return value
}
func formatSize(size int64) string {
	if size > 1024*1024 {
		return fmt.Sprintf("%.1f MB", float64(size)/(1024*1024))
	}
	return fmt.Sprintf("%.1f KB", float64(size)/1024)
}

func sftpQuote(value string) string {
	return `"` + strings.NewReplacer(`\`, `\\`, `"`, `\"`).Replace(value) + `"`
}

func parseRemoteTree(root string, output []byte) []map[string]any {
	rootNode := map[string]any{"id": "ssh-" + hex.EncodeToString([]byte(root)), "name": root, "path": root, "type": "folder", "isOpen": true, "children": []map[string]any{}}
	nodes := map[string]map[string]any{path.Clean(root): rootNode}
	records := strings.Split(string(output), "\x00")
	for _, record := range records {
		fields := strings.SplitN(record, "\t", 4)
		if len(fields) != 4 {
			continue
		}
		entryPath := path.Clean(fields[3])
		if entryPath == path.Clean(root) || !strings.HasPrefix(entryPath, strings.TrimSuffix(path.Clean(root), "/")+"/") {
			continue
		}
		size, _ := strconv.ParseInt(fields[1], 10, 64)
		modified, _ := strconv.ParseFloat(fields[2], 64)
		isDir := fields[0] == "d"
		node := map[string]any{"id": "ssh-" + hex.EncodeToString([]byte(entryPath)), "name": path.Base(entryPath), "path": entryPath,
			"modifiedAt": int64(modified * 1000)}
		if isDir {
			node["type"], node["isOpen"], node["children"] = "folder", pathDepth(entryPath)-pathDepth(root) < 2, []map[string]any{}
		} else {
			node["type"], node["size"], node["fileId"] = "file", formatSize(size), entryPath
		}
		nodes[entryPath] = node
	}
	paths := make([]string, 0, len(nodes)-1)
	for entry := range nodes {
		if entry != path.Clean(root) {
			paths = append(paths, entry)
		}
	}
	sort.Slice(paths, func(i, j int) bool {
		di, dj := pathDepth(paths[i]), pathDepth(paths[j])
		if di == dj {
			return paths[i] < paths[j]
		}
		return di < dj
	})
	for _, entry := range paths {
		parent := path.Dir(entry)
		parentNode, ok := nodes[parent]
		if !ok {
			continue
		}
		children, ok := parentNode["children"].([]map[string]any)
		if ok {
			parentNode["children"] = append(children, nodes[entry])
		}
	}
	return []map[string]any{rootNode}
}

func pathDepth(value string) int {
	depth := 0
	for _, part := range strings.Split(strings.Trim(value, "/"), "/") {
		if part != "" {
			depth++
		}
	}
	return depth
}
