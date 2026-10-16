API Contract — Library Management API

1. Base URL

Base URL untuk pengujian lokal:

http://localhost:3000

Seluruh data buku, pengguna yang melakukan login, dan transaksi peminjaman dikelola melalui backend service.

2. Daftar Endpoint

No.| Method| Endpoint| Tujuan
1| GET| "/health"| Memeriksa status server
2| GET| "/api/books"| Menampilkan daftar buku
3| GET| "/api/books/:id"| Menampilkan detail buku berdasarkan ID
4| PATCH| "/api/books/:id/status"| Mengubah status ketersediaan buku
5| POST| "/api/books/reset"| Mengatur ulang status seluruh buku jika tidak ada peminjaman aktif
6| GET| "/api/borrowings"| Menampilkan seluruh riwayat peminjaman
7| GET| "/api/borrowings/:nim"| Menampilkan riwayat peminjaman berdasarkan NIM
8| POST| "/api/borrowings"| Membuat transaksi peminjaman buku
9| POST| "/api/borrowings/return"| Memproses pengembalian buku
10| POST| "/api/borrowings/reset"| Menghapus riwayat peminjaman yang sudah dikembalikan
11| POST| "/api/login"| Melakukan login dan menghasilkan JWT

3. Detail Endpoint

3.1 GET "/health"

Tujuan: Memeriksa apakah server berjalan.

Header: Tidak ada header khusus.

Request body: Tidak diperlukan.

Contoh response berhasil (200 OK):

{
  "service": "library-management-api",
  "status": "healthy",
  "port": 3000
}

Validasi/business rule: Endpoint mengembalikan status server dan port yang digunakan.

Kasus gagal: Jika server tidak berjalan, permintaan tidak dapat terhubung.

3.2 GET "/api/books"

Tujuan: Menampilkan daftar buku yang tersedia dalam database.

Query parameter:

Parameter| Keterangan
"search"| Opsional, mencari buku berdasarkan judul atau penulis

Header: Tidak ada header khusus.

Request body: Tidak diperlukan.

Contoh request:

GET /api/books?search=algoritma

Contoh response berhasil (200 OK):

[
  {
    "id": 1,
    "title": "Algoritma dan Pemrograman",
    "author": "Contoh Penulis",
    "available": true,
    "borrowedBy": null
  }
]

Validasi/business rule: Parameter "search" digunakan untuk menyaring judul atau penulis. Nilai "available" menunjukkan ketersediaan buku.

Kasus gagal: Jika terjadi kesalahan database, server dapat mengembalikan status 500.

3.3 GET "/api/books/:id"

Tujuan: Menampilkan detail satu buku berdasarkan ID.

Path parameter:

Parameter| Keterangan
"id"| ID buku berupa bilangan bulat positif

Header: Tidak ada header khusus.

Request body: Tidak diperlukan.

Contoh request:

GET /api/books/1

Contoh response berhasil (200 OK):

{
  "id": 1,
  "title": "Algoritma dan Pemrograman",
  "author": "Contoh Penulis",
  "available": true,
  "borrowedBy": null
}

Validasi/business rule:

- ID harus berupa bilangan bulat positif.
- Buku harus ditemukan di database.

Kasus gagal:

- "400 Bad Request": ID tidak valid.
- "404 Not Found": Buku tidak ditemukan.
- "500 Internal Server Error": Terjadi kesalahan server/database.

3.4 PATCH "/api/books/:id/status"

Tujuan: Mengubah status ketersediaan buku.

Path parameter: "id", yaitu ID buku.

Header:

Content-Type: application/json

Request body:

{
  "available": false,
  "borrowedBy": "12345"
}

Contoh response berhasil (200 OK):

{
  "message": "Status buku berhasil diperbarui",
  "book": {
    "id": 1,
    "available": false,
    "borrowedBy": "12345"
  }
}

Validasi/business rule:

- "available" harus berupa boolean.
- Jika "available" bernilai "false", "borrowedBy" harus diisi dengan nilai yang tidak kosong.
- ID buku harus ditemukan.

Kasus gagal:

- "400 Bad Request": Data tidak valid.
- "404 Not Found": Buku tidak ditemukan.
- "500 Internal Server Error": Terjadi kesalahan server/database.

3.5 POST "/api/books/reset"

Tujuan: Mengatur semua buku menjadi tersedia kembali.

Header:

Content-Type: application/json

Request body: Tidak diperlukan.

