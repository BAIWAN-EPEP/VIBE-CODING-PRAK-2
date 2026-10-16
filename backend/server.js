require('dotenv').config({
    path: require('path').resolve(__dirname, '../.env')
});

console.log(
    'JWT_SECRET terbaca:',
    Boolean(process.env.JWT_SECRET)
);

const jwt = require('jsonwebtoken');
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// 1. MIDDLEWARE DAN KONFIGURASI SERVER
// ============================================================
app.use(cors());
app.use(express.json());

const staticRoot = path.join(__dirname, '..');
app.use(express.static(staticRoot));

app.use((req, res, next) => {
    console.log(`[Library API] ${req.method} ${req.url}`);
    next();
});

// ============================================================
// 2. HELPER
// ============================================================
function formatBook(book) {
    return {
        ...book,
        available: Boolean(book.available)
    };
}

function formatBorrowing(row) {
    return {
        id: row.id,
        nim: row.nim,
        bookId: row.book_id,
        bookTitle: row.book_title,
        borrowDate: row.borrow_date,
        dueDate: row.due_date,
        status: row.status,
        returnDate: row.return_date
    };
}

function isValidId(id) {
    return Number.isInteger(id) && id > 0;
}

// ============================================================
// 3. HEALTH CHECK
// ============================================================
app.get('/health', (req, res) => {
    res.json({
        service: 'library-management-api',
        status: 'healthy',
        port: PORT
    });
});

// ============================================================
// 4. BOOK API
// ============================================================

// GET semua buku dan pencarian berdasarkan judul atau penulis
app.get('/api/books', async (req, res) => {
    try {
        const search = String(req.query.search || '').trim();

        let sql = `
            SELECT id, title, author, available,
                   borrowed_by AS borrowedBy
            FROM books
        `;

        const params = [];

        if (search) {
            sql += ` WHERE title LIKE ? OR author LIKE ?`;
            params.push(`%${search}%`, `%${search}%`);
        }

        sql += ' ORDER BY id ASC';

        const [rows] = await db.execute(sql, params);

        res.json(rows.map(formatBook));
    } catch (error) {
        console.error('Gagal mengambil daftar buku:', error);

        res.status(500).json({
            error: 'Gagal mengambil daftar buku dari database.'
        });
    }
});

// GET detail buku berdasarkan ID
app.get('/api/books/:id', async (req, res) => {
    const bookId = Number(req.params.id);

    if (!isValidId(bookId)) {
        return res.status(400).json({
            error: 'ID buku harus berupa bilangan bulat positif.'
        });
    }

    try {
        const [rows] = await db.execute(
            `SELECT id, title, author, available,
                    borrowed_by AS borrowedBy
             FROM books
             WHERE id = ?`,
            [bookId]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                error: 'Buku tidak ditemukan.'
            });
        }

        res.json(formatBook(rows[0]));
    } catch (error) {
        console.error('Gagal mengambil detail buku:', error);

        res.status(500).json({
            error: 'Gagal mengambil detail buku.'
        });
    }
});

// PATCH status buku
app.patch('/api/books/:id/status', async (req, res) => {
    const bookId = Number(req.params.id);
    const { available, borrowedBy } = req.body;

    if (!isValidId(bookId)) {
        return res.status(400).json({
            error: 'ID buku tidak valid.'
        });
    }

    if (typeof available !== 'boolean') {
        return res.status(400).json({
            error: 'Field available harus berupa true atau false.'
        });
    }

    if (
        !available &&
        (typeof borrowedBy !== 'string' || !borrowedBy.trim())
    ) {
        return res.status(400).json({
            error: 'NIM peminjam wajib diisi ketika buku dipinjam.'
        });
    }

    try {
        const [result] = await db.execute(
            `UPDATE books
             SET available = ?, borrowed_by = ?
             WHERE id = ?`,
            [
                available ? 1 : 0,
                available ? null : borrowedBy.trim(),
                bookId
            ]
        );

        if (result.affectedRows === 0) {
            const [rows] = await db.execute(
                'SELECT id FROM books WHERE id = ?',
                [bookId]
            );

            if (rows.length === 0) {
                return res.status(404).json({
                    error: 'Buku tidak ditemukan.'
                });
            }
        }

        const [rows] = await db.execute(
            `SELECT id, title, author, available,
                    borrowed_by AS borrowedBy
             FROM books
             WHERE id = ?`,
            [bookId]
        );

        res.json({
            message: 'Status buku berhasil diperbarui.',
            book: formatBook(rows[0])
        });
    } catch (error) {
        console.error('Gagal memperbarui status buku:', error);

        res.status(500).json({
            error: 'Gagal memperbarui status buku.'
        });
    }
});

