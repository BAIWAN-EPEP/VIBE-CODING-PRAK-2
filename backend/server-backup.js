const express = require('express');
const cors = require('cors');
const path = require('path');

// ==============================================================================
//  UNIFIED BACKEND SERVER: 2 MICROSERVICES + FRONTEND CLIENT
//  - Service 1: Book Service (Port 5001)
//  - Service 2: Borrowing Service (Port 5002)
//  - Web Client: Frontend Server (Port 3000)
// ==============================================================================

const BOOK_PORT = process.env.BOOK_PORT || 5001;
const BORROW_PORT = process.env.BORROW_PORT || 5002;
const WEB_PORT = process.env.WEB_PORT || 3000;
const BOOK_SERVICE_URL = `http://localhost:${BOOK_PORT}`;

// ==============================================================================
//  1. BOOK SERVICE (PORT 5001)
// ==============================================================================
const bookApp = express();
bookApp.use(cors());
bookApp.use(express.json());

bookApp.use((req, res, next) => {
    console.log(`[Book-Service :${BOOK_PORT}] ${req.method} ${req.url}`);
    next();
});

// Seed data awal katalog buku
const INITIAL_BOOKS = [
    { id: 1, title: 'Pemrograman Web Dasar',    author: 'Budi Raharjo',     available: true, borrowedBy: null },
    { id: 2, title: 'Basis Data',                author: 'Fathansyah',       available: true, borrowedBy: null },
    { id: 3, title: 'Algoritma dan Pemrograman', author: 'Rinaldi Munir',    available: true, borrowedBy: null },
    { id: 4, title: 'Rekayasa Perangkat Lunak',  author: 'Roger Pressman',   available: true, borrowedBy: null },
    { id: 5, title: 'Jaringan Komputer',         author: 'Andrew Tanenbaum', available: true, borrowedBy: null },
    { id: 6, title: 'Sistem Operasi',            author: 'William Stallings',available: true, borrowedBy: null },
    { id: 7, title: 'Kecerdasan Buatan',         author: 'Stuart Russell',   available: true, borrowedBy: null },
    { id: 8, title: 'Struktur Data',             author: 'D.S. Malik',       available: true, borrowedBy: null }
];

let books = JSON.parse(JSON.stringify(INITIAL_BOOKS));

// 1.1 Health Check Book Service
bookApp.get('/health', (req, res) => {
    res.json({ service: 'book-service', status: 'healthy', port: BOOK_PORT });
});

// 1.2 Ambil Semua Buku / Pencarian Buku
bookApp.get('/api/books', (req, res) => {
    const { search } = req.query;
    if (search) {
        const keyword = search.toLowerCase();
        const filtered = books.filter(b => 
            b.title.toLowerCase().includes(keyword) || 
            b.author.toLowerCase().includes(keyword)
        );
        return res.json(filtered);
    }
    res.json(books);
});

// 1.3 Ambil Detail Buku berdasarkan ID
bookApp.get('/api/books/:id', (req, res) => {
    const bookId = parseInt(req.params.id);
    const book = books.find(b => b.id === bookId);
    if (!book) {
        return res.status(404).json({ error: `Buku dengan ID ${bookId} tidak ditemukan` });
    }
    res.json(book);
});

// 1.4 Update Status Ketersediaan Buku (Dipanggil oleh Borrowing Service)
bookApp.patch('/api/books/:id/status', (req, res) => {
    const bookId = parseInt(req.params.id);
    const { available, borrowedBy } = req.body;

    const book = books.find(b => b.id === bookId);
    if (!book) {
        return res.status(404).json({ error: `Buku dengan ID ${bookId} tidak ditemukan` });
    }

    if (typeof available !== 'boolean') {
        return res.status(400).json({ error: 'Field "available" harus bertipe boolean' });
    }

    book.available = available;
    book.borrowedBy = available ? null : (borrowedBy || null);

    console.log(`[Book-Service] Status buku "${book.title}" (ID: ${book.id}) diubah -> available: ${book.available}, borrowedBy: ${book.borrowedBy}`);

    res.json({
        message: 'Status buku berhasil diperbarui',
        book
    });
});

// 1.5 Reset Data Buku
bookApp.post('/api/books/reset', (req, res) => {
    books = JSON.parse(JSON.stringify(INITIAL_BOOKS));
    res.json({ message: 'Data katalog buku berhasil direset ke kondisi awal', books });
});


