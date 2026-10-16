API Contract — Sistem Peminjaman Buku Perpustakaan

1. Informasi Umum

Informasi| Keterangan
Nama sistem| Sistem Peminjaman Buku Perpustakaan
Backend| Node.js dan Express.js
Database| MySQL
Format data| JSON
Autentikasi| JSON Web Token (JWT)
Base URL| "http://localhost:3000"

API digunakan untuk memeriksa status server, melakukan login mahasiswa, mengelola katalog buku, melakukan peminjaman, mengembalikan buku, dan mengelola riwayat peminjaman.

2. Daftar Endpoint

No.| Method| Endpoint| Fungsi
1| GET| "/health"| Memeriksa status server
2| GET| "/api/books"| Mengambil daftar buku dan mencari buku berdasarkan judul atau penulis
3| GET| "/api/books/:id"| Mengambil detail buku berdasarkan ID
4| PATCH| "/api/books/:id/status"| Memperbarui status ketersediaan buku
5| POST| "/api/books/reset"| Mereset status seluruh buku jika tidak ada peminjaman aktif
6| GET| "/api/borrowings"| Mengambil seluruh riwayat peminjaman
7| GET| "/api/borrowings/:nim"| Mengambil riwayat peminjaman berdasarkan NIM
8| POST| "/api/borrowings"| Membuat transaksi peminjaman buku
9| POST| "/api/borrowings/return"| Memproses pengembalian buku
10| POST| "/api/borrowings/reset"| Menghapus riwayat peminjaman yang sudah dikembalikan
11| POST| "/api/login"| Memverifikasi akun mahasiswa dan menghasilkan token JWT

3. Detail Request dan Response

3.1 Pemeriksaan Server

Method: "GET"

Endpoint: "/health"

Request body: Tidak diperlukan.

Contoh response "200 OK":

{
  "service": "library-management-api",
  "status": "healthy",
  "port": 3000
}

3.2 Login Mahasiswa

Method: "POST"

Endpoint: "/api/login"

Request body:

{
  "nim": "67890",
  "password": "pass456"
}

Contoh response berhasil "200 OK":

{
  "message": "Login berhasil.",
  "token": "<JWT_TOKEN>",
  "user": {
    "nim": "67890",
    "name": "Siti Rahayu"
  }
}

Response gagal:

- "400 Bad Request": NIM atau password tidak diisi.
- "401 Unauthorized": NIM atau password salah.
- "500 Internal Server Error": Terjadi kesalahan saat membuat token atau memproses request.

Catatan: kredensial di atas merupakan contoh akun yang tercantum pada kode "server.js".

3.3 Mengambil Daftar Buku

Method: "GET"

Endpoint: "/api/books"

Request body: Tidak diperlukan.

Untuk mencari buku berdasarkan judul atau penulis, gunakan query parameter:

"GET /api/books?search=algoritma"

Contoh response "200 OK":

[
  {
    "id": 1,
    "title": "Algoritma dan Pemrograman",
    "author": "Contoh Penulis",
    "available": true,
    "borrowedBy": null
  }
]

Contoh data di atas hanya ilustrasi format respons; data aktual berasal dari database.

3.4 Mengambil Detail Buku

Method: "GET"

Endpoint: "/api/books/:id"

Contoh request:

"GET /api/books/1"

Parameter:

- "id": ID buku berupa bilangan bulat positif.

Kemungkinan response:

- "200 OK": Detail buku ditemukan.
- "400 Bad Request": ID tidak valid.
- "404 Not Found": Buku tidak ditemukan.
- "500 Internal Server Error": Terjadi kesalahan database.

3.5 Memperbarui Status Buku

Method: "PATCH"

Endpoint: "/api/books/:id/status"

Contoh request:

{
  "available": false,
  "borrowedBy": "67890"
}

Keterangan:

- "available": "true" jika buku tersedia dan "false" jika dipinjam.
- "borrowedBy": NIM peminjam, wajib berupa string yang tidak kosong ketika "available" bernilai "false".

Kemungkinan response:

- "200 OK": Status buku berhasil diperbarui.
- "400 Bad Request": ID atau data status tidak valid.
- "404 Not Found": Buku tidak ditemukan.
- "500 Internal Server Error": Gagal memperbarui data.

3.6 Mereset Status Buku

Method: "POST"

Endpoint: "/api/books/reset"

Request body: Tidak diperlukan.

Fungsi: Mengubah seluruh buku menjadi tersedia dan mengosongkan "borrowed_by", tetapi hanya jika tidak ada peminjaman aktif.

Kemungkinan response:

- "200 OK": Status seluruh buku berhasil direset.
- "409 Conflict": Reset ditolak karena masih ada peminjaman aktif.
- "500 Internal Server Error": Terjadi kesalahan database.

3.7 Mengambil Seluruh Riwayat Peminjaman

Method: "GET"

Endpoint: "/api/borrowings"

Request body: Tidak diperlukan.

Response "200 OK" berupa array riwayat peminjaman, dengan atribut:

- "id"
- "nim"
- "bookId"
- "bookTitle"
- "borrowDate"
- "dueDate"
- "status"
- "returnDate"

