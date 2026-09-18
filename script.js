// =============================================================
//  SISTEM PEMINJAMAN BUKU PERPUSTAKAAN (MICROSERVICES CLIENT)
//  Arsitektur: Microservices Frontend Client
//  Book Service       : http://localhost:5001
//  Borrowing Service  : http://localhost:5002
// =============================================================

const BOOK_SERVICE_URL   = 'http://localhost:5001';
const BORROW_SERVICE_URL = 'http://localhost:5002';

// ─── DATA DEMO MAHASISWA (AUTHENTICATION) ───────────────────
const STUDENTS = [
    { nim: '12345', name: 'Ahmad Fauzi',    password: 'pass123' },
    { nim: '67890', name: 'Siti Rahayu',    password: 'pass456' },
    { nim: '11111', name: 'Budi Santoso',   password: 'pass789' }
];

// ─── SESSION STORAGE HELPERS ────────────────────────────────
function getSession() {
    const stored = localStorage.getItem('lib_session');
    return stored ? JSON.parse(stored) : null;
}

function saveSession(user) {
    localStorage.setItem('lib_session', JSON.stringify(user));
}

function clearSession() {
    localStorage.removeItem('lib_session');
}

// ─── AUTENTIKASI ─────────────────────────────────────────────
function login() {
    const nim      = document.getElementById('nim').value.trim();
    const password = document.getElementById('password').value;
    const errDiv   = document.getElementById('loginError');

    errDiv.style.display = 'none';

    if (!nim || !password) {
        showError(errDiv, '⚠️ NIM dan Password tidak boleh kosong.');
        return;
    }

    const student = STUDENTS.find(s => s.nim === nim && s.password === password);

    if (!student) {
        showError(errDiv, '❌ NIM atau Password salah. Silakan coba lagi.');
        return;
    }

    const user = { nim: student.nim, name: student.name };
    saveSession(user);
    showMainPage(user);
}

function logout() {
    clearSession();
    showLoginPage();
}

function showError(element, message) {
    element.textContent = message;
    element.style.display = 'block';
}

// ─── NAVIGASI ────────────────────────────────────────────────
function showLoginPage() {
    document.getElementById('loginSection').style.display = 'flex';
    document.getElementById('mainSection').style.display  = 'none';
    document.getElementById('nim').value      = '';
    document.getElementById('password').value = '';
    document.getElementById('loginError').style.display = 'none';
}

function showMainPage(user) {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('mainSection').style.display  = 'block';
    document.getElementById('userNameDisplay').textContent =
        `👤 ${user.name} — NIM ${user.nim}`;
    checkServicesHealth();
    renderAll();
}

// ─── HEALTH CHECK INDIKATOR MICROSERVICES ────────────────────
async function checkServicesHealth() {
    // 1. Cek Book Service (5001)
    try {
        const res = await fetch(`${BOOK_SERVICE_URL}/health`);
        const statusEl = document.getElementById('statusBookService');
        if (res.ok && statusEl) {
            statusEl.innerHTML = '<span class="dot-online"></span> Book Service (5001)';
        }
    } catch (e) {
        const statusEl = document.getElementById('statusBookService');
        if (statusEl) {
            statusEl.innerHTML = '<span class="dot-offline"></span> Book Service (Offline)';
        }
    }

    // 2. Cek Borrowing Service (5002)
    try {
        const res = await fetch(`${BORROW_SERVICE_URL}/health`);
        const statusEl = document.getElementById('statusBorrowService');
        if (res.ok && statusEl) {
            statusEl.innerHTML = '<span class="dot-online"></span> Borrowing Service (5002)';
        }
    } catch (e) {
        const statusEl = document.getElementById('statusBorrowService');
        if (statusEl) {
            statusEl.innerHTML = '<span class="dot-offline"></span> Borrowing Service (Offline)';
        }
    }
}

// ─── API CLIENT CALLS ────────────────────────────────────────

