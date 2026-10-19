package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"logpulse-backend/internal/models"
	"logpulse-backend/internal/store"
)

// HandleSSHTest reports that SSH is not implemented by the standalone Go backend.
func HandleSSHTest(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	http.Error(w, "SSH/SFTP is available through the integrated Node server, not this Go backend.", http.StatusNotImplemented)
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
		"message":    "Connection saved. SSH/SFTP mounting is not implemented in this Go backend.",
	})
}
