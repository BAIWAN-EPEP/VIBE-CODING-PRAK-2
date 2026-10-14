const db = require('./db');

const books = [
    [1, 'Pemrograman Web Dasar', 'Budi Raharjo'],
    [2, 'Basis Data', 'Fathansyah'],
    [3, 'Algoritma dan Pemrograman', 'Rinaldi Munir'],
    [4, 'Rekayasa Perangkat Lunak', 'Roger Pressman'],
    [5, 'Jaringan Komputer', 'Andrew Tanenbaum'],
    [6, 'Sistem Operasi', 'William Stallings'],
    [7, 'Kecerdasan Buatan', 'Stuart Russell'],
    [8, 'Struktur Data', 'D.S. Malik']
];

async function seedBooks() {
    try {
        for (const book of books) {
            await db.execute(
                `INSERT INTO books (id, title, author, available, borrowed_by)
                 VALUES (?, ?, ?, TRUE, NULL)
                 ON DUPLICATE KEY UPDATE
                    title = VALUES(title),
                    author = VALUES(author)`,
                book
            );
        }

        console.log('Berhasil memasukkan 8 data buku ke MySQL.');

        const [rows] = await db.query(
            'SELECT * FROM books ORDER BY id'
        );

        console.table(rows);
    } catch (error) {
        console.error('Gagal memasukkan data buku:', error.message);
    } finally {
        await db.end();
    }
}

seedBooks();