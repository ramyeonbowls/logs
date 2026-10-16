package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"logpulse-backend/internal/models"
)

// HandleLogin processes user credentials and issues an observability session
func HandleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req models.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	username := strings.TrimSpace(req.Username)
	if username == "" {
		http.Error(w, "Username or email is required", http.StatusBadRequest)
		return
	}

	displayName := username
	if strings.Contains(username, "@") {
		displayName = strings.Split(username, "@")[0]
	}

	resp := models.LoginResponse{
		Success: true,
		Token:   "eyJpaGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.logpulse.observability.token",
		User: models.User{
			ID:       "usr-99",
			Username: username,
			Email:    username,
			Name:     strings.Title(displayName),
			Role:     "Site Reliability Engineer (L5)",
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func HandleMe(w http.ResponseWriter, r *http.Request) {
	resp := models.User{
		ID:       "usr-99",
		Username: "julian.putra99@gmail.com",
		Email:    "julian.putra99@gmail.com",
		Name:     "Julian Putra",
		Role:     "Site Reliability Engineer (L5)",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}