// POST reset status semua buku
app.post('/api/books/reset', async (req, res) => {
    let connection;

    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        // Hanya reset jika tidak ada peminjaman aktif.
        const [activeLoans] = await connection.execute(
            `SELECT COUNT(*) AS total
             FROM borrowings
             WHERE status = 'active'`
        );

        if (Number(activeLoans[0].total) > 0) {
            await connection.rollback();

            return res.status(409).json({
                error: 'Reset ditolak karena masih ada peminjaman aktif. Kembalikan buku terlebih dahulu.'
            });
        }

        await connection.execute(
            'UPDATE books SET available = 1, borrowed_by = NULL'
        );

        await connection.commit();

        const [rows] = await db.execute(
            `SELECT id, title, author, available,
                    borrowed_by AS borrowedBy
             FROM books
             ORDER BY id ASC`
        );

        res.json({
            message: 'Status seluruh buku berhasil direset.',
            books: rows.map(formatBook)
        });
    } catch (error) {
        if (connection) {
            await connection.rollback().catch(() => {});
        }

        console.error('Gagal mereset status buku:', error);

        res.status(500).json({
            error: 'Gagal mereset status buku.'
        });
    } finally {
        if (connection) connection.release();
    }
});

// ============================================================
// 5. BORROWING API
// Data peminjaman disimpan di tabel MySQL: borrowings
// ============================================================

// GET seluruh riwayat peminjaman
app.get('/api/borrowings', async (req, res) => {
    try {
        const [rows] = await db.execute(
            `SELECT br.id, br.nim, br.book_id, b.title AS book_title,
                    br.borrow_date, br.due_date,
                    br.status, br.return_date
             FROM borrowings br
             JOIN books b ON b.id = br.book_id
             ORDER BY br.borrow_date DESC`
        );

        res.json(rows.map(formatBorrowing));
    } catch (error) {
        console.error('Gagal mengambil riwayat peminjaman:', error);

        res.status(500).json({
            error: 'Gagal mengambil riwayat peminjaman.'
        });
    }
});

// GET riwayat peminjaman berdasarkan NIM
app.get('/api/borrowings/:nim', async (req, res) => {
    const nim = String(req.params.nim || '').trim();

    if (!nim) {
        return res.status(400).json({
            error: 'NIM wajib diisi.'
        });
    }

    try {
        const [rows] = await db.execute(
            `SELECT br.id, br.nim, br.book_id, b.title AS book_title,
                    br.borrow_date, br.due_date,
                    br.status, br.return_date
             FROM borrowings br
             JOIN books b ON b.id = br.book_id
             WHERE br.nim = ?
             ORDER BY br.borrow_date DESC`,
            [nim]
        );

        res.json(rows.map(formatBorrowing));
    } catch (error) {
        console.error('Gagal mengambil riwayat mahasiswa:', error);

        res.status(500).json({
            error: 'Gagal mengambil riwayat peminjaman mahasiswa.'
        });
    }
});

