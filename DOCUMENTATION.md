# Dokumentasi Lengkap Fitur & Fungsi — LogPulse Observability

Dokumentasi ini mencakup seluruh fitur, fungsi komponen, tata kelola data, dan kapabilitas interaktif yang ada di dalam aplikasi **LogPulse Observability**.

---

## Daftar Isi
1. [Ringkasan Arsitektur & Teknologi](#1-ringkasan-arsitektur--teknologi)
2. [Fitur 1: Autentikasi & Identity Management (LoginScreen)](#2-fitur-1-autentikasi--identity-management-loginscreen)
3. [Fitur 2: Remote SSH Connection Manager (SSHConnectionModal)](#3-fitur-2-remote-ssh-connection-manager-sshconnectionmodal)
4. [Fitur 3: Remote File Tree Explorer (Sidebar)](#4-fitur-3-remote-file-tree-explorer-sidebar)
5. [Fitur 4: Observability Terminal Log Stream (LogStreamViewer)](#5-fitur-4-observability-terminal-log-stream-logstreamviewer)
6. [Fitur 5: Real-Time Live Tailing Engine (TAIL -F & FOLLOW TAIL)](#6-fitur-5-real-time-live-tailing-engine-tail--f--follow-tail)
7. [Fitur 6: Search, Grep & Regex Filtering Engine (LogViewerToolbar)](#7-fitur-6-search-grep--regex-filtering-engine-logviewertoolbar)
8. [Fitur 7: Highlight Level & Quick Status Bar (LogStatusBar)](#8-fitur-7-highlight-level--quick-status-bar-logstatusbar)
9. [Fitur 8: IDE Footer & Telemetry Status Bar (BottomStatusBar)](#9-fitur-8-ide-footer--telemetry-status-bar-bottomstatusbar)
10. [Fitur 9: Modul Analisis & Telemetri Tambahan](#10-fitur-9-modul-analisis--telemetri-tambahan)
    - [9.1 File Ingest Metrics Modal](#91-file-ingest-metrics-modal-metricsviewmodal)
    - [9.2 Grep Filters & Regex Presets Modal](#92-grep-filters--regex-presets-modal-grepviewmodal)
    - [9.3 Server Directory Explorer Modal](#93-server-directory-explorer-modal-directoryviewmodal)
    - [9.4 Log Parser & Ingest Settings Modal](#94-log-parser--ingest-settings-modal-settingsmodal)
    - [9.5 Jump to Line Modal](#95-jump-to-line-modal-jumpmodal)
11. [Fitur 10: Responsivitas Multi-Device (Mobile, Tablet, Desktop)](#11-fitur-10-responsivitas-multi-device-mobile-tablet-desktop)

---

## 1. Ringkasan Arsitektur & Teknologi

- **Frontend Core**: React 19 dengan TypeScript (`tsx`).
- **Styling**: Tailwind CSS v4 dengan palet gelap modern, efek glow cyan, dan styling monospace terminal.
- **Typography**: 
  - Teks umum: `Plus Jakarta Sans`
  - Teks terminal & telemetri: `JetBrains Mono` dengan angka tabular (`tabular-nums`).
- **Ikon**: Lucide React (`lucide-react`).
- **Build Tool**: Vite dengan modul HMR teroptimasi.

---

## 2. Fitur 1: Autentikasi & Identity Management (`LoginScreen`)

Komponen: `src/components/LoginScreen.tsx`

Tampilan autentikasi developer/SRE dengan latar belakang vignette bertema *cyber-observability*.

### Fungsi & Kemampuan:
- **Form Input Username / Email**:
  - Validasi teks wajib (`required`).
  - Dilengkapi ikon identitas user.
- **Form Input Password**:
  - Masking karakter password.
  - Tombol toggle show/hide kata sandi (`Eye` / `EyeOff`).
  - Tautan *Forgot password?* yang memicu dialog notifikasi OIDC / SSO audit.
- **Opsi "Keep signed in"**: Checkbox interaktif untuk persistensi sesi masuk.
- **Keyboard Shortcut**: Menekan tombol `Enter` pada form langsung mengeksekusi *Sign In to Workspace*.
- **Instant Demo Sign-In (Prefill Otomatis)**:
  - Tombol **Julian (Lead SRE)**: Mengisi email `julian.putra99@gmail.com` dan kredensial developer.
  - Tombol **On-Call Tier 1**: Mengisi kredensial operator darurat `ops-oncall@logpulse.internal`.
- **Navigasi Layar Fleksibel**:
  - Tombol *Skip to Log Viewer Screen* untuk beralih langsung ke workspace observability.
  - Profil pengguna dapat melakukan *Sign Out* kapan saja dari header dropdown untuk kembali ke halaman login.

---

## 3. Fitur 2: Remote SSH Connection Manager (`SSHConnectionModal`)

Komponen: `src/components/SSHConnectionModal.tsx`  
Tipe Data: `src/types/ssh.ts`

Memungkinkan pengguna mengonfigurasi koneksi SSH jarak jauh ke server atau container Kubernetes untuk me-mount folder log secara dinamis.

### Fungsi & Kemampuan:
- **Preset Server Cepat**:
  - *Production Node 01 (US-East)*: `prod-k8s-node-01.us-east.internal:22`
  - *Staging Cluster 02*: `stage-cluster-02.internal:22`
  - *Frankfurt Edge Ingress*: `gw-fra-edge01.cloud.internal:2222`
- **Konfigurasi Host & Port**:
  - Input hostname atau alamat IP remote server.
  - Port SSH kustom (default: 22).
- **SSH Username & Target Mount Folder**:
  - Input user remote (`deploy`, `ubuntu`, `root`).
  - Target direktori log server yang ingin di-mount (misal `/var/log`, `/var/log/services`, `/opt/production/logs`).
- **Metode Autentikasi**:
  - **Public Key (Ed25519 / RSA)**: Menggunakan identity file terenkripsi (misal `~/.ssh/id_ed25519_prod_sre`).
  - **Password Authentication**: Input kata sandi terlindung.
- **Test SSH Handshake**:
  - Melakukan simulasi handshake kriptografis dengan remote server.
  - Mengukur latensi jaringan real-time (contoh: `14ms`).
  - Memverifikasi fingerprint host key (`SHA256:d8Q8kZ...9aB12`) dan status kesiapan SFTP subsystem.
- **Connect & Mount Folder**:
  - Menyimpan konfigurasi dan secara dinamis memperbarui struktur File Tree di sidebar dengan folder target server.

---

## 4. Fitur 3: Remote File Tree Explorer (`Sidebar`)

Komponen: `src/components/Sidebar.tsx`  
Struktur Data: `src/data/fileTreeData.ts`

Menggantikan navigasi menu statis menjadi **file explorer hierarkis lengkap** layaknya IDE profesional (VS Code / JetBrains).

### Fungsi & Kemampuan:
- **Status Kartu SSH Aktif**:
  - Indikator status koneksi (titik hijau berkedip saat terhubung).
  - Nama host, username, port, dan latensi ping real-time.
  - Indikator folder yang sedang di-mount (contoh: `Mounted: /var/log`).
  - Tombol **Config** untuk membuka modal pengaturan SSH.
- **Struktur Direktori Hirarkis & Kolapsibel**:
  - Folder dapat dibuka (*expand*) dan ditutup (*collapse*) dengan ikon `ChevronRight` / `ChevronDown` dan `FolderOpen` / `Folder`.
  - Contoh susunan direktori bawaan:
    - `📁 /var/log`
      - `📁 services` (`production-api-2025-05-18.log`, `app-error.log`, `worker.log`, `billing-service.log`)
      - `📁 nginx` (`nginx-access.log`, `nginx-error.log`)
      - `📁 containers` (`auth-service-pod`, `redis-replica`, `pgpool-cluster`)
      - `📁 systemd` (`syslog`, `journald.log`)
    - `📁 /opt/production/logs` (`audit-trail.log`, `clickhouse-buffer.log`)
- **Indikator Jumlah Berkas**: Setiap folder menampilkan badge kecil jumlah file di dalamnya.
- **Seleksi File Langsung**:
  - Mengklik file pada pohon direktori langsung memuat log ke layar utama viewer.
  - File yang aktif ditandai dengan background kontras dan garis aksen cyan kiri (`border-l-2 border-cyan-400`).
- **Refresh File Tree**: Tombol putar dengan animasi spin untuk memperbarui daftar berkas.
- **Memory Buffer Gauge**:
  - Widget penggunaan memori buffer file (`48.2 MB / 256 MB`).
  - Progress bar cyan interaktif.
  - Telemetri protokol SSH aktif (`SSH-2.0 · OpenSSH`, cipher `chacha20-poly1305`).
- **Mode Mobile Drawer**:
  - Pada layar ponsel/tablet (`< md`), sidebar otomatis berubah menjadi slide-over drawer dengan overlay backdrop blur yang dapat dibuka-tutup lewat tombol header.

---

## 5. Fitur 4: Observability Terminal Log Stream (`LogStreamViewer`)

Komponen: `src/components/LogStreamViewer.tsx`  
Data Bawaan: `src/data/sampleLogs.ts`

Jantung penampil log teks bergaya terminal developer dengan ketelitian warna ANSI tinggi.

### Fungsi & Kemampuan:
- **Line Numbering Gutter**:
  - Kolom nomor baris yang rapi di sebelah kiri (nomor 1040, 1041, ..., 1065+).
  - Lebar adaptif: lebih ramping di mobile (`w-10`) dan leluasa di desktop (`w-14`).
- **Pewarnaan Sintaks Berdasarkan Severity Level**:
  - `[FATAL]`: Badge merah tua mencolok dengan teks putih tebal.
  - `[ERROR]`: Teks merah terang (`text-rose-400`) dengan penanda tebal.
  - `[WARN]`: Teks kuning amber (`text-amber-400`).
  - `[DEBUG]`: Teks biru langit (`text-sky-400`).
  - `[INFO]`: Teks hijau zamrud (`text-emerald-400`).
- **Format Tagging Microservice**:
  - Penanda nama service: `[db-proxy/pgpool-01]`, `[cache-redis/redis-rep-01]`, `[api-gateway/gw-4a11]`, `[auth-service/auth-9df82]`, `[billing-worker/bill-x12]`.
- **Korelasi Distributed Tracing**:
  - Otomatis mengekstrak dan menyorot `trace_id=tr_...` dan `span_id=sp_...`.
- **Rendering Stack Trace Multi-Baris**:
  - Error seperti `TokenExpiredError: jwt expired` menampilkan call stack baris demi baris lengkap dengan indentasi internal:
    ```
    1049 TokenExpiredError: jwt expired
    1050    at /app/node_modules/jsonwebtoken/verify.js:152:21
    1051    at getSecret (/app/node_modules/jsonwebtoken/verify.js:90:14)
    1052    at Object.module.exports [as verify] (/app/src/security/jwt.ts:44:12)
    ```
- **Line Focus & Active Selection**:
  - Mengklik baris mana saja akan menyorot baris tersebut dengan bingkai cyan berpendar (`border-cyan-400/80 shadow-[0_0_12px_rgba(6,182,212,0.2)]`).
  - Mengupdate posisi baris aktif pada status bar bawah.
- **Search Highlighting Real-Time**:
  - Setiap kata yang cocok dengan query pencarian/grep otomatis disorot dengan warna kuning (`bg-amber-400 text-slate-950`).

---

## 6. Fitur 5: Real-Time Live Tailing Engine (`TAIL -F` & `FOLLOW TAIL`)

Diimplementasikan pada `App.tsx`, `HeaderBar.tsx`, `LogViewerToolbar.tsx`, dan `BottomStatusBar.tsx`.

### Fungsi & Kemampuan:
- **Simulasi Stream Log Produksi**:
  - Saat `TAIL -F` aktif, aplikasi secara otomatis menginjeksi log event microservices baru secara berkala (query database, redis cache hit/miss, health check HTTP/2, peringatan rate limit, token verification).
  - Counter nomor baris bertambah secara otomatis dan konsisten.
- **Toggle TAIL -F (Header & Footer)**:
  - Tombol indikator hidup/mati dengan titik hijau berpendar animasi denyut (*pulse*).
  - Dapat di-pause kapan saja untuk menganalisis log statis.
- **FOLLOW TAIL (Auto-Scroll Lock)**:
  - Tombol di toolbar yang mengunci posisi viewport ke baris paling bawah saat baris log baru masuk.
  - Jika pengguna melakukan *scroll up* manual atau melompat ke baris tertentu, auto-scroll otomatis dilepas agar pembacaan tidak terganggu.

---

## 7. Fitur 6: Search, Grep & Regex Filtering Engine (`LogViewerToolbar`)

Komponen: `src/components/LogViewerToolbar.tsx`

Bilah alat pemfilter dan pencarian teks yang responsif di atas area terminal.

### Fungsi & Kemampuan:
- **Pencarian Cepat / Grep Input**:
  - Filter teks instan (contoh pencarian: `jwt`, `401`, `timeout`, `error`, `pgpool`).
- **Navigasi Match**:
  - Menampilkan jumlah kecocokan (`X of Y matches` atau `X/Y`).
  - Tombol panah atas `↑` (Previous Match) dan bawah `↓` (Next Match) yang otomatis menggulirkan viewport ke lokasi baris yang cocok.
- **Modifier Pencarian**:
  - Tombol `Aa`: Toggle *Case Sensitive* (membedakan huruf besar/kecil).
  - Tombol `\b`: Toggle *Whole Word / Regex* (mencocokkan batas kata atau ekspresi reguler).
- **Toggle Text Wrapping (`Wrap`)**:
  - Mengubah mode antara *whitespace-pre* (satu baris panjang dengan scroll horizontal) dan *break-words* (pembungkusan baris agar terbaca penuh).
- **Pengatur Ukuran Font Terminal (`A-` / `A+`)**:
  - Mengubah ukuran font tampilan log secara dinamis dari rentang 10px hingga 18px.
- **Copy Log Stream**:
  - Menyalin seluruh baris log yang sedang difilter/ditampilkan ke clipboard sistem. Dilengkapi ikon centang hijau (`Check`) saat berhasil.
- **Download Raw Log File**:
  - Mengunduh teks log saat ini menjadi berkas `.log` fisik ke komputer pengguna.

---

## 8. Fitur 7: Highlight Level & Quick Status Bar (`LogStatusBar`)

Komponen: `src/components/LogStatusBar.tsx`

Bilah informasi file dan tombol filter cepat tingkat keparahan (*severity levels*).

### Fungsi & Kemampuan:
- **Ringkasan Metadata Berkas Aktif**:
  - Nama file log.
  - Ukuran file (contoh: `48.2 MB`).
  - Total jumlah baris (contoh: `124,850 lines`).
  - Format encoding: `Plain text / UTF-8`.
  - Format baris baru: `LF (Unix)`.
- **Tombol Filter Severity (Highlight Pills)**:
  - **`[ERROR] (34)`**: Memfilter hanya baris yang berstatus ERROR.
  - **`[WARN] (128)`**: Memfilter hanya baris peringatan WARN.
  - **`[INFO] (8,940)`**: Memfilter baris informasi INFO.
  - **`Clear`**: Menghapus filter level dan mengembalikan seluruh stream log.
- **Shortcut Navigasi Cepat**:
  - Tombol **`Top`**: Menggulirkan tampilan langsung ke baris pertama (Line 1).
  - Tombol **`End`**: Menggulirkan tampilan langsung ke baris ekor terbaru.

---

## 9. Fitur 8: IDE Footer & Telemetry Status Bar (`BottomStatusBar`)

Komponen: `src/components/BottomStatusBar.tsx`

Status bar bergaya editor IDE di bagian paling bawah layar.

### Fungsi & Kemampuan:
- **Status Streaming**: Indikator apakah proses tailing aktif (*Streaming*) atau dijeda (*Paused*).
- **Info File & Ukuran**: Menampilkan nama file aktif dan ukurannya.
- **Posisi Baris & Persentase**:
  - Menghitung persentase posisi baris aktif terhadap total baris (contoh: `Position: 1,048 / 124,850 (0.8%)`).
- **Format Line Endings**: Menampilkan `UTF-8 (LF)`.
- **Live Tailing Toggle**: Tombol cepat untuk menghidupkan/mematikan tailing stream langsung dari footer.

---

## 10. Fitur 9: Modul Analisis & Telemetri Tambahan

### 9.1 File Ingest Metrics Modal (`MetricsViewModal`)
- Menampilkan grafik telemetri metrik ingest real-time:
  - Ingest Rate (EPS / Events per Second).
  - Error Ratio (%).
  - Ingest Latency & p99 (ms).
  - Heatmap volume log 30 menit terakhir dengan bar berwarna (Cyan/Amber/Rose).
  - Distribusi throughput berdasarkan service (`api-gateway`, `db-proxy`, `auth-service`).

### 9.2 Grep Filters & Regex Presets Modal (`GrepViewModal`)
- Preset ekspresi reguler siap pakai untuk investigasi insiden produksi:
  - *JWT Token Expirations & Auth Errors* (`jwt|TokenExpiredError|401`)
  - *Postgres & DB Connection Pool Deadlocks* (`pgpool|Connection pool|deadlock`)
  - *HTTP 5xx Server Errors & Timeouts* (`500|502|504|timeout|Upstream`)
  - *Kafka & Message Broker Replicas* (`KafkaProducerError|Broker|RabbitMQ`)
  - *Rate Limiting & Throttling Warnings* (`Rate limiting|quota|429`)

### 9.3 Server Directory Explorer Modal (`DirectoryViewModal`)
- Penjelajah virtual sistem berkas server `/var/log`:
  - Mount points `/var/log/services`, `/var/log/nginx`, `/var/log/containers`.
  - Informasi rotasi log (retensi 14 hari, limit 500MB, kompresi gzip).

### 9.4 Log Parser & Ingest Settings Modal (`SettingsModal`)
- Pengaturan parser grammar: ANSI/Syslog, JSON Lines (Bunyan/Zap/Pino), Nginx Combined, Envoy Access.
- Konfigurasi zona waktu tampilan: UTC, Local System Time, Unix Epoch.
- Limit plafon memory buffer: 128 MB hingga 1,024 MB.

### 9.5 Jump to Line Modal (`JumpModal`)
- Dialog input nomor baris untuk langsung melompat ke nomor baris yang diinginkan (antara baris 1 hingga total baris berkas).

---

## 11. Fitur 10: Responsivitas Multi-Device (Mobile, Tablet, Desktop)

Aplikasi dirancang agar dapat dioperasikan secara ergonomis di berbagai ukuran layar:

| Fitur | Tampilan Desktop (`≥ 1024px`) | Tampilan Tablet (`768px - 1023px`) | Tampilan Mobile (`< 768px`) |
| :--- | :--- | :--- | :--- |
| **Sidebar / File Tree** | Menempel permanen di sisi kiri (`w-64` atau `w-72`). | Tetap terlihat atau dapat disesuaikan. | Menjadi **Slide-out Drawer** dengan tombol menu di header dan backdrop blur overlay. |
| **Header Bar** | Menampilkan breadcrumb path lengkap `/var/log/...` dengan badges ukuran & encoding. | Breadcrumb path disingkat. | Menampilkan badge nama file aktif ringkas (`FileText + filename`). |
| **Toolbar Grep & Search** | Satu baris panjang dengan label tombol lengkap. | Penyesuaian fleksibel antar kontrol. | Tombol aksi memiliki label ringkas (`TAIL`, ikon-only) dan horizontal touch-scroll. |
| **Status Bar Filter** | Teks keterangan lengkap (`HIGHLIGHT:` dan info baris). | Tampilan proporsional. | Tombol pill `[ERROR]`, `[WARN]`, `[INFO]` dapat di-swipe secara horizontal tanpa merusak layout. |
| **Terminal Gutter** | Gutter nomor baris standar (`w-14`). | Gutter standar. | Gutter lebih ramping (`w-10`) untuk memaksimalkan ruang baca teks log. |
| **Modal Dialogs (SSH, dll)** | Grid multi-kolom lapang. | Grid responsif. | Grid 1 kolom vertikal dengan padding dan tombol yang mudah disentuh jari. |
