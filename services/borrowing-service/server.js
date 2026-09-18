const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5002;
const BOOK_SERVICE_URL = process.env.BOOK_SERVICE_URL || 'http://localhost:5001';

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
    console.log(`[Borrowing-Service] ${req.method} ${req.url}`);
    next();
});

// Database in-memory transaksi peminjaman
let borrowings = [];

// 1. Health Check
app.get('/health', (req, res) => {
    res.json({ service: 'borrowing-service', status: 'healthy', port: PORT });
});

// 2. Ambil seluruh transaksi peminjaman (Audit & Debugging)
app.get('/api/borrowings', (req, res) => {
    res.json(borrowings);
});

// 3. Ambil daftar peminjaman berdasarkan NIM Mahasiswa
app.get('/api/borrowings/:nim', (req, res) => {
    const { nim } = req.params;
    const userLoans = borrowings.filter(b => b.nim === nim);
    res.json(userLoans);
});

// 4. Pinjam Buku (Alur Utama Inter-Service Microservices)
app.post('/api/borrowings', async (req, res) => {
    const { nim, bookId } = req.body;

    if (!nim || bookId === undefined || bookId === null) {
        return res.status(400).json({ error: 'NIM dan ID Buku (bookId) wajib disertakan!' });
    }

    const parsedBookId = parseInt(bookId);

    // ATURAN BISNIS 1: Maksimal 3 buku aktif per mahasiswa (Acceptance Criteria)
    const activeLoans = borrowings.filter(b => b.nim === nim && b.status === 'active');
    if (activeLoans.length >= 3) {
        return res.status(400).json({
            error: 'Peminjaman ditolak! Anda sudah memiliki 3 buku aktif. Kembalikan buku terlebih dahulu sebelum meminjam lagi.'
        });
    }

    // ATURAN BISNIS 2: Mahasiswa tidak boleh meminjam buku yang sama jika belum dikembalikan
    const alreadyBorrowingThisBook = activeLoans.some(b => b.bookId === parsedBookId);
    if (alreadyBorrowingThisBook) {
        return res.status(400).json({
            error: 'Peminjaman ditolak! Anda sedang meminjam buku ini.'
        });
    }

    try {
        console.log(`[Borrowing-Service] Mengirim request ke Book Service: GET ${BOOK_SERVICE_URL}/api/books/${parsedBookId}`);
        
        // KOMUNIKASI ANTARSERVICE 1: Verifikasi ketersediaan buku ke Book Service
        let bookResponse;
        try {
            bookResponse = await fetch(`${BOOK_SERVICE_URL}/api/books/${parsedBookId}`);
        } catch (fetchErr) {
            console.error('[Borrowing-Service] Gagal menghubungi Book Service:', fetchErr.message);
            return res.status(503).json({
                error: 'Service Tidak Tersedia: Tidak dapat terhubung ke Book Service di port 5001.'
            });
        }

        if (!bookResponse.ok) {
            const errData = await bookResponse.json();
            return res.status(bookResponse.status).json({ error: errData.error || 'Buku tidak ditemukan di Book Service' });
        }

        const book = await bookResponse.json();

        // ATURAN BISNIS 3: Buku harus berstatus "available: true"
        if (!book.available) {
            return res.status(400).json({
                error: `Peminjaman ditolak! Buku "${book.title}" sedang dipinjam oleh mahasiswa lain.`
            });
        }

        console.log(`[Borrowing-Service] Buku "${book.title}" tersedia. Mengirim request ke Book Service: PATCH status`);

        // KOMUNIKASI ANTARSERVICE 2: Ubah status buku menjadi dipinjam di Book Service
        const updateResponse = await fetch(`${BOOK_SERVICE_URL}/api/books/${parsedBookId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ available: false, borrowedBy: nim })
        });

        if (!updateResponse.ok) {
            return res.status(500).json({ error: 'Gagal memperbarui status buku pada Book Service' });
        }

        // Catat transaksi peminjaman baru
        const now = new Date();
        const dueDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // Batas 7 hari

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

// 5. Pengembalian Buku (Alur Inter-Service Pengembalian)
app.post('/api/borrowings/return', async (req, res) => {
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
        console.log(`[Borrowing-Service] Mengirim request ke Book Service untuk merestorasi status: PATCH /api/books/${targetBookId}/status`);

        // KOMUNIKASI ANTARSERVICE: Kembalikan status buku di Book Service menjadi available: true
        const updateResponse = await fetch(`${BOOK_SERVICE_URL}/api/books/${targetBookId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ available: true, borrowedBy: null })
        });

        if (!updateResponse.ok) {
            return res.status(500).json({ error: 'Gagal mengembalikan status ketersediaan buku di Book Service' });
        }

        // Perbarui status transaksi lokal
        loan.status = 'returned';
        loan.returnDate = new Date().toISOString();

        console.log(`[Borrowing-Service] Buku "${loan.bookTitle}" (Peminjaman ID: ${loan.id}) berhasil dikembalikan.`);

        return res.json({
            message: `Buku "${loan.bookTitle}" berhasil dikembalikan!`,
            borrowing: loan
        });

    } catch (err) {
        console.error('[Borrowing-Service] Return error:', err);
        return res.status(500).json({ error: 'Gagal memproses pengembalian buku ke Book Service' });
    }
});

// 6. Reset transaksi (Fitur pembantu demo/pengujian)
app.post('/api/borrowings/reset', (req, res) => {
    borrowings = [];
    res.json({ message: 'Seluruh riwayat peminjaman berhasil direset.' });
});

app.listen(PORT, () => {
    console.log(`=============================================`);
    console.log(`📋 Borrowing Service aktif di http://localhost:${PORT}`);
    console.log(`   Menghubungkan ke Book Service di: ${BOOK_SERVICE_URL}`);
    console.log(`=============================================`);
});
