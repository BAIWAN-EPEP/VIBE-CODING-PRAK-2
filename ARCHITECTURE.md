# 🏛️ Arsitektur Sistem Peminjaman Buku Perpustakaan (Microservices)

Dokumen ini menjelaskan rancangan arsitektur sistem peminjaman buku perpustakaan kampus, perbandingan sebelum vs sesudah transformasi ke *microservices*, diagram alur komunikasi antar-service, dan kontrak spesifikasi API.

---

## 1. Perbandingan Arsitektur: Sebelum vs Sesudah

### A. Arsitektur Sebelum (Monolith Client-Side)
Pada tahap awal (Pertemuan 1/Prototype awal), seluruh logika bisnis, pengelolaan data buku, validasi peminjaman, dan sesi login dijalankan secara terpusat di dalam satu aplikasi *client-side* browser menggunakan `localStorage`.

![Diagram Arsitektur Sebelum](diagram/assets/architecture_before.png)

<details>
<summary><b>Klik untuk melihat source code Mermaid (Arsitektur Sebelum)</b></summary>

```mermaid
graph TD
    User["👤 Mahasiswa / Pengguna"]
    
    subgraph Browser ["🖥️ Client-Side Browser (Monolith)"]
        UI["index.html + style.css<br/>(Antarmuka Pengguna)"]
        Logic["script.js<br/>- Logika Katalog Buku<br/>- Logika Transaksi Peminjaman<br/>- Validasi Aturan 3 Buku"]
        Storage[("Browser localStorage<br/>(Penyimpanan Data Lokal)")]
    end
    
    User --> UI
    UI --> Logic
    Logic <--> Storage
```
</details>

**Keterbatasan Arsitektur Awal:**
* Data hanya tersimpan di peramban masing-masing perangkat (tidak terdistribusi).
* Tidak ada pemisahan tanggung jawab (*separation of concerns*) antara katalog buku dan transaksi peminjaman.
* Sulit diintegrasikan dengan sistem pihak ketiga atau diuji secara independen.

---

### B. Arsitektur Sesudah (Microservices Architecture)
Arsitektur dipecah menjadi **2 layanan backend independen** berbasis Node.js & Express.js yang berjalan pada port berbeda dan saling berkomunikasi menggunakan protokol **HTTP REST API**, dikelola dalam satu folder terpadu `backend/` dengan ekosistem pengujian Postman:

![Diagram Arsitektur Sesudah](diagram/assets/architecture_after.png)

<details>
<summary><b>Klik untuk melihat source code Mermaid (Arsitektur Sesudah)</b></summary>

```mermaid
graph TD
    User["👤 Mahasiswa (Browser Client)"]
    Tester["📮 Penguji API (Postman / Newman CLI)"]

    subgraph Client_Tier ["🌐 Web Client Tier"]
        ClientApp["Web Frontend Client<br/>(Port 3000)"]
    end

    subgraph Backend_Tier ["⚙️ Backend Microservices Ecosystem (backend/server.js)"]
        
        subgraph Borrow_SVC ["📋 Borrowing Service (Port 5002)"]
            BorrowAPI["REST API: /api/borrowings"]
            BorrowLogic["Business Logic:<br/>• Validasi Kuota Max 3 Buku<br/>• Isolasi Akun Mahasiswa (NIM)<br/>• Penghitungan Jatuh Tempo (7 Hari)"]
            BorrowDB[("In-Memory DB:<br/>Riwayat Transaksi Peminjaman")]
        end

        subgraph Book_SVC ["📚 Book Service (Port 5001)"]
            BookAPI["REST API: /api/books"]
            BookLogic["Catalog Logic:<br/>• Katalog 8 Buku Perpustakaan<br/>• Pencarian Buku (Search Query)<br/>• Status Ketersediaan (available: true/false)"]
            BookDB[("In-Memory DB:<br/>Katalog & Stok Buku")]
        end
    end

    User --> ClientApp
    ClientApp -->|HTTP GET /api/books| BookAPI
    ClientApp -->|HTTP GET & POST /api/borrowings| BorrowAPI

    Tester --> BookAPI
    Tester --> BorrowAPI

    BorrowLogic -->|"1. GET /api/books/{id} (Verifikasi Status)"| BookAPI
    BorrowLogic -->|"2. PATCH /api/books/{id}/status (Kunci/Restorasi Status)"| BookAPI

    BorrowAPI --- BorrowLogic
    BorrowLogic --- BorrowDB

    BookAPI --- BookLogic
    BookLogic --- BookDB
```
</details>

---

## 2. Diagram Alur Inter-Service Communication

### A. Alur Peminjaman Buku (Borrowing Flow)
Ketika mahasiswa mengklik tombol **Pinjam Buku** di frontend, terjadi proses kolaborasi antar-service sebagai berikut:

![Sequence Diagram Peminjaman Buku](diagram/assets/sequence_borrowing.png)

<details>
<summary><b>Klik untuk melihat source code Sequence Diagram (Peminjaman)</b></summary>

