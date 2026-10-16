package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"strings"

	"logpulse-backend/internal/models"
	"logpulse-backend/internal/store"
)

// HandleGetLogs queries log lines with pagination, severity level filtering, and regex grep
func HandleGetLogs(w http.ResponseWriter, r *http.Request) {
	fileID := r.URL.Query().Get("fileId")
	if fileID == "" {
		fileID = "production-api"
	}

	searchQuery := r.URL.Query().Get("search")
	levelFilter := strings.ToUpper(r.URL.Query().Get("level"))
	isCaseSensitive := r.URL.Query().Get("caseSensitive") == "true"
	isRegex := r.URL.Query().Get("isRegex") == "true"

	s := store.GlobalStore
	file, exists := s.Files[fileID]
	if !exists {
		// Fallback to first available file
		for _, f := range s.Files {
			file = f
			break
		}
	}

	if file == nil {
		http.Error(w, "Log file not found", http.StatusNotFound)
		return
	}

	var rx *regexp.Regexp
	if searchQuery != "" {
		pattern := searchQuery
		if !isRegex {
			pattern = regexp.QuoteMeta(searchQuery)
		}
		if !isCaseSensitive {
			pattern = "(?i)" + pattern
		}
		var err error
		rx, err = regexp.Compile(pattern)
		if err != nil {
			// Fallback to plain substring search
			rx = nil
		}
	}

	var filteredLines []models.LogLine
	for _, line := range file.Lines {
		// Level filter check
		if levelFilter != "" && line.Level != levelFilter {
			continue
		}

		// Search grep check
		if searchQuery != "" {
			fullText := fmt.Sprintf("%d %s %s %s %s %s %s", line.LineNumber, line.Timestamp, line.Level, line.Service, line.TraceID, line.Message, strings.Join(line.StackTrace, " "))
			if rx != nil {
				if !rx.MatchString(fullText) {
					continue
				}
			} else {
				if !isCaseSensitive {
					if !strings.Contains(strings.ToLower(fullText), strings.ToLower(searchQuery)) {
						continue
					}
				} else {
					if !strings.Contains(fullText, searchQuery) {
						continue
					}
				}
			}
		}

		filteredLines = append(filteredLines, line)
	}

	resp := models.LogQueryResponse{
		FileID:     file.ID,
		Filename:   file.Filename,
		TotalLines: file.LineCount,
		Filtered:   len(filteredLines),
		MatchCount: len(filteredLines),
		Stats:      file.Stats,
		Lines:      filteredLines,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// HandleLogsStream establishes a Server-Sent Events (SSE) connection to push real-time microservices logs (TAIL -F)
func HandleLogsStream(w http.ResponseWriter, r *http.Request) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming unsupported on this connection", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	s := store.GlobalStore
	ch := s.Subscribe()
	defer s.Unsubscribe(ch)

	// Send initial ping event
	fmt.Fprintf(w, "event: connected\ndata: {\"status\":\"streaming\",\"mode\":\"tail -f\"}\n\n")
	flusher.Flush()

	notify := r.Context().Done()
	for {
		select {
		case <-notify:
			return
		case logLine, ok := <-ch:
			if !ok {
				return
			}
			data, err := json.Marshal(logLine)
			if err == nil {
				fmt.Fprintf(w, "event: log\ndata: %s\n\n", data)
				flusher.Flush()
			}
		}
	}
}

// HandleDownloadLog downloads raw plain text log file
func HandleDownloadLog(w http.ResponseWriter, r *http.Request) {
	fileID := r.URL.Query().Get("fileId")
	if fileID == "" {
		fileID = "production-api"
	}

	s := store.GlobalStore
	file, exists := s.Files[fileID]
	if !exists {
		http.Error(w, "File not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", file.Filename))
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")

	for _, line := range file.Lines {
		fmt.Fprintf(w, "%d %s [%s] [%s] %s\n", line.LineNumber, line.Timestamp, line.Level, line.Service, line.Message)
		for _, stack := range line.StackTrace {
			fmt.Fprintf(w, "    %s\n", stack)
		}
	}
}
