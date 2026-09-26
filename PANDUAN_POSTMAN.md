# 📮 Panduan Lengkap Penggunaan Postman & Menjalankan Sistem Sekali Panggil

Panduan ini dibuat ramah untuk pemula agar Anda memahami cara kerja API di Postman serta cara menjalankan seluruh sistem perpustakaan hanya dalam **1 kali pemanggilan terminal**.

---

## ⚡ 1. Cara Menjalankan Sistem (Cukup 1 Terminal!)

Sebelumnya Anda harus membuka 3 terminal terpisah. Sekarang, seluruh service (Book Service, Borrowing Service, dan Web Client) telah disatukan ke dalam folder `backend/`.

### Opsi A: Lewat Terminal (1 Baris Perintah)
Buka terminal di folder utama proyek (`PRAKTIKUM 2`), lalu ketik:
```bash
npm start
```
*(atau bisa juga `node backend/server.js`)*

Sistem akan otomatis mengaktifkan:
* 📚 **Book Service** di `http://localhost:5001`
* 📋 **Borrowing Service** di `http://localhost:5002`
* 🌐 **Frontend Web Client** di `http://localhost:3000`

### Opsi B: Klik 2x File `start.bat` (Khusus Windows)
Cukup buka Windows Explorer pada folder proyek ini, lalu klik dua kali file **`start.bat`**. Seluruh service langsung menyala otomatis!

---

## 📮 2. Mengenal Postman & Cara Menggunakannya (Untuk Pemula)

### Apa itu Postman?
Saat Anda membuka web di browser dan mengklik tombol "Pinjam Buku", browser sebenarnya mengirimkan pesan di balik layar (disebut **HTTP Request**) ke server.
**Postman** adalah aplikasi yang memungkinkan Anda mengirim pesan HTTP Request tersebut secara langsung tanpa perlu membuka halaman web.

### Struktur Permintaan di Postman:
1. **Method**:
   * `GET` : Mengambil atau membaca data (misal: melihat katalog buku).
   * `POST` : Mengirimkan data baru (misal: melakukan peminjaman buku).
   * `PATCH` : Memperbarui sebagian data (misal: mengubah status buku).
2. **URL**: Alamat tujuan API (contoh: `http://localhost:5001/api/books`).
3. **Body (JSON)**: Data yang dikirimkan bersama permintaan (misal NIM dan ID buku).
4. **Status Code**:
   * `200 OK` / `201 Created` : Berhasil.
   * `400 Bad Request` : Ditolak karena aturan bisnis (misal: sudah pinjam 3 buku).
   * `404 Not Found` : Data tidak ditemukan.

---

## 📥 3. Cara Import Koleksi API ke Aplikasi Postman

Kami telah membuatkan file koleksi lengkap di:
📁 `postman/library_microservices.postman_collection.json`

Ikuti langkah mudah berikut di aplikasi **Postman**:

1. Buka aplikasi **Postman** di laptop Anda.
2. Di pojok kiri atas, klik tombol **Import**.
3. Klik tombol **files** atau drag & drop file `library_microservices.postman_collection.json` dari folder `postman/`.
4. Klik **Import**.
5. Pada panel sebelah kiri (Collections), Anda akan melihat folder baru bernama:
   **"Sistem Perpustakaan Microservices"** dengan 2 sub-folder:
   * 📁 **1. Book Service (5001)**
     - `1.1 Health Check Book Service` (GET)
     - `1.2 Ambil Seluruh Katalog Buku` (GET)
     - `1.3 Pencarian Buku (Query Search)` (GET)
     - `1.4 Ambil Detail Buku by ID` (GET)
     - `1.5 Reset Katalog Buku` (POST)
   * 📁 **2. Borrowing Service (5002)**
     - `2.1 Health Check Borrowing Service` (GET)
     - `2.2 Ambil Seluruh Transaksi Peminjaman` (GET)
     - `2.3 Ambil Peminjaman Berdasarkan NIM` (GET)
     - `2.4 Pinjam Buku (Alur Inter-Service)` (POST)
     - `2.5 Kembalikan Buku (Alur Inter-Service)` (POST)
     - `2.6 Reset Data Peminjaman` (POST)

### Cara Mencoba Kirim Request di Postman:
1. Pastikan server sudah menyala (`npm start`).
2. Klik salah satu request di Postman, misalnya `1.2 Ambil Seluruh Katalog Buku`.
3. Klik tombol biru **Send** di pojok kanan atas.
4. Di bagian bawah, Anda akan melihat status **`200 OK`** dan respon data JSON berisi 8 buku perpustakaan!

---

## 🚀 4. Menjalankan Tes Postman Sekali Panggil di Terminal (Newman)

Jika Anda ingin menjalankan seluruh pengujian API Postman secara otomatis hanya dengan **1 baris perintah di terminal**, Anda bisa menggunakan **Newman** (alat CLI resmi dari Postman).

Buka terminal di root folder proyek, lalu jalankan:
```bash
npm run test:api
```

### Apa yang Terjadi Saat Perintah Ini Dijalankan?
Newman akan:
1. Membaca file `library_microservices.postman_collection.json`.
2. Mengeksekusi semua request satu per satu dari atas sampai bawah.
3. Menguji apakah status code `200 OK`, apakah Book Service hidup, apakah proses pinjam buku berhasil.
4. Menampilkan tabel rekapitulasi pengujian berwarna hijau/merah di terminal.

---

## 📋 5. Ringkasan Perintah Penting

| Kebutuhan | Perintah Terminal |
|---|---|
| Menjalankan Semua Service (Frontend + Backend) | `npm start` |
| Menjalankan Pengujian API Postman Otomatis | `npm run test:api` |
| Shortcut Windows (Tanpa buka terminal manual) | Klik 2x file `start.bat` |
