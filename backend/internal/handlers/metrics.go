package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"logpulse-backend/internal/models"
	"logpulse-backend/internal/store"
)

// HandleGetMetrics returns telemetry rates, EPS throughput, and error ratio
func HandleGetMetrics(w http.ResponseWriter, r *http.Request) {
	resp := models.MetricsResponse{
		IngestRateEPS: 2480,
		ErrorRatio:    0.27,
		LatencyMs:     1.4,
		P99LatencyMs:  4.2,
		MemoryUsedMB:  48.2,
		MemoryMaxMB:   256.0,
		TotalEvents:   124850,
		Heatmap:       []int{42, 50, 48, 65, 78, 60, 45, 88, 92, 110, 85, 90, 75, 70, 82, 95, 68, 72, 80, 89, 94, 102, 98, 85},
		Timestamp:     time.Now().UTC(),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// HandleSettings retrieves or updates parser configurations
func HandleSettings(w http.ResponseWriter, r *http.Request) {
	s := store.GlobalStore

	if r.Method == http.MethodPost || r.Method == http.MethodPut {
		var req models.Settings
		if err := json.NewDecoder(r.Body).Decode(&req); err == nil {
			s.Settings = req
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(s.Settings)
}