// Ambil seluruh daftar buku dari Book Service (Port 5001)
async function fetchBooks() {
    const res = await fetch(`${BOOK_SERVICE_URL}/api/books`);
    if (!res.ok) throw new Error('Gagal memuat katalog buku dari Book Service');
    return await res.json();
}

// Ambil riwayat peminjaman mahasiswa dari Borrowing Service (Port 5002)
async function fetchUserBorrowings(nim) {
    const res = await fetch(`${BORROW_SERVICE_URL}/api/borrowings/${nim}`);
    if (!res.ok) throw new Error('Gagal memuat data peminjaman dari Borrowing Service');
    return await res.json();
}

// ─── RENDER UTAMA ────────────────────────────────────────────
async function renderAll() {
    const session = getSession();
    if (!session) return;

    checkServicesHealth();

    try {
        // Ambil data secara paralel dari kedua microservice
        const [books, borrowings] = await Promise.all([
            fetchBooks(),
            fetchUserBorrowings(session.nim)
        ]);

        const userActiveBorrowings = borrowings.filter(b => b.status === 'active');

        renderActiveBorrowings(userActiveBorrowings, books);
        renderBooks(books, userActiveBorrowings);
    } catch (err) {
        console.error('Error fetching data from microservices:', err);
        document.getElementById('activeBorrowings').innerHTML =
            `<p class="empty-msg" style="color:#e53e3e;">⚠️ Tidak dapat terhubung ke Backend Microservices: ${err.message}. Pastikan kedua service sudah berjalan di port 5001 & 5002.</p>`;
        document.getElementById('bookList').innerHTML =
            `<p class="empty-msg" style="color:#e53e3e;">⚠️ Gagal memuat daftar buku dari Book Service.</p>`;
    }
}

// Render tabel peminjaman aktif milik user yang sedang login
function renderActiveBorrowings(userBorrowings, books) {
    const container = document.getElementById('activeBorrowings');

    if (!userBorrowings || userBorrowings.length === 0) {
        container.innerHTML =
            '<p class="empty-msg">📭 Belum ada peminjaman aktif. Silakan pilih buku di bawah.</p>';
        return;
    }

    const isFull  = userBorrowings.length >= 3;
    const today   = new Date();

    let html = `
      <div class="borrow-counter ${isFull ? 'full' : 'ok'}">
          📚 ${userBorrowings.length} / 3 buku sedang dipinjam
          ${isFull ? ' — <em>Batas maksimal tercapai!</em>' : ''}
      </div>
      <div class="table-wrapper">
      <table class="table">
        <thead>
          <tr>
            <th>#</th>
            <th>Judul Buku</th>
            <th>Tanggal Pinjam</th>
            <th>Jatuh Tempo (7 hari)</th>
            <th>Status</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>`;

    userBorrowings.forEach((b, idx) => {
        const book      = books.find(bk => bk.id === b.bookId);
        const dueDate   = new Date(b.dueDate);
        const isOverdue = dueDate < today;
        const title     = book ? book.title : (b.bookTitle || 'Buku #' + b.bookId);

        html += `
          <tr>
            <td>${idx + 1}</td>
            <td><strong>${title}</strong></td>
            <td>${formatDate(new Date(b.borrowDate))}</td>
            <td class="${isOverdue ? 'overdue-text' : ''}">${formatDate(dueDate)}</td>
            <td>
              <span class="badge ${isOverdue ? 'badge-overdue' : 'badge-active'}">
                ${isOverdue ? '⚠️ Terlambat' : '✅ Aktif'}
              </span>
            </td>
            <td>
              <button class="btn btn-warning btn-sm" onclick="returnBook('${b.id}', ${b.bookId})">
                ↩️ Kembalikan
              </button>
            </td>
          </tr>`;
    });

    html += '</tbody></table></div>';
    container.innerHTML = html;
}

