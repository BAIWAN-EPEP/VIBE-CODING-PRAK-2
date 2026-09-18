# Sistem Peminjaman Buku Perpustakaan (Microservices)

Dokumentasi utama dan panduan langkah penggunaan sistem peminjaman buku perpustakaan kampus berbasis arsitektur Microservices (Book Service & Borrowing Service).


## Data Akun Mahasiswa Terdaftar (Demo Kredensial)

Sistem ini memiliki 3 akun mahasiswa aktif yang digunakan untuk pengujian alur peminjaman:

| Nama Mahasiswa | NIM (Username) | Password | Peran / Hak Akses | Batas Kuota |
| Ahmad Fauzi | `12345` | `pass123` | Mahasiswa (Akun Uji 1) | Maks 3 Buku |
| Siti Rahayu | `67890` | `pass456` | Mahasiswa (Akun Uji 2) | Maks 3 Buku |
| Budi Santoso | `11111` | `pass789` | Mahasiswa (Akun Uji 3) | Maks 3 Buku |


## Panduan Menjalankan Sistem

Untuk menjalankan sistem secara lengkap, Anda membutuhkan 3 terminal terpisah:

### 1. Menjalankan Book Service (Port 5001)

Buka terminal pertama:

```bash
cd services/book-service
npm install
npm start

```

Layanan Book Service aktif di: `http://localhost:5001`

### 2. Menjalankan Borrowing Service (Port 5002)

Buka terminal kedua:

```bash
cd services/borrowing-service
npm install
npm start

```

Layanan Borrowing Service aktif di: `http://localhost:5002`

### 3. Menjalankan Frontend Web Client (Port 3000)

Buka terminal ketiga di direktori utama:

```bash
python -m http.server 3000

```

Buka peramban (browser) dan akses alamat: `http://localhost:3000`

---

## Langkah-Langkah Penggunaan Sistem

Berikut panduan langkah demi langkah menggunakan aplikasi:

### Langkah 1: Login ke Sistem

1. Akses `http://localhost:3000` pada browser.
2. Masukkan salah satu akun mahasiswa, contohnya:
* NIM: `12345`
* Password: `pass123`


3. Klik tombol Login untuk masuk sebagai Ahmad Fauzi.

---

### Langkah 2: Memeriksa Status Indikator Microservices

Perhatikan pada bagian atas (header navbar), terdapat indikator status koneksi kedua microservice secara real-time:

* Book Service (5001) : Status Online
* Borrowing Service (5002) : Status Online

(Jika salah satu service belum berjalan, indikator akan berubah menjadi warna merah / Offline).

---

### Langkah 3: Melihat Katalog Buku

Pada bagian Daftar Buku Perpustakaan, sistem memuat 8 buku yang diambil langsung dari Book Service (Port 5001):

* Pemrograman Web Dasar (Budi Raharjo)
* Basis Data (Fathansyah)
* Algoritma dan Pemrograman (Rinaldi Munir)
* Rekayasa Perangkat Lunak (Roger Pressman)
* Jaringan Komputer (Andrew Tanenbaum)
* Sistem Operasi (William Stallings)
* Kecerdasan Buatan (Stuart Russell)
* Struktur Data (D.S. Malik)

Setiap buku yang belum dipinjam akan memiliki status Tersedia dan tombol Pinjam aktif.

---

### Langkah 4: Meminjam Buku (Alur Inter-Service)

1. Sebagai Ahmad Fauzi (`12345`), klik tombol Pinjam pada buku Pemrograman Web Dasar.
2. Borrowing Service (5002) memvalidasi kuota, menghubungi Book Service (5001) via API untuk mengunci status buku, dan mencatat transaksi.
3. Muncul notifikasi pop-up: Peminjaman Berhasil! beserta informasi tanggal jatuh tempo (7 hari).
4. Buku langsung muncul pada tabel Peminjaman Aktif Saya.
5. Pada katalog buku, tombol buku tersebut otomatis berubah menjadi Sedang Anda Pinjam (terkunci).

---

### Langkah 5: Menguji Multi-User (Isolasi Antar-Mahasiswa)

1. Klik tombol Logout di pojok kanan atas.
2. Login kembali menggunakan akun mahasiswa kedua:
* NIM: `67890`
* Password: `pass456` (Siti Rahayu)


3. Perhatikan tabel Peminjaman Aktif Saya milik Siti Rahayu masih bersih (`0 / 3 buku sedang dipinjam`).
4. Pada katalog buku, buku Pemrograman Web Dasar otomatis berlabel Sedang Dipinjam dengan tombol Sedang Dipinjam dalam keadaan disabled (tidak bisa dipinjam oleh Siti Rahayu karena sedang dipinjam oleh Ahmad Fauzi).
5. Siti Rahayu dapat meminjam buku lain yang berstatus tersedia, misalnya Basis Data.

---

### Langkah 6: Menguji Batas Maksimal Kuota (Maks 3 Buku)

1. Jika seorang mahasiswa meminjam 3 buku berturut-turut:
2. Indikator kuota akan berubah warna merah: `3 / 3 buku sedang dipinjam — Batas maksimal tercapai!`.
3. Seluruh tombol pinjam pada buku lain di katalog otomatis berubah menjadi Batas Tercapai dan terkunci.

---

### Langkah 7: Mengembalikan Buku

1. Login kembali sebagai peminjam buku (contoh: Ahmad Fauzi - `12345`).
2. Pada tabel Peminjaman Aktif Saya, klik tombol Kembalikan di sebelah buku Pemrograman Web Dasar.
3. Konfirmasi dialog pengembalian yang muncul di browser.
4. Borrowing Service memperbarui status transaksi menjadi selesai dan meminta Book Service merestorasi status ketersediaan buku.
5. Buku hilang dari tabel peminjaman aktif Ahmad Fauzi, dan status buku di katalog kembali menjadi Tersedia sehingga dapat dipinjam oleh mahasiswa lain.

---

## Berkas Dokumentasi Lainnya

Sesuai ketentuan tugas praktikum, rincian teknis telah dipisahkan ke dalam berkas-berkas tersendiri:

* ARCHITECTURE.md : Diagram arsitektur sebelum vs sesudah, alur inter-service, dan kontrak endpoint API.
* TECH_STACK.md : Daftar lengkap teknologi, framework, dan pustaka yang digunakan.
* AI_DOCUMENTATION.md : Dokumentasi penggunaan AI coding tool, analisis bug hasil AI, dan solusinya (tempat screenshot AI).
* PROMPTS.md : Kumpulan prompt yang digunakan selama proses pengembangan sistem.