Jika terjadi kesalahan database, server mengembalikan "500 Internal Server Error".

3.8 Mengambil Riwayat Berdasarkan NIM

Method: "GET"

Endpoint: "/api/borrowings/:nim"

Contoh request:

"GET /api/borrowings/67890"

Parameter:

- "nim": NIM mahasiswa yang riwayatnya akan dicari.

Response "200 OK" berupa array riwayat peminjaman mahasiswa tersebut.

Jika terjadi kesalahan database, server mengembalikan "500 Internal Server Error".

3.9 Meminjam Buku

Method: "POST"

Endpoint: "/api/borrowings"

Request body:

{
  "nim": "67890",
  "bookId": 1
}

Ketentuan:

1. NIM harus diisi.
2. ID buku harus berupa bilangan bulat positif.
3. Buku harus tersedia.
4. Maksimal tiga peminjaman aktif per mahasiswa.
5. Buku yang sama tidak boleh dipinjam kembali oleh mahasiswa yang sama selama transaksi sebelumnya masih aktif.
6. Tanggal jatuh tempo ditetapkan tujuh hari setelah peminjaman.

Contoh response berhasil "201 Created":

{
  "message": "Berhasil meminjam buku \"Algoritma dan Pemrograman\".",
  "borrowing": {
    "id": "<ID_PEMINJAMAN>",
    "nim": "67890",
    "bookId": 1,
    "bookTitle": "Algoritma dan Pemrograman",
    "borrowDate": "<TANGGAL_PINJAM>",
    "dueDate": "<TANGGAL_JATUH_TEMPO>",
    "status": "active",
    "returnDate": null
  }
}

Kemungkinan response gagal:

- "400 Bad Request": Data tidak valid, buku sedang dipinjam, atau batas maksimal tercapai.
- "404 Not Found": Buku tidak ditemukan.
- "500 Internal Server Error": Gagal memproses transaksi.

3.10 Mengembalikan Buku

Method: "POST"

Endpoint: "/api/borrowings/return"

Request body:

{
  "borrowingId": "<ID_PEMINJAMAN>"
}

Ketentuan:

- "borrowingId" wajib diisi.
- Transaksi harus ditemukan dan berstatus "active".

Response berhasil "200 OK" berisi pesan pengembalian dan data peminjaman yang sudah diperbarui.

Kemungkinan response gagal:

- "400 Bad Request": ID peminjaman tidak diisi.
- "404 Not Found": Peminjaman aktif tidak ditemukan atau buku sudah dikembalikan.
- "500 Internal Server Error": Terjadi kesalahan saat memproses pengembalian.

3.11 Mereset Riwayat Peminjaman

Method: "POST"

Endpoint: "/api/borrowings/reset"

Request body: Tidak diperlukan.

Fungsi: Menghapus riwayat peminjaman yang statusnya "returned".

Contoh response "200 OK":

{
  "message": "Riwayat peminjaman yang sudah selesai berhasil dihapus.",
  "deletedRows": 1
}

Jika terjadi kesalahan database, server mengembalikan "500 Internal Server Error".

4. Aturan Bisnis

1. Maksimal tiga buku dengan status "active" untuk setiap mahasiswa.
2. Buku yang sedang dipinjam tidak dapat dipinjam kembali.
3. Masa peminjaman adalah tujuh hari.
4. Pengembalian mengubah status peminjaman menjadi "returned".
5. Pengembalian membuat buku kembali tersedia.
6. Reset status seluruh buku ditolak jika masih terdapat peminjaman aktif.
7. Reset riwayat hanya menghapus transaksi dengan status "returned".

5. Catatan Autentikasi dan Keamanan

Endpoint "/api/login" menghasilkan token JWT dengan masa berlaku satu jam.

Frontend yang menggunakan token mengirimkannya melalui header:

"Authorization: Bearer <JWT_TOKEN>"

Catatan penting: Pada implementasi "server.js" yang diperiksa, middleware untuk memverifikasi token JWT belum terlihat diterapkan pada endpoint lainnya. Karena itu, header tersebut belum membuktikan bahwa endpoint sudah terlindungi. Verifikasi autentikasi dan otorisasi perlu diperiksa serta disesuaikan dengan kebutuhan sistem.

6. Pengujian API

Pengujian dilakukan menggunakan Postman dan dapat diotomatisasi menggunakan Newman.

Endpoint yang perlu diuji:

1. Pemeriksaan status server.
2. Login dengan akun benar dan salah.
3. Pengambilan daftar dan detail buku.
4. Pembaruan status buku.
5. Peminjaman buku yang tersedia.
6. Penolakan peminjaman buku yang tidak tersedia.
7. Pembatasan maksimal tiga buku aktif.
8. Pengembalian buku.
9. Reset status dan riwayat peminjaman.

Hasil pengujian harus dicatat berdasarkan respons aktual dari server, termasuk status HTTP dan isi respons.

7. Catatan Versi

Dokumentasi ini disusun berdasarkan kode "backend/server.js" yang diperiksa. Dokumentasi perlu diperbarui jika endpoint, aturan bisnis, atau format request dan response berubah.