package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"logpulse-backend/internal/handlers"
)

// withCORS adds CORS headers for frontend integration
func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// withLogger logs incoming HTTP requests
func withLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		log.Printf("[%s] %s %s - %v", r.Method, r.URL.Path, r.RemoteAddr, time.Since(start))
	})
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	mux := http.NewServeMux()

	// Healthcheck
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, "{\"status\":\"healthy\",\"engine\":\"LogPulse Go 1.25 Core\",\"uptime\":\"ok\"}")
	})

	// 1. Auth routes
	mux.HandleFunc("POST /api/auth/login", handlers.HandleLogin)
	mux.HandleFunc("GET /api/auth/me", handlers.HandleMe)

	// 2. SSH connection routes
	mux.HandleFunc("POST /api/ssh/test", handlers.HandleSSHTest)
	mux.HandleFunc("GET /api/ssh/connections", handlers.HandleGetSSHConnections)
	mux.HandleFunc("POST /api/ssh/connect", handlers.HandleSaveSSHConnection)

	// 3. File tree explorer routes
	mux.HandleFunc("GET /api/files/tree", handlers.HandleGetFileTree)

	// 4. Log stream, query & tailing routes
	mux.HandleFunc("GET /api/logs", handlers.HandleGetLogs)
	mux.HandleFunc("GET /api/logs/stream", handlers.HandleLogsStream)
	mux.HandleFunc("GET /api/logs/download", handlers.HandleDownloadLog)

	// 5. Telemetry & settings routes
	mux.HandleFunc("GET /api/metrics", handlers.HandleGetMetrics)
	mux.HandleFunc("GET /api/settings", handlers.HandleSettings)
	mux.HandleFunc("POST /api/settings", handlers.HandleSettings)

	// Wrap middleware
	handler := withLogger(withCORS(mux))

	server := &http.Server{
		Addr:         ":" + port,
		Handler:      handler,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 60 * time.Second, // Long timeout for SSE streaming
		IdleTimeout:  120 * time.Second,
	}

	// Graceful shutdown listener
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	go func() {
		log.Printf("==================================================")
		log.Printf("🚀 LogPulse Observability Go 1.25 Backend")
		log.Printf("⚡ Listening on http://0.0.0.0:%s", port)
		log.Printf("📡 Endpoints: /api/auth, /api/ssh, /api/files/tree, /api/logs/stream")
		log.Printf("==================================================")
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
	}()

	<-stop
	log.Println("Shutting down LogPulse Go backend gracefully...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Fatalf("Forced server shutdown: %v", err)
	}

	log.Println("LogPulse Go backend stopped.")
}