// POST peminjaman buku
app.post('/api/borrowings', async (req, res) => {
    const nim = String(req.body.nim || '').trim();
    const bookId = Number(req.body.bookId);

    if (!nim || !isValidId(bookId)) {
        return res.status(400).json({
            error: 'NIM dan ID buku yang valid wajib diisi.'
        });
    }

    let connection;

    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        // Kunci baris buku agar dua permintaan tidak meminjam
        // buku yang sama secara bersamaan.
        const [books] = await connection.execute(
            `SELECT id, title, author, available,
                    borrowed_by AS borrowedBy
             FROM books
             WHERE id = ?
             FOR UPDATE`,
            [bookId]
        );

        if (books.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                error: 'Buku tidak ditemukan.'
            });
        }

        const book = books[0];

        if (!Boolean(book.available)) {
            await connection.rollback();

            return res.status(400).json({
                error: `Buku "${book.title}" sedang dipinjam.`
            });
        }

        // Hitung jumlah pinjaman aktif mahasiswa.
        const [activeLoans] = await connection.execute(
            `SELECT COUNT(*) AS total
             FROM borrowings
             WHERE nim = ? AND status = 'active'`,
            [nim]
        );

        if (Number(activeLoans[0].total) >= 3) {
            await connection.rollback();

            return res.status(400).json({
                error: 'Maksimal peminjaman adalah 3 buku aktif per mahasiswa.'
            });
        }

        // Cegah peminjaman ulang buku yang sama selama masih aktif.
        const [sameLoans] = await connection.execute(
            `SELECT id
             FROM borrowings
             WHERE nim = ? AND book_id = ? AND status = 'active'
             LIMIT 1`,
            [nim, bookId]
        );

        if (sameLoans.length > 0) {
            await connection.rollback();

            return res.status(400).json({
                error: 'Buku ini masih tercatat dipinjam oleh mahasiswa tersebut.'
            });
        }

        const borrowingId =
            `BRW-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

        // Simpan transaksi dan perbarui status buku.
        await connection.execute(
            `INSERT INTO borrowings
                (id, nim, book_id, borrow_date, due_date, status, return_date)
             VALUES
                (?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY), 'active', NULL)`,
            [borrowingId, nim, bookId]
        );

        await connection.execute(
            `UPDATE books
             SET available = 0, borrowed_by = ?
             WHERE id = ?`,
            [nim, bookId]
        );

        await connection.commit();

        const [loanRows] = await db.execute(
            `SELECT br.id, br.nim, br.book_id, b.title AS book_title,
                    br.borrow_date, br.due_date,
                    br.status, br.return_date
             FROM borrowings br
             JOIN books b ON b.id = br.book_id
             WHERE br.id = ?`,
            [borrowingId]
        );

        const borrowing = formatBorrowing(loanRows[0]);

        res.status(201).json({
            message: `Berhasil meminjam buku "${book.title}".`,
            borrowing
        });
    } catch (error) {
        if (connection) {
            await connection.rollback().catch(() => {});
        }

        console.error('Gagal memproses peminjaman:', error);

        res.status(500).json({
            error: 'Gagal memproses peminjaman buku.'
        });
    } finally {
        if (connection) connection.release();
    }
});

// POST pengembalian buku
app.post('/api/borrowings/return', async (req, res) => {
    const borrowingId = String(req.body.borrowingId || '').trim();

    if (!borrowingId) {
        return res.status(400).json({
            error: 'ID peminjaman wajib diisi.'
        });
    }

    let connection;

    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        const [loans] = await connection.execute(
            `SELECT br.id, br.nim, br.book_id, br.status,
                    b.title AS book_title
             FROM borrowings br
             JOIN books b ON b.id = br.book_id
             WHERE br.id = ?
             FOR UPDATE`,
            [borrowingId]
        );

        if (loans.length === 0 || loans[0].status !== 'active') {
            await connection.rollback();

            return res.status(404).json({
                error: 'Peminjaman aktif tidak ditemukan atau buku sudah dikembalikan.'
            });
        }

        const loan = loans[0];

        await connection.execute(
            `UPDATE borrowings
             SET status = 'returned', return_date = NOW()
             WHERE id = ? AND status = 'active'`,
            [borrowingId]
        );

        await connection.execute(
            `UPDATE books
             SET available = 1, borrowed_by = NULL
             WHERE id = ?`,
            [loan.book_id]
        );

        await connection.commit();

        const [updatedRows] = await db.execute(
            `SELECT br.id, br.nim, br.book_id, b.title AS book_title,
                    br.borrow_date, br.due_date,
                    br.status, br.return_date
             FROM borrowings br
             JOIN books b ON b.id = br.book_id
             WHERE br.id = ?`,
            [borrowingId]
        );

        res.json({
            message: `Buku "${loan.book_title}" berhasil dikembalikan.`,
            borrowing: formatBorrowing(updatedRows[0])
        });
    } catch (error) {
        if (connection) {
            await connection.rollback().catch(() => {});
        }

        console.error('Gagal memproses pengembalian:', error);

        res.status(500).json({
            error: 'Gagal memproses pengembalian buku.'
        });
    } finally {
        if (connection) connection.release();
    }
});

// POST reset riwayat peminjaman
// Hanya menghapus riwayat yang sudah selesai dikembalikan.
app.post('/api/borrowings/reset', async (req, res) => {
    try {
        const [result] = await db.execute(
            `DELETE FROM borrowings WHERE status = 'returned'`
        );

        res.json({
            message: 'Riwayat peminjaman yang sudah selesai berhasil dihapus.',
            deletedRows: result.affectedRows
        });
    } catch (error) {
        console.error('Gagal mereset riwayat peminjaman:', error);

        res.status(500).json({
            error: 'Gagal mereset riwayat peminjaman.'
        });
    }
});

const STUDENTS = [
    { nim: '12345', name: 'Ahmad Fauzi', password: 'pass123' },
    { nim: '67890', name: 'Siti Rahayu', password: 'pass456' },
    { nim: '11111', name: 'Budi Santoso', password: 'pass789' }
];

app.post('/api/login', (req, res) => {
    const { nim, password } = req.body;

    if (!nim || !password) {
        return res.status(400).json({
            message: 'NIM dan password wajib diisi.'
        });
    }

    const student = STUDENTS.find(
        s => s.nim === nim && s.password === password
    );

    if (!student) {
        return res.status(401).json({
            message: 'NIM atau password salah.'
        });
    }

    const token = jwt.sign(
        {
            nim: student.nim,
            name: student.name
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );

    return res.json({
        message: 'Login berhasil.',
        token,
        user: {
            nim: student.nim,
            name: student.name
        }
    });
});

// ============================================================
// 6. MENJALANKAN SATU SERVER PADA SATU PORT
// ============================================================
async function startServer() {
    try {
        await db.query('SELECT 1');

        console.log('Koneksi MySQL berhasil.');

        app.listen(PORT, () => {
            console.log(`Server berjalan di http://localhost:${PORT}`);
            console.log(`Frontend: http://localhost:${PORT}`);
            console.log(`Book API: http://localhost:${PORT}/api/books`);
            console.log(`Borrowing API: http://localhost:${PORT}/api/borrowings`);
        });
    } catch (error) {
        console.error('Server gagal dijalankan:', error.message);
        process.exit(1);
    }
}

startServer();