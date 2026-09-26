# 📝 Kumpulan Prompt Pengembangan Sistem (AI Prompt Log)

Dokumen ini mencatat seluruh rangkaian *prompt* terstruktur yang digunakan selama proses pengembangan, dekomposisi *microservices*, perbaikan bug logika, hingga otomasi pengujian Postman dengan bantuan **AI Coding Assistant** (Google Antigravity IDE & Gemini 3.8 Flash).

---

## Tahap 1: Perancangan Arsitektur Microservices & Pemecahan Service

### Prompt 1.1: Usulan Pemecahan Service dan Komunikasi Antarservice
```text
Halo! Saya ingin meminta bantuanmu untuk mengembangkan proyek aplikasi web perpustakaan kelompok kami sebelumnya menjadi arsitektur berbasis microservice. Berikut adalah ketentuan dan detail tugas yang harus kita ikuti:

1. KELOMPOK & PROYEK:
- Kembangkan proyek yang sudah ada (jangan buat dari awal/baru).
- Gunakan kembali User Story dan Acceptance Criteria dari proyek sebelumnya.

2. KETENTUAN ARSITEKTUR & TEKNOLOGI:
- Ubah/pecah arsitektur proyek menjadi minimal 2 (dua) service/microservice yang terpisah.
- Setiap service harus memiliki fungsi dan tanggung jawab yang jelas.
- Antarservice wajib dapat saling berkomunikasi menggunakan API (misalnya REST API).
- Teknologi yang digunakan berbasis Node.js dan Express.js.

3. ALUR FITUR UTAMA:
- Pastikan minimal ada 1 (satu) alur fitur end-to-end yang berjalan dengan sukses dengan melibatkan kolaborasi antar service yang dibuat (fitur peminjaman buku).

TUGAS UNTUKMU SAAT INI:
Silakan bantu saya merancang langkah-langkah awal pengembangan ini, meliputi:
1. Usulan pemecahan service (minimal 2 service) berdasarkan arsitektur web standar.
2. Rancangan komunikasi API antarservice tersebut (HTTP Method, Endpoint, Payload).
3. Struktur folder atau boilerplate kode dasar untuk memulai pemisahan service ini.
```

---

## Tahap 2: Pembuatan Kode Microservices (Scaffolding & Inter-Service Communication)

### Prompt 2.1: Implementasi Book Service & Borrowing Service
```text
Berdasarkan rancangan sebelumnya, tolong buatkan implementasi kode backend menggunakan Node.js dan Express.js:

1. Book Service (Port 5001):
   - Kelola data katalog 8 buku awal.
   - Endpoint GET /health untuk health check.
   - Endpoint GET /api/books (mendukung query ?search=...).
   - Endpoint GET /api/books/:id untuk detail buku.
   - Endpoint PATCH /api/books/:id/status untuk mengunci atau merestorasi status ketersediaan buku.

2. Borrowing Service (Port 5002):
   - Kelola transaksi peminjaman buku dan batas kuota 3 buku per mahasiswa.
   - Endpoint GET /health untuk health check.
   - Endpoint POST /api/borrowings untuk peminjaman:
     * Validasi kuota maksimal 3 buku.
     * Hubungi Book Service via HTTP GET ke port 5001 untuk cek apakah buku available.
     * Hubungi Book Service via HTTP PATCH ke port 5001 untuk mengunci buku menjadi available: false.
     * Simpan data transaksi dengan jatuh tempo 7 hari.
   - Endpoint POST /api/borrowings/return untuk pengembalian buku dan restorasi status di Book Service.

Pastikan kedua service dilengkapi CORS dan logging request di terminal.
```

---

## Tahap 3: Debugging Bug Logika AI (Human-in-the-Loop)

### Prompt 3.1: Analisis Akar Masalah (Tanpa Mengubah Kode Terlebih Dahulu)
```text
The implementation does not satisfy Acceptance Criteria AC-02.

Acceptance Criteria AC-02:
If a student already has 3 active borrowed books, the system must reject any additional borrowing attempt.

Current behavior:
When User A (NIM 12345) has 3 active borrowings and User B (NIM 67890) logs in, User B is also rejected from borrowing, even though User B has 0 active borrowings. The limit is being applied globally instead of per-student.

Analyze the cause of the problem.
Do NOT modify the code yet.
Explain:
1. where exactly the problem is in the code;
2. why the current implementation violates AC-02;
3. what should be changed to fix it correctly.
```

### Prompt 3.2: Eksekusi Perbaikan Kode Berdasarkan Hasil Analisis
```text
Apply the proposed fix.
Do not change the existing requirements.
Make sure the implementation satisfies AC-02:
- Filter the active borrowings count specifically using the current student's NIM (b.nim === nim && b.status === "active").
- Ensure this isolated check is applied consistently so other students are not affected.
```

---

## Tahap 4: Penggabungan Multi-Service Menjadi 1 Folder & Single-Terminal Runner

### Prompt 4.1: Konsolidasi 1 Folder & Eksekusi Sekali Panggil di Terminal
```text
Saat ini kami harus membuka 3 terminal terpisah (Book Service port 5001, Borrowing Service port 5002, dan Web Client port 3000). Hal ini merepotkan.

Tolong bantu:
1. Gabungkan kedua microservice tersebut ke dalam 1 folder backend terpadu (backend/) dengan 1 package.json bersama.
2. Buatkan cara agar dengan SEKALI PEMANGGILAN di terminal (misal: npm start), seluruh sistem (Book Service, Borrowing Service, dan Frontend) langsung berjalan bersamaan.
3. Buatkan juga shortcut start.bat untuk pengguna Windows agar bisa dijalankan dengan klik 2 kali.
```

---

## Tahap 5: Pembuatan Koleksi Pengujian API Postman & Newman CLI

### Prompt 5.1: Pembuatan File Postman Collection & Runner Otomatis
```text
Saya masih awam dengan pengujian API menggunakan Postman. Tolong buatkan:
1. File Postman Collection (format JSON v2.1.0) yang siap di-import langsung ke aplikasi Postman desktop.
   - Buatkan folder "1. Book Service (5001)" dan "2. Borrowing Service (5002)".
   - Masukkan seluruh request (Health Check, Get Books, Pinjam Buku, Kembalikan Buku, dll) lengkap dengan variabel URL dan tes asersi otomatis (status 200 OK, pesan sukses).
2. Konfigurasi perintah terminal menggunakan Newman (Postman CLI) agar kami dapat menguji seluruh API Postman tersebut hanya dengan SATU KALI PERINTAH di terminal (npm run test:api).
3. Buatkan panduan ramah pemula yang menjelaskan cara import dan klik tombol di Postman.
```