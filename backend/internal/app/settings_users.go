package app

import (
	"database/sql"
	"net/http"
	"strings"
	"time"
)

type settingsPayload struct {
	DefaultGrammar string `json:"defaultGrammar"`
	Timezone       string `json:"timezone"`
	MaxBufferSize  int    `json:"maxBufferSize"`
}

func (a *App) settings(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)
	if r.Method == http.MethodGet {
		var value settingsPayload
		err := a.db.QueryRowContext(r.Context(), `SELECT default_grammar,timezone,max_buffer_size FROM user_settings WHERE user_id=?`, user.ID).
			Scan(&value.DefaultGrammar, &value.Timezone, &value.MaxBufferSize)
		if err == sql.ErrNoRows {
			err = a.db.QueryRowContext(r.Context(), `SELECT default_grammar,timezone,max_buffer_size FROM app_settings WHERE id=1`).
				Scan(&value.DefaultGrammar, &value.Timezone, &value.MaxBufferSize)
		}
		if err != nil {
			jsonError(w, http.StatusInternalServerError, "Could not load settings.")
			return
		}
		jsonResponse(w, http.StatusOK, value)
		return
	}
	var value settingsPayload
	if err := decodeJSON(w, r, &value); err != nil {
		jsonError(w, http.StatusBadRequest, "Invalid settings payload.")
		return
	}
	value.DefaultGrammar = defaultString(value.DefaultGrammar, "raw_ansi")
	value.Timezone = defaultString(value.Timezone, "utc")
	if value.MaxBufferSize < 16 || value.MaxBufferSize > 4096 {
		jsonError(w, http.StatusBadRequest, "Max buffer size must be between 16 and 4096 MB.")
		return
	}
	now := time.Now().UTC().Format(time.RFC3339Nano)
	_, err := a.db.ExecContext(r.Context(), `INSERT INTO user_settings(user_id,default_grammar,timezone,max_buffer_size,updated_at)
		VALUES(?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET default_grammar=excluded.default_grammar,
		timezone=excluded.timezone,max_buffer_size=excluded.max_buffer_size,updated_at=excluded.updated_at`,
		user.ID, value.DefaultGrammar, value.Timezone, value.MaxBufferSize, now)
	if err != nil {
		jsonError(w, http.StatusInternalServerError, "Could not save settings.")
		return
	}
	jsonResponse(w, http.StatusOK, map[string]any{"success": true, "settings": value})
}