// Render grid daftar buku
function renderBooks(books, userActiveBorrowings) {
    const container = document.getElementById('bookList');
    if (!books || books.length === 0) {
        container.innerHTML = '<p class="empty-msg">Tidak ada buku tersedia dalam katalog.</p>';
        return;
    }

    const userBookIds = userActiveBorrowings.map(b => b.bookId);
    const maxReached  = userActiveBorrowings.length >= 3;

    let html = '<div class="book-grid">';

    books.forEach(book => {
        const alreadyBorrowedByMe = userBookIds.includes(book.id);

        let btnText  = '📥 Pinjam';
        let btnClass = 'btn-success';
        let btnAttr  = `onclick="borrowBook(${book.id})"`;

        if (!book.available) {
            btnText  = '🚫 Sedang Dipinjam';
            btnClass = 'btn-disabled';
            btnAttr  = 'disabled';
        } else if (alreadyBorrowedByMe) {
            btnText  = '📌 Sedang Anda Pinjam';
            btnClass = 'btn-disabled';
            btnAttr  = 'disabled';
        } else if (maxReached) {
            btnText  = '🔒 Batas Tercapai';
            btnClass = 'btn-disabled';
            btnAttr  = 'disabled';
        }

        html += `
          <div class="book-card">
            <div class="book-card-icon">📕</div>
            <div>
              <div class="book-title">${book.title}</div>
              <div class="book-author">✍️ ${book.author}</div>
              <span class="book-status ${book.available ? 'status-available' : 'status-unavailable'}">
                ${book.available ? '✅ Tersedia' : '❌ Sedang Dipinjam'}
              </span>
            </div>
            <button class="btn ${btnClass}" ${btnAttr}>${btnText}</button>
          </div>`;
    });

    html += '</div>';
    container.innerHTML = html;
}

// ─── LOGIKA PEMINJAMAN (INTER-SERVICE CALL VIA BORROWING SERVICE) ────
async function borrowBook(bookId) {
    const session = getSession();
    if (!session) {
        alert('Sesi habis. Silakan login kembali.');
        showLoginPage();
        return;
    }

    try {
        // Request ke Borrowing Service (Port 5002)
        // Borrowing Service akan otomatis memanggil Book Service (Port 5001)
        const response = await fetch(`${BORROW_SERVICE_URL}/api/borrowings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nim: session.nim,
                bookId: bookId
            })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(`❌ Peminjaman Ditolak:\n${data.error}`);
            renderAll();
            return;
        }

        alert(`✅ Peminjaman Berhasil!\n\n${data.message}\nBatas pengembalian: ${formatDate(new Date(data.borrowing.dueDate))}`);
        renderAll();

    } catch (err) {
        console.error('Borrow error:', err);
        alert('⚠️ Gagal terhubung ke Borrowing Service (Port 5002). Pastikan backend aktif!');
    }
}

// ─── LOGIKA PENGEMBALIAN BUKU (INTER-SERVICE CALL) ───────────
async function returnBook(borrowingId, bookId) {
    if (!confirm('Apakah Anda yakin ingin mengembalikan buku ini?')) {
        return;
    }

    try {
        const response = await fetch(`${BORROW_SERVICE_URL}/api/borrowings/return`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                borrowingId: borrowingId,
                bookId: bookId
            })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(`❌ Gagal Mengembalikan:\n${data.error}`);
            renderAll();
            return;
        }

        alert(`✅ ${data.message}`);
        renderAll();

    } catch (err) {
        console.error('Return error:', err);
        alert('⚠️ Gagal terhubung ke Borrowing Service (Port 5002). Pastikan backend aktif!');
    }
}

// ─── HELPER ──────────────────────────────────────────────────
function formatDate(date) {
    return date.toLocaleDateString('id-ID', {
        day:   '2-digit',
        month: 'long',
        year:  'numeric'
    });
}

// ─── INIT ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
    const session = getSession();
    if (session) {
        showMainPage(session);
    } else {
        showLoginPage();
    }

    // Enter key support untuk login form
    ['nim', 'password'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('keydown', e => {
                if (e.key === 'Enter') login();
            });
        }
    });
});