```mermaid
sequenceDiagram
    autonumber
    actor M as Mahasiswa (Frontend Client :3000)
    participant BRS as Borrowing Service (:5002)
    participant BKS as Book Service (:5001)

    M->>BRS: POST /api/borrowings { nim: "12345", bookId: 1 }
    activate BRS
    Note over BRS: 1. Cek Kuota: Mahasiswa aktif < 3 buku?<br/>2. Cek apakah buku ini sedang dipinjam user?
    
    rect rgb(230, 245, 255)
    Note over BRS, BKS: KOMUNIKASI ANTARSERVICE (INTER-SERVICE API)
    BRS->>BKS: GET /api/books/1
    activate BKS
    BKS-->>BRS: 200 OK { id: 1, title: "...", available: true }
    deactivate BKS
    end

    Note over BRS: Validasi: Buku berstatus available: true?
    
    rect rgb(230, 255, 230)
    Note over BRS, BKS: KUNCI STATUS BUKU
    BRS->>BKS: PATCH /api/books/1/status { available: false, borrowedBy: "12345" }
    activate BKS
    BKS-->>BRS: 200 OK { message: "Status buku diperbarui" }
    deactivate BKS
    end

    Note over BRS: Catat transaksi peminjaman baru<br/>(ID: BRW-xxx, dueDate = +7 hari)
    BRS-->>M: 201 Created { message: "Berhasil meminjam buku!", borrowing: {...} }
    deactivate BRS

    M->>M: Perbarui antarmuka (UI) & Disable tombol pinjam
```
</details>

---

### B. Alur Pengembalian Buku (Return Flow)
Ketika mahasiswa mengklik tombol **Kembalikan Buku**:

![Sequence Diagram Pengembalian Buku](diagram/assets/sequence_returning.png)

<details>
<summary><b>Klik untuk melihat source code Sequence Diagram (Pengembalian)</b></summary>

```mermaid
sequenceDiagram
    autonumber
    actor M as Mahasiswa (Frontend Client :3000)
    participant BRS as Borrowing Service (:5002)
    participant BKS as Book Service (:5001)

    M->>BRS: POST /api/borrowings/return { borrowingId: "BRW-1", bookId: 1 }
    activate BRS
    Note over BRS: Validasi keberadaan transaksi aktif

    rect rgb(255, 245, 230)
    Note over BRS, BKS: RESTORASI STATUS KETERSEDIAAN BUKU
    BRS->>BKS: PATCH /api/books/1/status { available: true, borrowedBy: null }
    activate BKS
    BKS-->>BRS: 200 OK { message: "Status buku berhasil diperbarui" }
    deactivate BKS
    end

    Note over BRS: Ubah status transaksi menjadi "returned"<br/>Catat returnDate saat ini
    BRS-->>M: 200 OK { message: "Buku berhasil dikembalikan!" }
    deactivate BRS

    M->>M: Hapus buku dari tabel peminjaman aktif & jadikan tombol "Tersedia"
```
</details>

---

## 3. Kontrak Endpoint REST API

### 📚 A. Book Service (`http://localhost:5001`)

| Method | Endpoint | Fungsi | Parameter / Body | Response Code |
|---|---|---|---|---|
| `GET` | `/health` | Memeriksa keaktifan service | - | `200 OK` |
| `GET` | `/api/books` | Mengambil seluruh katalog buku | Query: `?search=keyword` (opsional) | `200 OK` |
| `GET` | `/api/books/:id` | Mengambil detail 1 buku berdasarkan ID | Path: `:id` (contoh: `/api/books/1`) | `200 OK` / `404 Not Found` |
| `PATCH` | `/api/books/:id/status` | Memperbarui status ketersediaan buku | Body: `{"available": boolean, "borrowedBy": string\|null}` | `200 OK` / `400 Bad Request` |
| `POST` | `/api/books/reset` | Mengembalikan katalog buku ke data awal | - | `200 OK` |

---

### 📋 B. Borrowing Service (`http://localhost:5002`)

| Method | Endpoint | Fungsi | Parameter / Body | Response Code |
|---|---|---|---|---|
| `GET` | `/health` | Memeriksa keaktifan service | - | `200 OK` |
| `GET` | `/api/borrowings` | Mengambil seluruh transaksi peminjaman | - | `200 OK` |
| `GET` | `/api/borrowings/:nim` | Mengambil riwayat peminjaman per mahasiswa | Path: `:nim` (contoh: `/api/borrowings/12345`) | `200 OK` |
| `POST` | `/api/borrowings` | Transaksi peminjaman buku (Inter-Service) | Body: `{"nim": "12345", "bookId": 1}` | `201 Created` / `400 Bad Request` / `503 Unavailable` |
| `POST` | `/api/borrowings/return` | Pengembalian buku (Inter-Service) | Body: `{"borrowingId": "BRW-xxx", "bookId": 1}` | `200 OK` / `404 Not Found` |
| `POST` | `/api/borrowings/reset` | Mereset seluruh transaksi peminjaman | - | `200 OK` |

---

## 4. Keunggulan Arsitektur yang Diterapkan

1. **Pemisahan Tanggung Jawab (*Single Responsibility Principle*)**:
   * Tim katalog buku dapat mengembangkan fitur buku tanpa menyentuh logika peminjaman.
   * Tim transaksi fokus pada aturan bisnis kuota, tanggal jatuh tempo, dan riwayat mahasiswa.
2. **Resilience & Fault Isolation**:
   * Jika Borrowing Service mengalami lonjakan traffic, katalog buku di Book Service tetap dapat diakses publik untuk pencarian buku.
3. **Kemudahan Pengujian (*Testability*)**:
   * Tersedia koleksi Postman Collection terstandar yang dapat diuji otomatis secara terisolasi maupun *end-to-end* via terminal (`npm run test:api`).