// ==============================================================================
//  2. BORROWING SERVICE (PORT 5002)
// ==============================================================================
const borrowApp = express();
borrowApp.use(cors());
borrowApp.use(express.json());

borrowApp.use((req, res, next) => {
    console.log(`[Borrowing-Service :${BORROW_PORT}] ${req.method} ${req.url}`);
    next();
});

// In-memory Database transaksi peminjaman
let borrowings = [];

// 2.1 Health Check Borrowing Service
borrowApp.get('/health', (req, res) => {
    res.json({ service: 'borrowing-service', status: 'healthy', port: BORROW_PORT });
});

// 2.2 Ambil Seluruh Riwayat Transaksi Peminjaman
borrowApp.get('/api/borrowings', (req, res) => {
    res.json(borrowings);
});

// 2.3 Ambil Peminjaman Berdasarkan NIM Mahasiswa
borrowApp.get('/api/borrowings/:nim', (req, res) => {
    const { nim } = req.params;
    const userLoans = borrowings.filter(b => b.nim === nim);
    res.json(userLoans);
});

// 2.4 Transaksi Peminjaman Buku (Komunikasi Inter-Service ke Book Service)
borrowApp.post('/api/borrowings', async (req, res) => {
    const { nim, bookId } = req.body;

    if (!nim || bookId === undefined || bookId === null) {
        return res.status(400).json({ error: 'NIM dan ID Buku (bookId) wajib disertakan!' });
    }

    const parsedBookId = parseInt(bookId);

    // ATURAN 1: Maksimal 3 buku aktif per mahasiswa
    const activeLoans = borrowings.filter(b => b.nim === nim && b.status === 'active');
    if (activeLoans.length >= 3) {
        return res.status(400).json({
            error: 'Peminjaman ditolak! Anda sudah memiliki 3 buku aktif. Kembalikan buku terlebih dahulu sebelum meminjam lagi.'
        });
    }

    // ATURAN 2: Tidak boleh meminjam buku yang sama jika belum dikembalikan
    const alreadyBorrowingThisBook = activeLoans.some(b => b.bookId === parsedBookId);
    if (alreadyBorrowingThisBook) {
        return res.status(400).json({
            error: 'Peminjaman ditolak! Anda sedang meminjam buku ini.'
        });
    }

    try {
        console.log(`[Borrowing-Service] Menghubungi Book Service: GET ${BOOK_SERVICE_URL}/api/books/${parsedBookId}`);

        // Komunikasi Antar-Service 1: Verifikasi ketersediaan buku
        let bookResponse;
        try {
            bookResponse = await fetch(`${BOOK_SERVICE_URL}/api/books/${parsedBookId}`);
        } catch (fetchErr) {
            console.error('[Borrowing-Service] Gagal menghubungi Book Service:', fetchErr.message);
            return res.status(503).json({
                error: `Service Tidak Tersedia: Tidak dapat terhubung ke Book Service di ${BOOK_SERVICE_URL}`
            });
        }

        if (!bookResponse.ok) {
            const errData = await bookResponse.json();
            return res.status(bookResponse.status).json({ error: errData.error || 'Buku tidak ditemukan di Book Service' });
        }

        const book = await bookResponse.json();

        // ATURAN 3: Buku harus berstatus available
        if (!book.available) {
            return res.status(400).json({
                error: `Peminjaman ditolak! Buku "${book.title}" sedang dipinjam oleh mahasiswa lain.`
            });
        }

        console.log(`[Borrowing-Service] Buku "${book.title}" tersedia. Mengunci status di Book Service: PATCH`);

        // Komunikasi Antar-Service 2: Kunci status buku
        const updateResponse = await fetch(`${BOOK_SERVICE_URL}/api/books/${parsedBookId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ available: false, borrowedBy: nim })
        });

        if (!updateResponse.ok) {
            return res.status(500).json({ error: 'Gagal memperbarui status buku pada Book Service' });
        }

        // Catat transaksi baru
        const now = new Date();
        const dueDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        const newBorrowing = {
            id: 'BRW-' + Date.now(),
            nim: nim,
            bookId: parsedBookId,
            bookTitle: book.title,
            borrowDate: now.toISOString(),
            dueDate: dueDate.toISOString(),
            status: 'active',
            returnDate: null
        };

        borrowings.push(newBorrowing);
        console.log(`[Borrowing-Service] Peminjaman berhasil dicatat ID: ${newBorrowing.id} untuk NIM: ${nim}`);

        return res.status(201).json({
            message: `Berhasil meminjam buku "${book.title}"!`,
            borrowing: newBorrowing
        });

    } catch (err) {
        console.error('[Borrowing-Service] Unexpected error:', err);
        return res.status(500).json({ error: 'Terjadi kesalahan internal pada Borrowing Service' });
    }
});

// 2.5 Pengembalian Buku (Komunikasi Inter-Service ke Book Service)
borrowApp.post('/api/borrowings/return', async (req, res) => {
    const { borrowingId, bookId } = req.body;

    if (!borrowingId) {
        return res.status(400).json({ error: 'ID Peminjaman (borrowingId) wajib disertakan!' });
    }

    const loan = borrowings.find(b => b.id === borrowingId && b.status === 'active');
    if (!loan) {
        return res.status(404).json({ error: 'Data peminjaman aktif tidak ditemukan atau buku sudah dikembalikan.' });
    }

    const targetBookId = bookId ? parseInt(bookId) : loan.bookId;

    try {
        console.log(`[Borrowing-Service] Mengirim request restorasi status ke Book Service: PATCH /api/books/${targetBookId}/status`);

        // Komunikasi Antar-Service: Kembalikan status buku
        const updateResponse = await fetch(`${BOOK_SERVICE_URL}/api/books/${targetBookId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ available: true, borrowedBy: null })
        });

        if (!updateResponse.ok) {
            return res.status(500).json({ error: 'Gagal mengembalikan status ketersediaan buku di Book Service' });
        }

        loan.status = 'returned';
        loan.returnDate = new Date().toISOString();

        console.log(`[Borrowing-Service] Buku "${loan.bookTitle}" (ID: ${loan.id}) berhasil dikembalikan.`);

        return res.json({
            message: `Buku "${loan.bookTitle}" berhasil dikembalikan!`,
            borrowing: loan
        });

    } catch (err) {
        console.error('[Borrowing-Service] Return error:', err);
        return res.status(500).json({ error: 'Gagal memproses pengembalian buku ke Book Service' });
    }
});

