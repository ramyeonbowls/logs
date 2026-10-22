package handlers

import (
	"encoding/json"
	"net/http"
	"os"
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
	password := strings.TrimSpace(req.Password)

	if username == "" || password == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"message": "Username and password are required.",
		})
		return
	}

	validUsername := os.Getenv("APP_USERNAME")
	validPassword := os.Getenv("APP_PASSWORD")
	if validUsername == "" {
		validUsername = "admin"
	}
	if validPassword == "" {
		validPassword = "admin"
	}

	if username != validUsername || password != validPassword {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"message": "Invalid username or password.",
		})
		return
	}

	displayName := username
	if strings.Contains(username, "@") {
		displayName = strings.Split(username, "@")[0]
	}
	// Capitalize first letter
	if len(displayName) > 0 {
		displayName = strings.ToUpper(displayName[:1]) + displayName[1:]
	}

	resp := models.LoginResponse{
		Success: true,
		Token:   "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.logpulse.observability.token",
		User: models.User{
			ID:       "usr-99",
			Username: username,
			Email:    username,
			Name:     displayName,
			Role:     "Site Reliability Engineer (L5)",
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func HandleMe(w http.ResponseWriter, r *http.Request) {
	username := os.Getenv("APP_USERNAME")
	if username == "" {
		username = "admin"
	}
	displayName := username
	if strings.Contains(username, "@") {
		displayName = strings.Split(username, "@")[0]
	}
	if len(displayName) > 0 {
		displayName = strings.ToUpper(displayName[:1]) + displayName[1:]
	}

	resp := models.User{
		ID:       "usr-99",
		Username: username,
		Email:    username,
		Name:     displayName,
		Role:     "Site Reliability Engineer (L5)",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}