func (a *App) users(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		rows, err := a.db.QueryContext(r.Context(), `SELECT id,username,email,name,role,is_active,created_at,updated_at FROM users ORDER BY created_at`)
		if err != nil {
			jsonError(w, http.StatusInternalServerError, "Could not load users.")
			return
		}
		defer rows.Close()
		result := make([]map[string]any, 0)
		for rows.Next() {
			var id, username, email, name, role, created, updated string
			var active int
			if err := rows.Scan(&id, &username, &email, &name, &role, &active, &created, &updated); err != nil {
				jsonError(w, http.StatusInternalServerError, "Could not load users.")
				return
			}
			result = append(result, map[string]any{"id": id, "username": username, "email": email, "name": name, "role": role,
				"is_active": active != 0, "created_at": created, "updated_at": updated})
		}
		jsonResponse(w, http.StatusOK, result)
	case http.MethodPost:
		var body struct {
			Username string `json:"username"`
			Email    string `json:"email"`
			Password string `json:"password"`
			Name     string `json:"name"`
			Role     string `json:"role"`
		}
		if err := decodeJSON(w, r, &body); err != nil {
			jsonError(w, http.StatusBadRequest, "Invalid user payload.")
			return
		}
		body.Username, body.Email = strings.TrimSpace(body.Username), strings.TrimSpace(body.Email)
		if body.Username == "" || len(body.Password) < 12 {
			jsonError(w, http.StatusBadRequest, "Username and a password of at least 12 characters are required.")
			return
		}
		if body.Email == "" {
			body.Email = body.Username
			if !strings.Contains(body.Email, "@") {
				body.Email += "@logpulse.internal"
			}
		}
		if body.Name == "" {
			body.Name = body.Username
		}
		if body.Role == "" {
			body.Role = "Site Reliability Engineer (L5)"
		}
		hash, err := hashPassword(body.Password)
		if err != nil {
			jsonError(w, http.StatusInternalServerError, "Could not hash password.")
			return
		}
		now, id := time.Now().UTC().Format(time.RFC3339Nano), randomID("usr")
		_, err = a.db.ExecContext(r.Context(), `INSERT INTO users(id,username,email,password_hash,name,role,is_active,created_at,updated_at) VALUES(?,?,?,?,?,?,1,?,?)`,
			id, body.Username, body.Email, hash, body.Name, body.Role, now, now)
		if err != nil {
			jsonError(w, http.StatusConflict, "Username or email already exists.")
			return
		}
		jsonResponse(w, http.StatusCreated, map[string]any{"success": true, "user": map[string]any{"id": id, "username": body.Username, "email": body.Email, "name": body.Name, "role": body.Role}})
	case http.MethodPut:
		id := r.PathValue("id")
		var body struct {
			Name     string `json:"name"`
			Email    string `json:"email"`
			Role     string `json:"role"`
			Password string `json:"password"`
			IsActive *bool  `json:"is_active"`
		}
		if err := decodeJSON(w, r, &body); err != nil {
			jsonError(w, http.StatusBadRequest, "Invalid user payload.")
			return
		}
		var existing struct {
			Name, Email, Role, PasswordHash string
			IsActive                        int
		}
		err := a.db.QueryRowContext(r.Context(), `SELECT name,email,role,password_hash,is_active FROM users WHERE id=?`, id).
			Scan(&existing.Name, &existing.Email, &existing.Role, &existing.PasswordHash, &existing.IsActive)
		if err == sql.ErrNoRows {
			jsonError(w, http.StatusNotFound, "User not found.")
			return
		}
		if err != nil {
			jsonError(w, http.StatusInternalServerError, "Could not load user.")
			return
		}
		if body.Password != "" {
			if len(body.Password) < 12 {
				jsonError(w, http.StatusBadRequest, "Password must be at least 12 characters.")
				return
			}
			existing.PasswordHash, err = hashPassword(body.Password)
			if err != nil {
				jsonError(w, http.StatusInternalServerError, "Could not hash password.")
				return
			}
		}
		active := existing.IsActive
		if body.IsActive != nil {
			active = boolInt(*body.IsActive)
		}
		_, err = a.db.ExecContext(r.Context(), `UPDATE users SET name=?,email=?,role=?,password_hash=?,is_active=?,updated_at=? WHERE id=?`,
			defaultString(body.Name, existing.Name), defaultString(body.Email, existing.Email), defaultString(body.Role, existing.Role), existing.PasswordHash, active, time.Now().UTC().Format(time.RFC3339Nano), id)
		if err != nil {
			jsonError(w, http.StatusConflict, "Could not update user.")
			return
		}
		_, _ = a.db.ExecContext(r.Context(), `DELETE FROM sessions WHERE user_id=?`, id)
		jsonResponse(w, http.StatusOK, map[string]bool{"success": true})
	case http.MethodDelete:
		id := r.PathValue("id")
		if id == currentUser(r).ID {
			jsonError(w, http.StatusBadRequest, "You cannot delete your own account.")
			return
		}
		result, err := a.db.ExecContext(r.Context(), `DELETE FROM users WHERE id=?`, id)
		if err != nil {
			jsonError(w, http.StatusInternalServerError, "Could not delete user.")
			return
		}
		count, _ := result.RowsAffected()
		if count == 0 {
			jsonError(w, http.StatusNotFound, "User not found.")
			return
		}
		jsonResponse(w, http.StatusOK, map[string]any{"success": true, "id": id})
	default:
		jsonError(w, http.StatusMethodNotAllowed, "Method not allowed.")
	}
}
