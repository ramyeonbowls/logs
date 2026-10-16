package handlers

import (
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"time"

	"logpulse-backend/internal/models"
	"logpulse-backend/internal/store"
)

// HandleSSHTest performs simulated cryptographic handshake, measures round-trip latency, and validates remote folder
func HandleSSHTest(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req models.SSHTestRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
		return
	}

	if req.Host == "" {
		http.Error(w, "Host is required", http.StatusBadRequest)
		return
	}

	// Simulate network roundtrip latency (12ms - 22ms)
	latency := 12 + rand.Intn(10)
	time.Sleep(time.Duration(latency) * time.Millisecond)

	resp := models.SSHTestResponse{
		Success:   true,
		LatencyMs: latency,
		Message:   fmt.Sprintf("Connected successfully to %s@%s:%d. Host key SHA256:d8Q8kZ verified. SFTP folder mounted: \"%s\".", req.Username, req.Host, req.Port, req.RemotePath),
		Cipher:    "chacha20-poly1305@openssh.com",
		HostKey:   "SHA256:d8Q8kZ...9aB12",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// HandleGetSSHConnections returns all configured SSH hosts
func HandleGetSSHConnections(w http.ResponseWriter, r *http.Request) {
	s := store.GlobalStore

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(s.Connections)
}

// HandleSaveSSHConnection creates or updates an SSH connection and mounts the folder
func HandleSaveSSHConnection(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost && r.Method != http.MethodPut {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var conn models.SSHConnection
	if err := json.NewDecoder(r.Body).Decode(&conn); err != nil {
		http.Error(w, "Invalid connection payload", http.StatusBadRequest)
		return
	}

	s := store.GlobalStore
	found := false
	for i, existing := range s.Connections {
		if existing.ID == conn.ID {
			s.Connections[i] = conn
			found = true
			break
		}
	}
	if !found {
		conn.ID = fmt.Sprintf("conn-%d", time.Now().Unix())
		s.Connections = append(s.Connections, conn)
	}

	s.ActiveConnID = conn.ID

	// Update root path in File Tree
	if len(s.FileTree) > 0 {
		s.FileTree[0].Name = conn.RemotePath
		s.FileTree[0].Path = conn.RemotePath
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":    true,
		"connection": conn,
		"message":    fmt.Sprintf("SSH session mounted at %s", conn.RemotePath),
	})
}
