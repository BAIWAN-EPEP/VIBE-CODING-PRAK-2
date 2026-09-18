Daftar Teknologi yang Digunakan (Tech Stack)
1.	Backend Microservices
•	Node.js(v24.12.0)
Peran: JavaScript Runtime Environment untuk menjalankan microservice.
Alasan pemilihan: Mendukung non-blocking I/O dan event-driven architecture, sehingga sesuai untuk sistem microservices yang menangani banyak request I/O secara bersamaan.
•	Express.js(v4.19.2)
Peran: Framework web untuk membangun REST API pada Book Service dan BorrowingService.
Alasan pemilihan: Ringan, fleksibel dalam routing, mudah dikonfigurasi, dan memiliki ekosistem yang luas untuk pengembangan aplikasi berbasis JavaScript.
•	CORS(cors)(v2.8.5)
Peran: Middleware Express untuk mengatur Cross-Origin Resource Sharing.
Alasan pemilihan: Memungkinkan frontend pada port 3000 mengakses REST API pada port 5001 dan 5002 tanpa diblokir oleh kebijakan Same-Origin Policy browser.
•	NativeFetchAPI(Built-in)
Peran: Klien HTTP internal pada Borrowing Service untuk memanggil API Book Service.
Alasan pemilihan: Memungkinkan komunikasi antarservice menggunakan fitur bawaan Node.js tanpa membutuhkan library HTTP tambahan seperti Axios.

2.	Frontend Client
•	HTML5(StandarW3C)
Peran: Membentuk struktur halaman web, form login, tabel peminjaman, dan katalog buku.
Alasan pemilihan: Digunakan untuk mempertahankan antarmuka dari proyek pertemuan sebelumnya sesuai ketentuan tugas.
•	CSS3(VanillaCSS)(StandarCSS3)
Peran: Mengatur tata letak menggunakan CSS Grid dan Flexbox, desain kartu buku, tabel, status badge, serta indikator koneksi microservice.
Alasan pemilihan: Ringan, responsif, dan tidak membutuhkan build tools atau bundler.
•	VanillaJavaScript(ES6+)(ECMAScript2020+)
Peran: Menangani logika client, sesi login, komunikasi dengan REST API menggunakan fetch(), serta rendering UI secara dinamis.
Alasan pemilihan: Memungkinkan integrasi langsung dengan REST API tanpa ketergantungan terhadap framework frontend yang lebih kompleks.

3.	Protokol dan Format Pertukaran Data
•	ArsitekturAPI(RESTfulAPI)
Peran: Menggunakan metode HTTP seperti GET, POST, dan PATCH serta status kode HTTP seperti 200 OK, 201 Created, 400 Bad Request, 404 Not Found, dan 503 Service Unavailable.
Alasan pemilihan: RESTful API menyediakan pola komunikasi yang sederhana dan terstruktur antara client, backend, dan antarservice.
•	FormatData (JSON (JavaScript Object Notation))
Peran: Digunakan sebagai format pertukaran data antara frontend dan backend serta dalam komunikasi antarservice.
Alasan pemilihan: JSON ringan, mudah dibaca, dan mudah diproses oleh JavaScript.
•	ProtokolJaringan(HTTP/1.1(TCP/IP))
Peran: Digunakan untuk komunikasi jaringan lokal melalui port 3000, 5001, dan 5002.
Alasan pemilihan: Menyediakan protokol komunikasi standar untuk pertukaran request dan response dalam sistem.

4.	Tools Pengembangan dan AI
•	Google Antigravity IDE: IDE berbasis AI yang digunakan selama proses pengembangan dan rekayasa sistem.
•	Gemini 3.8 Flash (High): Large Language Model (LLM) yang digunakan sebagai AI Coding Assistant untuk membantu perancangan arsitektur, scaffolding kode, serta debugging komunikasi antarservice.
•	Python HTTP Server: Modul bawaan Python yang dijalankan dengan perintah python -m http.server 3000 untuk menyajikan file frontend secara lokal.
•	Git & GitHub: Digunakan sebagai Version Control System untuk mengelola repository, mencatat perubahan kode, dan mendukung kolaborasi tim.
•	Mermaid.js: Digunakan untuk membuat diagram arsitektur dan sequence diagram yang menggambarkan komunikasi API dan interaksi antarservice.

5.	Ringkasan Tech Stack
•	Backend: Node.js, Express.js, CORS, dan Native Fetch API.
•	Frontend: HTML5, CSS3, dan Vanilla JavaScript.
•	API: RESTful API.
•	Format Data: JSON.
•	Protokol: HTTP/1.1.
•	Development Tools: Google Antigravity IDE, Git, GitHub, dan Python HTTP Server.
•	AI Assistant: Gemini 3.8 Flash (High).
•	Diagram: Mermaid.js.