Contoh response berhasil (200 OK):

{
  "message": "Status semua buku berhasil direset"
}

Validasi/business rule:

- Proses reset hanya dapat dilakukan jika tidak ada transaksi peminjaman berstatus "active".
- Jika terdapat peminjaman aktif, proses ditolak.

Kasus gagal:

- "409 Conflict": Masih terdapat peminjaman aktif.
- "500 Internal Server Error": Terjadi kesalahan server/database.

3.6 GET "/api/borrowings"

Tujuan: Menampilkan seluruh riwayat transaksi peminjaman.

Header: Tidak ada header khusus.

Request body: Tidak diperlukan.

Contoh response berhasil (200 OK):

[
  {
    "id": 1,
    "nim": "12345",
    "bookId": 1,
    "title": "Algoritma dan Pemrograman",
    "borrowDate": "2026-10-16",
    "dueDate": "2026-10-23",
    "status": "active",
    "returnDate": null
  }
]

Validasi/business rule: Data diambil dari transaksi peminjaman dan informasi buku yang terkait.

Kasus gagal: "500 Internal Server Error" jika terjadi kesalahan database.

3.7 GET "/api/borrowings/:nim"

Tujuan: Menampilkan riwayat peminjaman berdasarkan NIM.

Path parameter:

Parameter| Keterangan
"nim"| Nomor induk mahasiswa

Header: Tidak ada header khusus.

Request body: Tidak diperlukan.

Contoh request:

GET /api/borrowings/12345

Contoh response berhasil (200 OK):

[
  {
    "id": 1,
    "nim": "12345",
    "bookId": 1,
    "status": "returned"
  }
]

Validasi/business rule: Data riwayat difilter berdasarkan NIM yang diberikan.

Kasus gagal: "500 Internal Server Error" jika terjadi kesalahan database.

Catatan keamanan: Pada implementasi saat ini, endpoint belum memeriksa apakah peminta berhak melihat riwayat NIM tersebut.

3.8 POST "/api/borrowings"

Tujuan: Membuat transaksi peminjaman buku.

Header:

Content-Type: application/json

Request body:

{
  "nim": "12345",
  "bookId": 1
}

Contoh response berhasil (201 Created):

{
  "message": "Peminjaman berhasil",
  "borrowing": {
    "id": 1,
    "nim": "12345",
    "bookId": 1,
    "status": "active"
  }
}

Validasi/business rule:

- NIM dan ID buku wajib diisi dengan format yang valid.
- Buku harus tersedia.
- Satu mahasiswa maksimal memiliki tiga peminjaman aktif.
- Mahasiswa tidak boleh meminjam buku yang sama jika peminjaman sebelumnya masih aktif.
- Tanggal jatuh tempo ditetapkan tujuh hari setelah tanggal peminjaman.
- Transaksi menggunakan mekanisme database transaction dan penguncian data buku untuk membantu mencegah peminjaman bersamaan.

Kasus gagal:

- "400 Bad Request": Data tidak valid, buku tidak tersedia, batas peminjaman tercapai, atau buku yang sama masih dipinjam.
- "404 Not Found": Buku tidak ditemukan.
- "500 Internal Server Error": Terjadi kesalahan server/database.

3.9 POST "/api/borrowings/return"

Tujuan: Memproses pengembalian buku yang sedang dipinjam.

Header:

Content-Type: application/json

Request body:

{
  "borrowingId": 1
}

Contoh response berhasil (200 OK):

{
  "message": "Buku berhasil dikembalikan",
  "borrowing": {
    "id": 1,
    "status": "returned"
  }
}

Validasi/business rule:

- "borrowingId" wajib diisi.
- Transaksi harus ditemukan dan berstatus "active".
- Status peminjaman diubah menjadi "returned".
- Tanggal pengembalian dicatat.
- Buku diatur kembali menjadi tersedia dan "borrowed_by" dikosongkan.

Kasus gagal:

- "400 Bad Request": ID transaksi tidak diisi.
- "404 Not Found": Transaksi tidak ditemukan atau sudah tidak berstatus aktif.
- "500 Internal Server Error": Terjadi kesalahan server/database.

3.10 POST "/api/borrowings/reset"

Tujuan: Menghapus transaksi peminjaman yang sudah dikembalikan.

Header:

Content-Type: application/json

Request body: Tidak diperlukan.

Contoh response berhasil (200 OK):

{
  "message": "Riwayat peminjaman berhasil direset",
  "deletedRows": 2
}

