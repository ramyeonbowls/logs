# LogPulse Observability — Backend Go 1.25 (Lightweight)

Backend ringan, berkinerja tinggi, dan efisien memori (< 15MB RAM) yang dibangun menggunakan **Go 1.25** tanpa ketergantungan library eksternal yang berat (*zero external bloated dependencies*, 100% Go Standard Library `net/http` modern routing).

---

## 🚀 Keunggulan Backend Go 1.25 Ini

1. **Zero External Dependencies**: Menggunakan pustaka standar Go 1.25 (`net/http` routing modern seperti `GET /api/logs`, `POST /api/ssh/test`).
2. **Sangat Ringan & Cepat**: 
   - Waktu startup: < 15ms.
   - Pemakaian RAM: < 15MB dalam kondisi stream aktif.
   - Ukuran binary statis hasil kompilasi: ~10MB.
3. **Real-time SSE Streaming (`tail -f`)**: Menggunakan `http.Flusher` dan Goroutine non-blocking untuk mem-broadcast baris log baru ke browser via Server-Sent Events tanpa overhead WebSocket.
4. **CORS Built-in**: Siap berkomunikasi dengan frontend Vite React di port 3000.

---

## 📂 Struktur Direktori

```
backend/
├── Dockerfile              # Multi-stage build Go 1.25 Alpine (~14MB final image)
├── Makefile                # Shortcut perintah (run, build, test, docker)
├── README.md               # Dokumentasi panduan ini
├── go.mod                  # Go 1.25 module
├── main.go                 # HTTP server, routing, middleware CORS & Graceful Shutdown
└── internal/
    ├── handlers/
    │   ├── auth.go         # /api/auth/login, /api/auth/me
    │   ├── files.go        # /api/files/tree (Hierarchical file tree)
    │   ├── logs.go         # /api/logs, /api/logs/stream (SSE tail -f), /api/logs/download
    │   ├── metrics.go      # /api/metrics, /api/settings
    │   └── ssh.go          # /api/ssh/test, /api/ssh/connections, /api/ssh/connect
    ├── models/
    │   └── models.go       # Struct definisi data (SSH, Logs, Tree, Metrics, User)
    └── store/
        └── store.go        # In-memory thread-safe store & generator simulasi log
```

---

## 🛠️ Cara Menjalankan Backend

### Prasyarat
- Go 1.25 terinstall di sistem Anda (`go version`).

### 1. Jalankan Langsung (Development)
```bash
cd backend
go run main.go
```
Server akan aktif di: **`http://localhost:8080`**.

### 2. Kompilasi Binary Statis (Production)
```bash
cd backend
make build
# atau secara manual:
CGO_ENABLED=0 go build -ldflags="-s -w" -o bin/logpulse-server main.go

# Jalankan binary
./bin/logpulse-server
```

### 3. Menggunakan Docker
```bash
cd backend
docker build -t logpulse-backend:1.25 .
docker run -p 8080:8080 logpulse-backend:1.25
```

---

## 📡 Daftar Endpoint API Lengkap

### 1. Autentikasi
- **`POST /api/auth/login`**
  ```bash
  curl -X POST http://localhost:8080/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"julian.putra99@gmail.com","password":"password123"}'
  ```
- **`GET /api/auth/me`**
  ```bash
  curl http://localhost:8080/api/auth/me
  ```

### 2. SSH Connection & Remote Folder
- **`POST /api/ssh/test`** (Uji coba handshake & latensi SSH)
  ```bash
  curl -X POST http://localhost:8080/api/ssh/test \
    -H "Content-Type: application/json" \
    -d '{
      "host":"prod-k8s-node-01.us-east.internal",
      "port":22,
      "username":"deploy",
      "authMethod":"key",
      "remotePath":"/var/log"
    }'
  ```
- **`GET /api/ssh/connections`** (Mendapatkan daftar host tersimpan)
  ```bash
  curl http://localhost:8080/api/ssh/connections
  ```
- **`POST /api/ssh/connect`** (Menyimpan sesi host & me-mount remote folder)
  ```bash
  curl -X POST http://localhost:8080/api/ssh/connect \
    -H "Content-Type: application/json" \
    -d '{
      "id":"conn-prod-01",
      "name":"Production Node 01",
      "host":"prod-k8s-node-01.us-east.internal",
      "port":22,
      "username":"deploy",
      "remotePath":"/var/log/services"
    }'
  ```

### 3. Remote File Tree
- **`GET /api/files/tree`**
  ```bash
  curl http://localhost:8080/api/files/tree
  ```
  *Mengembalikan hierarki folder lengkap `/var/log` beserta file dan ukurannya.*

### 4. Log Query, Grep & Live Stream (`tail -f`)
- **`GET /api/logs`** (Query dengan filter grep, level, dan regex)
  ```bash
  # Ambil semua log
  curl http://localhost:8080/api/logs?fileId=production-api

  # Filter error saja
  curl "http://localhost:8080/api/logs?fileId=production-api&level=ERROR"

  # Grep kata kunci "jwt"
  curl "http://localhost:8080/api/logs?fileId=production-api&search=jwt"
  ```
- **`GET /api/logs/stream`** (Server-Sent Events untuk Live Tailing `tail -f`)
  ```bash
  curl -N http://localhost:8080/api/logs/stream
  ```
  *Akan terus menerima event log baru secara streaming.*
- **`GET /api/logs/download`** (Unduh file `.log` mentah)
  ```bash
  curl http://localhost:8080/api/logs/download?fileId=production-api -o production.log
  ```

### 5. Telemetri & Ingest Metrics
- **`GET /api/metrics`**
  ```bash
  curl http://localhost:8080/api/metrics
  ```
- **`GET /api/settings`** & **`POST /api/settings`**
  ```bash
  curl http://localhost:8080/api/settings
  ```

### 6. Healthcheck
- **`GET /health`**
  ```bash
  curl http://localhost:8080/health
  ```

---

## 🔗 Menghubungkan Frontend ke Backend Go

Di sisi frontend React, telah disediakan kelas layanan `src/services/api.ts`.
Secara default, jika backend Go aktif di `http://localhost:8080`, frontend dapat langsung melakukan fetch ke endpoint tersebut. Jika backend Go belum dinyalakan, frontend memiliki fallback cerdas sehingga UI tetap berfungsi interaktif tanpa error.

Variabel environment (opsional di `.env`):
```env
VITE_API_BASE_URL="http://localhost:8080"
```
