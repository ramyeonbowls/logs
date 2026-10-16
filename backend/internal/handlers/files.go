package handlers

import (
	"encoding/json"
	"net/http"

	"logpulse-backend/internal/store"
)

// HandleGetFileTree returns the current mounted directory structure
func HandleGetFileTree(w http.ResponseWriter, r *http.Request) {
	s := store.GlobalStore

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(s.FileTree)
}