Validasi/business rule: Hanya transaksi dengan status "returned" yang dihapus. Transaksi aktif tidak termasuk dalam penghapusan.

Kasus gagal: "500 Internal Server Error" jika terjadi kesalahan database.

3.11 POST "/api/login"

Tujuan: Memverifikasi login pengguna dan menghasilkan token JWT.

Header:

Content-Type: application/json

Request body:

{
  "nim": "12345",
  "password": "pass123"
}

Contoh response berhasil (200 OK):

{
  "message": "Login berhasil",
  "token": "<JWT_TOKEN>",
  "user": {
    "nim": "12345",
    "name": "Ahmad Fauzi"
  }
}

Validasi/business rule:

- NIM dan password wajib diisi.
- Kredensial harus sesuai dengan data pengguna yang tersedia pada kode.
- Token JWT berlaku selama satu jam.
- Nilai rahasia penandatangan token menggunakan konfigurasi "JWT_SECRET".

Kasus gagal:

- "400 Bad Request": NIM atau password tidak diisi.
- "401 Unauthorized": Kredensial tidak valid.

Catatan keamanan: Data pengguna dan password pada implementasi saat ini masih ditulis langsung di kode. Untuk penggunaan nyata, sebaiknya gunakan database dan penyimpanan password berbentuk hash.

4. Header yang Digunakan

Header| Kegunaan
"Content-Type: application/json"| Digunakan ketika mengirim request body JSON
"Authorization: Bearer <token>"| Format header untuk token JWT jika autentikasi diterapkan

Catatan: Berdasarkan kode backend yang diperiksa, token dibuat saat login, tetapi middleware verifikasi JWT belum diterapkan pada endpoint lainnya. Karena itu, jangan menganggap endpoint tersebut sudah terlindungi token.

5. Ringkasan HTTP Status Code

Status| Arti
"200 OK"| Permintaan berhasil
"201 Created"| Transaksi peminjaman berhasil dibuat
"400 Bad Request"| Parameter atau data permintaan tidak valid
"401 Unauthorized"| Kredensial login tidak valid
"404 Not Found"| Data yang diminta tidak ditemukan
"409 Conflict"| Operasi reset buku ditolak karena masih ada peminjaman aktif
"500 Internal Server Error"| Terjadi kesalahan server atau database

6. Business Rule Utama

1. Buku yang dipinjam harus berstatus tersedia.
2. Mahasiswa maksimal memiliki tiga peminjaman aktif.
3. Mahasiswa tidak boleh meminjam buku yang sama dua kali ketika transaksi sebelumnya masih aktif.
4. Masa peminjaman adalah tujuh hari sejak tanggal peminjaman.
5. Buku menjadi tersedia kembali setelah transaksi pengembalian berhasil.
6. Reset status buku ditolak jika masih terdapat peminjaman aktif.
7. Reset riwayat peminjaman hanya menghapus transaksi berstatus "returned".

7. Contoh Kasus Pengujian

Kasus| Request| Hasil yang Diharapkan
Berhasil melihat daftar buku| "GET /api/books"| "200 OK"
Berhasil melihat detail buku| "GET /api/books/1"| "200 OK" jika buku ditemukan
ID buku tidak valid| "GET /api/books/abc"| "400 Bad Request"
Buku tidak ditemukan| "GET /api/books/99999"| "404 Not Found"
Berhasil meminjam buku tersedia| "POST /api/borrowings" dengan NIM dan ID buku valid| "201 Created"
Meminjam buku yang tidak tersedia| "POST /api/borrowings"| "400 Bad Request"
Meminjam buku yang sama saat masih aktif| "POST /api/borrowings"| "400 Bad Request"
Batas tiga peminjaman aktif tercapai| "POST /api/borrowings"| "400 Bad Request"
Berhasil mengembalikan buku| "POST /api/borrowings/return" dengan ID transaksi aktif| "200 OK"
Mengembalikan transaksi yang tidak aktif| "POST /api/borrowings/return"| "404 Not Found"
Reset buku saat ada peminjaman aktif| "POST /api/books/reset"| "409 Conflict"
Login dengan kredensial tidak valid| "POST /api/login"| "401 Unauthorized"

Catatan: Contoh response pada dokumen ini merupakan ilustrasi kontrak berdasarkan implementasi backend. Lakukan pengujian melalui Postman untuk memastikan bentuk response, status code, dan business rule sesuai dengan hasil aktual.