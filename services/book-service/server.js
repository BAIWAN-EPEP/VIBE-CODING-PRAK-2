const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
    console.log(`[Book-Service] ${req.method} ${req.url}`);
    next();
});

// Seed data awal buku (sesuai proyek sebelumnya)
const INITIAL_BOOKS = [
    { id: 1, title: 'Pemrograman Web Dasar',         author: 'Budi Raharjo',       available: true, borrowedBy: null },
    { id: 2, title: 'Basis Data',                     author: 'Fathansyah',          available: true, borrowedBy: null },
    { id: 3, title: 'Algoritma dan Pemrograman',      author: 'Rinaldi Munir',       available: true, borrowedBy: null },
    { id: 4, title: 'Rekayasa Perangkat Lunak',       author: 'Roger Pressman',      available: true, borrowedBy: null },
    { id: 5, title: 'Jaringan Komputer',              author: 'Andrew Tanenbaum',    available: true, borrowedBy: null },
    { id: 6, title: 'Sistem Operasi',                 author: 'William Stallings',   available: true, borrowedBy: null },
    { id: 7, title: 'Kecerdasan Buatan',              author: 'Stuart Russell',      available: true, borrowedBy: null },
    { id: 8, title: 'Struktur Data',                  author: 'D.S. Malik',          available: true, borrowedBy: null }
];

let books = JSON.parse(JSON.stringify(INITIAL_BOOKS));

// 1. Health Check
app.get('/health', (req, res) => {
    res.json({ service: 'book-service', status: 'healthy', port: PORT });
});

// 2. Ambil semua buku (Katalog Buku) - Digunakan oleh Frontend & Pengguna
app.get('/api/books', (req, res) => {
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

// 3. Ambil detail 1 buku berdasarkan ID - Digunakan oleh Borrowing Service
app.get('/api/books/:id', (req, res) => {
    const bookId = parseInt(req.params.id);
    const book = books.find(b => b.id === bookId);
    
    if (!book) {
        return res.status(404).json({ error: `Buku dengan ID ${bookId} tidak ditemukan` });
    }
    
    res.json(book);
});

// 4. Update status ketersediaan buku - Digunakan oleh Borrowing Service
app.patch('/api/books/:id/status', (req, res) => {
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

// 5. Reset data buku ke kondisi awal (Fitur pembantu demo/pengujian)
app.post('/api/books/reset', (req, res) => {
    books = JSON.parse(JSON.stringify(INITIAL_BOOKS));
    res.json({ message: 'Data katalog buku berhasil direset ke kondisi awal', books });
});

app.listen(PORT, () => {
    console.log(`=============================================`);
    console.log(`📚 Book Service aktif di http://localhost:${PORT}`);
    console.log(`=============================================`);
});