// 2.6 Reset Transaksi
borrowApp.post('/api/borrowings/reset', (req, res) => {
    borrowings = [];
    res.json({ message: 'Seluruh riwayat peminjaman berhasil direset.' });
});


// ==============================================================================
//  3. FRONTEND WEB CLIENT STATIC SERVER (PORT 3000)
// ==============================================================================
const webApp = express();
const staticRoot = path.join(__dirname, '..');
webApp.use(express.static(staticRoot));


// ==============================================================================
//  LISTENERS (MENYALAKAN SEMUA SERVICE SEKALIGUS)
// ==============================================================================
console.log('========================================================');
console.log('🚀 MEMULAI SISTEM PERPUSTAKAAN BERBASIS MICROSERVICES');
console.log('========================================================');

// 1. Jalankan Book Service
bookApp.listen(BOOK_PORT, () => {
    console.log(`📚 [1/3] Book Service aktif      : http://localhost:${BOOK_PORT}`);
});

// 2. Jalankan Borrowing Service
borrowApp.listen(BORROW_PORT, () => {
    console.log(`📋 [2/3] Borrowing Service aktif : http://localhost:${BORROW_PORT}`);
});

// 3. Jalankan Frontend Web Client
const webServer = webApp.listen(WEB_PORT, () => {
    console.log(`🌐 [3/3] Frontend Web Client     : http://localhost:${WEB_PORT}`);
    console.log('--------------------------------------------------------');
    console.log('✨ SEMUA LAYANAN BERJALAN DALAM SATU TERMINAL!');
    console.log(`👉 Buka browser di: http://localhost:${WEB_PORT}`);
    console.log('========================================================');
});

webServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.log(`ℹ️ [3/3] Port ${WEB_PORT} sudah digunakan oleh server lain (misal: python server). Frontend tetap dapat diakses.`);
    } else {
        console.error('Frontend server error:', err);
    }
});
