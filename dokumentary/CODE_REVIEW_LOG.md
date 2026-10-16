Code Review Log

Dokumen ini berisi catatan hasil peninjauan kode (code review) pada proyek API Sistem Peminjaman Buku.

No.| Bagian| Temuan| Perbaikan/Keputusan|
1| "backend/server.js" — Proses peminjaman buku| Correctness: Proses peminjaman perlu memastikan buku tersedia dan stok mencukupi sebelum transaksi diproses.| Memastikan validasi status dan ketersediaan buku dilakukan sebelum data peminjaman disimpan. Jika buku tidak tersedia, API mengembalikan pesan kesalahan yang sesuai.
2| "backend/server.js" — Validasi input API| Correctness: Input seperti NIM, ID buku, dan informasi peminjaman perlu divalidasi agar data yang tidak lengkap atau tidak sesuai tidak diproses.| Memeriksa validasi input pada setiap endpoint terkait dan mengembalikan status HTTP serta pesan kesalahan yang sesuai jika input tidak valid.
3| "backend/server.js" — Struktur fungsi dan respons API| Readability & Maintainability: Struktur kode yang mencampurkan validasi, logika bisnis, dan respons API dapat menyulitkan pembacaan serta pengembangan lebih lanjut.| Menata kode dengan alur endpoint yang jelas, menggunakan nama variabel yang mudah dipahami, dan menjaga format respons serta penanganan kesalahan tetap konsisten.

Kesimpulan

Code review dilakukan untuk meninjau ketepatan fungsi, validasi data, keterbacaan, dan kemudahan pemeliharaan API. Temuan dan keputusan perbaikan perlu disesuaikan dengan kondisi kode aktual serta diverifikasi melalui pengujian.